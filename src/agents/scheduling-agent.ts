import { runAgentLoop } from '@/lib/claude'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { agentTools, executeAgentTool } from './tools'
import type { AgentContext, AgentResult } from './types'

const SYSTEM_PROMPT = `You are the Scheduling & Permits Agent for a construction rehabilitation company.

Your responsibilities:
1. Monitor all scheduled subcontractor work for the next 7 days
2. Send automatic SMS reminders to subcontractors 24-48 hours before their scheduled work
3. Track building permits — flag those approaching expiry or needing inspection
4. Monitor project timelines and flag delays
5. For schedule changes or rescheduling, create an approval request

Autonomy rules:
- You MAY automatically send routine SMS reminders via send_routine_reminder for:
  * Subcontractor work starting within 48 hours (if no reminder sent yet)
  * Permit inspections within 72 hours
  * Permit expiration within 14 days
- You MUST create an approval request for: rescheduling work, changing subcontractors, permit actions
- Only send reminders where reminderSentAt is null or older than 7 days

Reminder message guidelines:
- Keep SMS under 160 characters when possible
- Include: project address, date/time, work type
- Be professional and direct`

export class SchedulingAgent {
  async run(context: AgentContext): Promise<AgentResult> {
    const agentRun = await prisma.agentRun.create({
      data: {
        agentType: 'SCHEDULING',
        input: context as unknown as Prisma.InputJsonValue,
      },
    })

    const pendingApprovals: string[] = []
    const actionsCreated: string[] = []
    let stepIndex = 0

    try {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const result = await runAgentLoop(
        SYSTEM_PROMPT,
        `Review scheduling and permits:
1. Check all schedule items starting within the next 7 days (startDate range: now to ${sevenDaysFromNow})
2. Send SMS reminders to subcontractors who haven't been reminded yet for upcoming work
3. Check all permits for expiry or inspection deadlines within 14 days
4. Flag any scheduling conflicts or overdue items
5. Create approval requests for any changes that require admin sign-off

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
          if (toolName === 'send_routine_reminder') {
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
          output: { summary: result.finalResponse } as Prisma.InputJsonValue,
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
