import { Prisma } from '@prisma/client'
import { runAgentLoop } from '@/lib/claude'
import { prisma } from '@/lib/prisma'
import { agentTools, executeAgentTool } from './tools'
import type { AgentContext, AgentResult } from './types'

const SYSTEM_PROMPT = `You are the Liaison Agent for a construction rehabilitation company.

Your responsibilities:
1. Act as the communication bridge between customers and subcontractors
2. Draft professional email and SMS messages for admin approval before sending
3. Track open issues or questions between parties
4. Log incoming communications and route them appropriately
5. Draft project status updates for customers at key milestones

Autonomy rules:
- ALL outbound communications to customers or subcontractors MUST go through admin approval
- Draft every message via draft_communication, then create an approval request (SEND_COMMUNICATION)
- You may log internal notes without approval
- Keep communications professional, clear, and project-specific
- Include the project name and relevant details in every message

Communication guidelines:
- For customers: be warm, clear, and non-technical
- For subcontractors: be direct, include dates, times, and location
- Always reference the specific project address in messages`

export class LiaisonAgent {
  async run(context: AgentContext): Promise<AgentResult> {
    const agentRun = await prisma.agentRun.create({
      data: {
        agentType: 'LIAISON',
        input: context as unknown as Prisma.InputJsonValue,
      },
    })

    const pendingApprovals: string[] = []
    const actionsCreated: string[] = []
    let stepIndex = 0

    try {
      const result = await runAgentLoop(
        SYSTEM_PROMPT,
        `Review current project communications needs:
1. Check for projects with recent milestone completions that warrant customer updates
2. Check for upcoming scheduled work that needs subcontractor confirmation
3. Look for any overdue invoices that need follow-up communication
4. Draft appropriate communications for admin review

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
          if (toolName === 'draft_communication') {
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
