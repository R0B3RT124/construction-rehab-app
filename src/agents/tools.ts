import Anthropic from '@anthropic-ai/sdk'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendSms } from '@/lib/twilio'
import type { LineItem } from './types'

// ─────────────────────────────────────────────
// TOOL DEFINITIONS (Claude tool schemas)
// ─────────────────────────────────────────────

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'get_projects',
    description:
      'Fetch active projects with their current status, budget, milestones, and completion percentage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['LEAD', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
          description: 'Filter by project status',
        },
        projectId: { type: 'string', description: 'Fetch a single project by ID' },
      },
    },
  },
  {
    name: 'update_project_completion',
    description:
      'Update project completion percentage. Routine progress updates (small increments) are applied directly. Status changes require admin approval.',
    input_schema: {
      type: 'object' as const,
      required: ['projectId', 'completionPct'],
      properties: {
        projectId: { type: 'string' },
        completionPct: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
  },
  {
    name: 'get_milestones',
    description: 'Get all milestones for a project.',
    input_schema: {
      type: 'object' as const,
      required: ['projectId'],
      properties: { projectId: { type: 'string' } },
    },
  },
  {
    name: 'flag_milestone_delay',
    description: 'Flag a milestone as DELAYED and log the reason.',
    input_schema: {
      type: 'object' as const,
      required: ['milestoneId', 'reason'],
      properties: {
        milestoneId: { type: 'string' },
        reason: { type: 'string' },
        suggestedNewDate: { type: 'string', description: 'ISO date string for suggested new due date' },
      },
    },
  },
  {
    name: 'create_approval_request',
    description:
      'Create an admin approval request for a high-stakes action the agent wants to take.',
    input_schema: {
      type: 'object' as const,
      required: ['agentType', 'actionType', 'title', 'description', 'proposedData'],
      properties: {
        agentType: { type: 'string', enum: ['LEAD', 'PROJECT_TRACKER', 'LIAISON', 'SCHEDULING'] },
        actionType: {
          type: 'string',
          enum: [
            'SEND_COMMUNICATION',
            'MAJOR_MILESTONE_CHANGE',
            'SCHEDULE_CHANGE',
            'INVOICE_SEND',
            'OUTBOUND_CALL',
            'BUDGET_CHANGE',
            'PERMIT_ACTION',
          ],
        },
        title: { type: 'string' },
        description: { type: 'string' },
        proposedData: { type: 'object', description: 'JSON payload describing the action' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
        projectId: { type: 'string' },
        milestoneId: { type: 'string' },
        scheduleItemId: { type: 'string' },
        communicationId: { type: 'string' },
        invoiceId: { type: 'string' },
      },
    },
  },
  {
    name: 'draft_communication',
    description:
      'Draft an email or SMS message to a customer or subcontractor. All outbound comms require admin approval before sending.',
    input_schema: {
      type: 'object' as const,
      required: ['channel', 'direction', 'body', 'draftedBy'],
      properties: {
        contactId: { type: 'string' },
        channel: { type: 'string', enum: ['EMAIL', 'SMS', 'INTERNAL_NOTE'] },
        direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] },
        subject: { type: 'string' },
        body: { type: 'string' },
        draftedBy: { type: 'string', description: 'Agent name that drafted this' },
        projectId: { type: 'string' },
      },
    },
  },
  {
    name: 'send_routine_reminder',
    description:
      'Send a routine SMS reminder to a subcontractor or customer. These are auto-sent without approval for scheduled confirmations only.',
    input_schema: {
      type: 'object' as const,
      required: ['toPhone', 'message'],
      properties: {
        toPhone: { type: 'string', description: 'E.164 phone number e.g. +15551234567' },
        message: { type: 'string' },
        scheduleItemId: { type: 'string' },
        permitId: { type: 'string' },
        projectId: { type: 'string' },
      },
    },
  },
  {
    name: 'get_schedule_items',
    description: 'Get scheduled work items, optionally filtered by project or date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
        startDate: { type: 'string', description: 'ISO date string' },
        endDate: { type: 'string', description: 'ISO date string' },
      },
    },
  },
  {
    name: 'get_permits',
    description: 'Get permit records for a project or all permits nearing deadlines.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
        nearingExpiry: { type: 'boolean', description: 'If true, return permits expiring within 14 days' },
      },
    },
  },
  {
    name: 'get_invoices',
    description: 'Get invoices, optionally filtered by project or status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'VOID'],
        },
      },
    },
  },
  {
    name: 'create_invoice_draft',
    description:
      'Create a draft invoice in the system (NOT pushed to QuickBooks yet). Admin must approve before QB submission.',
    input_schema: {
      type: 'object' as const,
      required: ['projectId', 'billingModel', 'lineItems', 'subtotal', 'total'],
      properties: {
        projectId: { type: 'string' },
        billingModel: { type: 'string', enum: ['FIXED_PRICE', 'TIME_AND_MATERIALS', 'MILESTONE'] },
        lineItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              qty: { type: 'number' },
              rate: { type: 'number' },
              amount: { type: 'number' },
            },
          },
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total: { type: 'number' },
        dueDate: { type: 'string', description: 'ISO date string' },
        notes: { type: 'string' },
      },
    },
  },
  {
    name: 'log_activity',
    description: 'Log an agent action to the activity feed.',
    input_schema: {
      type: 'object' as const,
      required: ['agentType', 'action'],
      properties: {
        agentType: { type: 'string', enum: ['LEAD', 'PROJECT_TRACKER', 'LIAISON', 'SCHEDULING'] },
        action: { type: 'string' },
        projectId: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        metadata: { type: 'object' },
      },
    },
  },
]

// ─────────────────────────────────────────────
// TOOL HANDLERS (Prisma implementations)
// ─────────────────────────────────────────────

type AgentToolInput = Record<string, unknown>

export async function executeAgentTool(name: string, input: unknown): Promise<unknown> {
  const args = input as AgentToolInput

  switch (name) {
    case 'get_projects': {
      const where: Record<string, unknown> = {}
      if (args.status) where.status = args.status
      if (args.projectId) where.id = args.projectId

      return prisma.project.findMany({
        where,
        include: {
          customer: true,
          milestones: { orderBy: { order: 'asc' } },
          permits: true,
          scheduleItems: { include: { subcontractor: true } },
          invoices: { where: { status: { not: 'VOID' } } },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }

    case 'update_project_completion': {
      const updated = await prisma.project.update({
        where: { id: args.projectId as string },
        data: { completionPct: args.completionPct as number },
      })
      return { success: true, projectId: updated.id, completionPct: updated.completionPct }
    }

    case 'get_milestones': {
      return prisma.milestone.findMany({
        where: { projectId: args.projectId as string },
        orderBy: { order: 'asc' },
      })
    }

    case 'flag_milestone_delay': {
      const data: Record<string, unknown> = { status: 'DELAYED' }
      if (args.suggestedNewDate) data.dueDate = new Date(args.suggestedNewDate as string)

      const updated = await prisma.milestone.update({
        where: { id: args.milestoneId as string },
        data,
      })

      await prisma.activityLog.create({
        data: {
          agentType: 'PROJECT_TRACKER',
          actorType: 'agent',
          action: `Milestone "${updated.name}" flagged as DELAYED: ${args.reason}`,
          entityType: 'Milestone',
          entityId: updated.id,
          projectId: updated.projectId,
          metadata: { reason: args.reason, suggestedNewDate: args.suggestedNewDate } as Prisma.InputJsonValue,
        },
      })
      return { success: true, milestoneId: updated.id, status: 'DELAYED' }
    }

    case 'create_approval_request': {
      const approval = await prisma.approvalRequest.create({
        data: {
          agentType: args.agentType as 'LEAD' | 'PROJECT_TRACKER' | 'LIAISON' | 'SCHEDULING',
          actionType: args.actionType as
            | 'SEND_COMMUNICATION'
            | 'MAJOR_MILESTONE_CHANGE'
            | 'SCHEDULE_CHANGE'
            | 'INVOICE_SEND'
            | 'OUTBOUND_CALL'
            | 'BUDGET_CHANGE'
            | 'PERMIT_ACTION',
          title: args.title as string,
          description: args.description as string,
          proposedData: args.proposedData as unknown as Prisma.InputJsonValue,
          priority: (args.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') || 'NORMAL',
          projectId: args.projectId as string | undefined,
          milestoneId: args.milestoneId as string | undefined,
          scheduleItemId: args.scheduleItemId as string | undefined,
          communicationId: args.communicationId as string | undefined,
          invoiceId: args.invoiceId as string | undefined,
        },
      })

      await prisma.activityLog.create({
        data: {
          agentType: args.agentType as 'LEAD' | 'PROJECT_TRACKER' | 'LIAISON' | 'SCHEDULING',
          actorType: 'agent',
          action: `Approval requested: ${args.title}`,
          entityType: 'ApprovalRequest',
          entityId: approval.id,
          projectId: args.projectId as string | undefined,
        },
      })

      return { success: true, approvalId: approval.id }
    }

    case 'draft_communication': {
      const comm = await prisma.communication.create({
        data: {
          contactId: args.contactId as string | undefined,
          channel: args.channel as 'EMAIL' | 'SMS' | 'INTERNAL_NOTE',
          direction: args.direction as 'INBOUND' | 'OUTBOUND',
          subject: args.subject as string | undefined,
          body: args.body as string,
          status: 'DRAFT',
          draftedBy: args.draftedBy as string,
          projectId: args.projectId as string | undefined,
        },
      })

      await prisma.activityLog.create({
        data: {
          agentType: 'LIAISON',
          actorType: 'agent',
          action: `Communication draft created (${args.channel}): ${args.subject || 'No subject'}`,
          entityType: 'Communication',
          entityId: comm.id,
          projectId: args.projectId as string | undefined,
        },
      })

      return { success: true, communicationId: comm.id }
    }

    case 'send_routine_reminder': {
      const sid = await sendSms(args.toPhone as string, args.message as string)

      // Mark schedule item reminder sent
      if (args.scheduleItemId) {
        await prisma.scheduleItem.update({
          where: { id: args.scheduleItemId as string },
          data: { reminderSentAt: new Date() },
        })
      }
      if (args.permitId) {
        await prisma.permit.update({
          where: { id: args.permitId as string },
          data: { reminderSentAt: new Date() },
        })
      }

      await prisma.activityLog.create({
        data: {
          agentType: 'SCHEDULING',
          actorType: 'agent',
          action: `Routine SMS reminder sent to ${args.toPhone}`,
          entityType: args.scheduleItemId ? 'ScheduleItem' : 'Permit',
          entityId: (args.scheduleItemId || args.permitId) as string | undefined,
          projectId: args.projectId as string | undefined,
          metadata: { twilioSid: sid },
        },
      })

      return { success: true, twilioSid: sid }
    }

    case 'get_schedule_items': {
      const where: Record<string, unknown> = {}
      if (args.projectId) where.projectId = args.projectId
      if (args.startDate || args.endDate) {
        where.startDate = {}
        if (args.startDate) (where.startDate as Record<string, unknown>).gte = new Date(args.startDate as string)
        if (args.endDate) (where.startDate as Record<string, unknown>).lte = new Date(args.endDate as string)
      }

      return prisma.scheduleItem.findMany({
        where,
        include: { subcontractor: true, project: { select: { name: true, address: true } } },
        orderBy: { startDate: 'asc' },
      })
    }

    case 'get_permits': {
      const where: Record<string, unknown> = {}
      if (args.projectId) where.projectId = args.projectId
      if (args.nearingExpiry) {
        where.expiresDate = { lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
        where.status = { not: 'CLOSED' }
      }

      return prisma.permit.findMany({
        where,
        include: { project: { select: { name: true, address: true } } },
        orderBy: { expiresDate: 'asc' },
      })
    }

    case 'get_invoices': {
      const where: Record<string, unknown> = {}
      if (args.projectId) where.projectId = args.projectId
      if (args.status) where.status = args.status

      return prisma.invoice.findMany({
        where,
        include: {
          project: { include: { customer: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    case 'create_invoice_draft': {
      const invoice = await prisma.invoice.create({
        data: {
          projectId: args.projectId as string,
          billingModel: args.billingModel as 'FIXED_PRICE' | 'TIME_AND_MATERIALS' | 'MILESTONE',
          status: 'DRAFT',
          lineItems: args.lineItems as unknown as Prisma.InputJsonValue,
          subtotal: args.subtotal as number,
          tax: args.tax as number | undefined,
          total: args.total as number,
          dueDate: args.dueDate ? new Date(args.dueDate as string) : undefined,
          notes: args.notes as string | undefined,
        },
      })

      await prisma.activityLog.create({
        data: {
          agentType: 'LEAD',
          actorType: 'agent',
          action: `Invoice draft created for $${args.total}`,
          entityType: 'Invoice',
          entityId: invoice.id,
          projectId: args.projectId as string,
        },
      })

      return { success: true, invoiceId: invoice.id }
    }

    case 'log_activity': {
      const log = await prisma.activityLog.create({
        data: {
          agentType: args.agentType as 'LEAD' | 'PROJECT_TRACKER' | 'LIAISON' | 'SCHEDULING',
          actorType: 'agent',
          action: args.action as string,
          projectId: args.projectId as string | undefined,
          entityType: args.entityType as string | undefined,
          entityId: args.entityId as string | undefined,
          metadata: args.metadata as unknown as Prisma.InputJsonValue | undefined,
        },
      })
      return { success: true, logId: log.id }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
