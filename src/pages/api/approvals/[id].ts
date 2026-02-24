import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSms } from '@/lib/twilio'
import { qbApiRequest, getFirstQBToken } from '@/lib/quickbooks'
import type { Session } from 'next-auth'

async function executeApprovedAction(
  approval: Awaited<ReturnType<typeof prisma.approvalRequest.findUnique>>,
  session: Session
) {
  if (!approval) return

  const proposed = approval.proposedData as Record<string, unknown>

  switch (approval.actionType) {
    case 'SEND_COMMUNICATION': {
      // Send email or SMS
      if (approval.communicationId) {
        const comm = await prisma.communication.findUnique({
          where: { id: approval.communicationId },
          include: { contact: true },
        })
        if (comm?.contact?.phone && comm.channel === 'SMS') {
          await sendSms(comm.contact.phone, comm.body)
        }
        await prisma.communication.update({
          where: { id: approval.communicationId },
          data: { status: 'SENT', sentAt: new Date() },
        })
      }
      break
    }

    case 'INVOICE_SEND': {
      // Push invoice to QuickBooks
      if (approval.invoiceId) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: approval.invoiceId },
          include: { project: { include: { customer: true } } },
        })
        if (!invoice) break

        const qbToken = await getFirstQBToken()
        if (qbToken && invoice.project.customer.qbCustomerId) {
          const lineItems = invoice.lineItems as Array<{
            description: string
            qty: number
            rate: number
            amount: number
          }>

          const qbInvoice = {
            CustomerRef: { value: invoice.project.customer.qbCustomerId },
            Line: lineItems.map((item) => ({
              Amount: item.amount,
              DetailType: 'SalesItemLineDetail',
              Description: item.description,
              SalesItemLineDetail: { UnitPrice: item.rate, Qty: item.qty },
            })),
            DueDate: invoice.dueDate?.toISOString().split('T')[0],
          }

          try {
            const qbResult = await qbApiRequest(
              qbToken.realmId,
              '/invoice',
              'POST',
              { Invoice: qbInvoice }
            )
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                qbInvoiceId: qbResult.Invoice?.Id,
                qbInvoiceNumber: qbResult.Invoice?.DocNumber,
                status: 'SENT',
                issuedDate: new Date(),
              },
            })
          } catch (err) {
            console.error('QB push failed:', err)
          }
        } else {
          // No QB connected — just mark as approved/sent
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'SENT', issuedDate: new Date() },
          })
        }
      }
      break
    }

    case 'OUTBOUND_CALL': {
      const { initiateOutboundCall } = await import('@/lib/twilio')
      await initiateOutboundCall(
        proposed.toPhone as string,
        proposed.script as string,
        proposed.projectId as string | undefined
      )
      break
    }

    case 'MAJOR_MILESTONE_CHANGE': {
      if (approval.milestoneId && proposed.updates) {
        await prisma.milestone.update({
          where: { id: approval.milestoneId },
          data: proposed.updates as Record<string, unknown>,
        })
      }
      break
    }

    case 'SCHEDULE_CHANGE': {
      if (approval.scheduleItemId && proposed.updates) {
        await prisma.scheduleItem.update({
          where: { id: approval.scheduleItemId },
          data: proposed.updates as Record<string, unknown>,
        })
      }
      break
    }

    default:
      console.log(`Approval action ${approval.actionType} approved — manual execution required`)
  }

  // Log the approval action
  await prisma.activityLog.create({
    data: {
      agentType: approval.agentType,
      actorType: 'user',
      actorId: (session.user as { id?: string })?.id,
      action: `Approved: ${approval.title}`,
      entityType: 'ApprovalRequest',
      entityId: approval.id,
      projectId: approval.projectId || undefined,
    },
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        project: true,
        milestone: true,
        scheduleItem: { include: { subcontractor: true } },
        communication: { include: { contact: true } },
        invoice: { include: { project: { include: { customer: true } } } },
      },
    })
    if (!approval) return res.status(404).json({ error: 'Not found' })
    return res.json(approval)
  }

  if (req.method === 'PUT') {
    const { status, reviewNotes } = req.body as {
      status: 'APPROVED' | 'REJECTED'
      reviewNotes?: string
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED' })
    }

    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: session.user?.email || 'admin',
        reviewedAt: new Date(),
        reviewNotes,
      },
    })

    // Execute the action if approved
    if (status === 'APPROVED') {
      const fullApproval = await prisma.approvalRequest.findUnique({ where: { id } })
      try {
        await executeApprovedAction(fullApproval, session)
      } catch (err) {
        console.error('Failed to execute approved action:', err)
        // Don't fail the approval itself
      }
    } else {
      // Log rejection
      await prisma.activityLog.create({
        data: {
          agentType: approval.agentType,
          actorType: 'user',
          actorId: session.user?.email || undefined,
          action: `Rejected: ${approval.title}`,
          entityType: 'ApprovalRequest',
          entityId: approval.id,
          projectId: approval.projectId || undefined,
        },
      })
    }

    return res.json(approval)
  }

  res.status(405).end()
}
