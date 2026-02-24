import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initiateOutboundCall } from '@/lib/twilio'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { toPhone, script, projectId, contactId, approvalId } = req.body

  if (!toPhone || !script) {
    return res.status(400).json({ error: 'toPhone and script are required' })
  }

  // If linked to an approval, verify it's approved
  if (approvalId) {
    const approval = await prisma.approvalRequest.findUnique({ where: { id: approvalId } })
    if (!approval || approval.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Approval required before initiating call' })
    }
  }

  try {
    const callSid = await initiateOutboundCall(toPhone, script, projectId)

    // Create call log
    const callLog = await prisma.callLog.create({
      data: {
        twilioCallSid: callSid,
        direction: 'OUTBOUND',
        fromNumber: process.env.TWILIO_PHONE_NUMBER!,
        toNumber: toPhone,
        status: 'IN_PROGRESS',
        projectId: projectId || undefined,
        contactId: contactId || undefined,
      },
    })

    await prisma.activityLog.create({
      data: {
        agentType: 'LEAD',
        actorType: 'user',
        actorId: session.user?.email || undefined,
        action: `Outbound call initiated to ${toPhone}`,
        entityType: 'CallLog',
        entityId: callLog.id,
        projectId: projectId || undefined,
      },
    })

    res.json({ success: true, callSid, callLogId: callLog.id })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Call failed' })
  }
}
