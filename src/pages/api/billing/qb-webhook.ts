import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

// QuickBooks sends webhooks when payment events occur
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // QB webhook signature validation would go here in production
  const payload = req.body

  try {
    const events = payload?.eventNotifications || []
    for (const event of events) {
      const dataChangeEvent = event?.dataChangeEvent
      if (!dataChangeEvent) continue

      for (const entity of dataChangeEvent.entities || []) {
        if (entity.name === 'Payment' || entity.name === 'Invoice') {
          // Find matching invoice by QB ID and update status
          const qbId = entity.id
          const invoice = await prisma.invoice.findFirst({
            where: { qbInvoiceId: qbId },
          })

          if (invoice && entity.operation === 'Update') {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                status: 'PAID',
                paidDate: new Date(),
              },
            })

            await prisma.activityLog.create({
              data: {
                actorType: 'system',
                action: `Invoice paid (QB: ${qbId})`,
                entityType: 'Invoice',
                entityId: invoice.id,
                projectId: invoice.projectId,
              },
            })
          }
        }
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('QB webhook error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
