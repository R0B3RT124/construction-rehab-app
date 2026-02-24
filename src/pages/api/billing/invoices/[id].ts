import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { qbApiRequest, getFirstQBToken } from '@/lib/quickbooks'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { project: { include: { customer: true } } },
    })
    if (!invoice) return res.status(404).json({ error: 'Not found' })
    return res.json(invoice)
  }

  if (req.method === 'PUT') {
    const { dueDate, issuedDate, paidDate, ...rest } = req.body
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        issuedDate: issuedDate ? new Date(issuedDate) : undefined,
        paidDate: paidDate ? new Date(paidDate) : undefined,
      },
    })
    return res.json(invoice)
  }

  // Push to QuickBooks
  if (req.method === 'POST' && req.query.action === 'push-to-qb') {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { project: { include: { customer: true } } },
    })
    if (!invoice) return res.status(404).json({ error: 'Not found' })

    const qbToken = await getFirstQBToken()
    if (!qbToken) {
      return res.status(400).json({ error: 'QuickBooks not connected' })
    }

    const lineItems = invoice.lineItems as Array<{
      description: string
      qty: number
      rate: number
      amount: number
    }>

    const qbInvoice = {
      CustomerRef: { value: invoice.project.customer.qbCustomerId || '' },
      Line: lineItems.map((item) => ({
        Amount: item.amount,
        DetailType: 'SalesItemLineDetail',
        Description: item.description,
        SalesItemLineDetail: { UnitPrice: item.rate, Qty: item.qty },
      })),
      DueDate: invoice.dueDate?.toISOString().split('T')[0],
    }

    try {
      const qbResult = await qbApiRequest(qbToken.realmId, '/invoice', 'POST', {
        Invoice: qbInvoice,
      })
      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          qbInvoiceId: qbResult.Invoice?.Id,
          qbInvoiceNumber: qbResult.Invoice?.DocNumber,
          status: 'SENT',
          issuedDate: new Date(),
        },
      })

      await prisma.activityLog.create({
        data: {
          actorType: 'user',
          actorId: session.user?.email || undefined,
          action: `Invoice pushed to QuickBooks (${qbResult.Invoice?.DocNumber})`,
          entityType: 'Invoice',
          entityId: id,
          projectId: invoice.projectId,
        },
      })

      return res.json(updated)
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'QB push failed' })
    }
  }

  res.status(405).end()
}
