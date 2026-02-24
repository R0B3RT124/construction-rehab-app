import { runAgentLoop } from '@/lib/claude'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { agentTools, executeAgentTool } from './tools'
import { ProjectTrackerAgent } from './project-tracker-agent'
import { LiaisonAgent } from './liaison-agent'
import { SchedulingAgent } from './scheduling-agent'
import type { AgentContext, AgentResult } from './types'

const SYSTEM_PROMPT = `You are the Administrative Lead Agent for a construction rehabilitation company.

You supervise three specialist agents:
- Project Tracker Agent: monitors renovation project status and milestones
- Liaison Agent: handles customer and subcontractor communications
- Scheduling Agent: manages work scheduling and building permits

Your responsibilities:
1. Review overall business health across all projects
2. Flag critical issues requiring immediate admin attention
3. Monitor overdue invoices and create invoice drafts for billing
4. Request approval for high-value actions (invoice sends, outbound calls, contract changes)
5. Summarize what each sub-agent has done and what needs admin attention

Autonomy rules:
- You MAY automatically create invoice drafts
- You MUST request approval (INVOICE_SEND) before pushing any invoice to QuickBooks
- You MUST request approval (OUTBOUND_CALL) before initiating any outbound phone call
- Prioritize URGENT items: overdue invoices > expiring permits > delayed milestones

At the end of your cycle, provide a concise summary of:
- Total pending approvals
- Critical alerts
- Actions taken automatically`

export class LeadAgent {
  async run(
    context: AgentContext,
    subAgentResults?: {
      projectTracker?: AgentResult
      liaison?: AgentResult
      scheduling?: AgentResult
    }
  ): Promise<AgentResult> {
    const agentRun = await prisma.agentRun.create({
      data: {
        agentType: 'LEAD',
        input: context as unknown as Prisma.InputJsonValue,
      },
    })

    const pendingApprovals: string[] = []
    const actionsCreated: string[] = []
    let stepIndex = 0

    // Collect all pending approvals from sub-agents
    if (subAgentResults) {
      for (const r of Object.values(subAgentResults)) {
        if (r?.pendingApprovals) pendingApprovals.push(...r.pendingApprovals)
      }
    }

    try {
      const subAgentSummary = subAgentResults
        ? `Sub-agent results:
- Project Tracker: ${subAgentResults.projectTracker?.summary || 'not run'}
- Liaison: ${subAgentResults.liaison?.summary || 'not run'}
- Scheduling: ${subAgentResults.scheduling?.summary || 'not run'}`
        : 'Sub-agents have not run yet in this cycle.'

      const result = await runAgentLoop(
        SYSTEM_PROMPT,
        `Perform your administrative oversight cycle.

${subAgentSummary}

Tasks:
1. Review all active projects for budget overruns or critical status
2. Check for overdue invoices (status: OVERDUE or SENT past due date)
3. Create invoice drafts for any completed milestones that haven't been invoiced
4. Create approval requests for anything requiring admin sign-off
5. Log a summary of the full cycle

Context: ${JSON.stringify(context)}
Today: ${new Date().toISOString()}`,
        agentTools,
        async (toolName, toolInput) => {
          const output = await executeAgentTool(toolName, toolInput)

          await prisma.agentStep.create({
            data: {
              agentRunId: agentRun.id,
              stepIndex: stepIndex++,
              type: 'TOOL_CALL',
              toolName,
              toolInput: toolInput as unknown as Prisma.InputJsonValue,
              toolOutput: output as unknown as Prisma.InputJsonValue,
            },
          })

          if (toolName === 'create_approval_request' && output && typeof output === 'object' && 'approvalId' in output) {
            pendingApprovals.push((output as { approvalId: string }).approvalId)
          }
          if (toolName === 'create_invoice_draft') {
            actionsCreated.push(toolName)
          }

          return output
        },
        'claude-sonnet-4-5'  // Use sonnet; switch to opus for more complex reasoning
      )

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: pendingApprovals.length > 0 ? 'AWAITING_APPROVAL' : 'COMPLETED',
          output: { summary: result.finalResponse, pendingApprovals } as Prisma.InputJsonValue,
          tokenUsage: { input: result.totalInputTokens, output: result.totalOutputTokens } as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      })

      return {
        success: true,
        summary: result.finalResponse,
        actionsCreated,
        pendingApprovals,
        tokenUsage: { input: result.totalInputTokens, output: result.totalOutputTokens },
      }
    } catch (err) {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'FAILED',
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        },
      })
      throw err
    }
  }
}

/**
 * Convenience factory: runs all sub-agents then the lead agent
 * and returns consolidated results.
 */
export async function runAllAgents(context: AgentContext = {}) {
  const projectTracker = await new ProjectTrackerAgent().run(context)
  const liaison = await new LiaisonAgent().run(context)
  const scheduling = await new SchedulingAgent().run(context)
  const lead = await new LeadAgent().run(context, { projectTracker, liaison, scheduling })

  return {
    projectTracker,
    liaison,
    scheduling,
    lead,
    totalPendingApprovals: lead.pendingApprovals.length,
  }
}
