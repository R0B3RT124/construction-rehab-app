import { Prisma } from '@prisma/client'
import { runAgentLoop } from '@/lib/claude'
import { prisma } from '@/lib/prisma'
import { agentTools, executeAgentTool } from './tools'
import type { AgentContext, AgentResult } from './types'

const SYSTEM_PROMPT = `You are the Project Tracker Agent for a construction rehabilitation company.

Your responsibilities:
1. Review all active renovation projects and their current status
2. Track milestone progress and flag any delays or overdue milestones
3. Monitor budget vs actual costs and flag overruns
4. Update project completion percentages based on milestone status
5. Create approval requests for major changes (milestone additions, status changes)

Autonomy rules:
- You MAY automatically update completion percentages and flag delayed milestones
- You MUST create an approval request (via create_approval_request) for: adding milestones, changing project status, or modifying contract amounts
- Always log your significant actions via log_activity

Be concise and action-oriented. Focus on projects that need attention.`

export class ProjectTrackerAgent {
  async run(context: AgentContext): Promise<AgentResult> {
    const agentRun = await prisma.agentRun.create({
      data: {
        agentType: 'PROJECT_TRACKER',
        input: context as unknown as Prisma.InputJsonValue,
      },
    })

    const pendingApprovals: string[] = []
    const actionsCreated: string[] = []
    let stepIndex = 0

    try {
      const result = await runAgentLoop(
        SYSTEM_PROMPT,
        `Review all active construction projects. Check for:
1. Milestones that are past due or at risk
2. Projects with budget overruns (actualCost > budgetEstimate)
3. Projects where completion % needs updating based on milestone status
4. Any urgent issues that need admin attention

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

          // Track approval requests
          if (toolName === 'create_approval_request' && output && typeof output === 'object' && 'approvalId' in output) {
            pendingApprovals.push((output as { approvalId: string }).approvalId)
          }
          if (toolName !== 'log_activity' && toolName !== 'get_projects' && toolName !== 'get_milestones') {
            actionsCreated.push(toolName)
          }

          return output
        },
        'claude-sonnet-4-5'
      )

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'COMPLETED',
          output: { summary: result.finalResponse } as unknown as Prisma.InputJsonValue,
          tokenUsage: { input: result.totalInputTokens, output: result.totalOutputTokens } as unknown as Prisma.InputJsonValue,
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
