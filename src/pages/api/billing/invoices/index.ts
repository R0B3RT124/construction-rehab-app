import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { projectId, status } = req.query
    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        project: { include: { customer: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(invoices)
  }

  if (req.method === 'POST') {
    const { projectId, billingModel, lineItems, subtotal, tax, total, dueDate, notes } = req.body

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        billingModel,
        lineItems,
        subtotal,
        tax,
        total,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
        status: 'DRAFT',
      },
      include: { project: { include: { customer: true } } },
    })
    return res.status(201).json(invoice)
  }

  res.status(405).end()
}
