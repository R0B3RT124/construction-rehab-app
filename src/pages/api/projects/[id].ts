import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        milestones: { orderBy: { order: 'asc' } },
        scheduleItems: { include: { subcontractor: true }, orderBy: { startDate: 'asc' } },
        permits: { orderBy: { expiresDate: 'asc' } },
        communications: { orderBy: { createdAt: 'desc' }, take: 20 },
        invoices: { orderBy: { createdAt: 'desc' } },
        callLogs: { orderBy: { startedAt: 'desc' }, take: 10 },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        approvals: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!project) return res.status(404).json({ error: 'Not found' })
    return res.json(project)
  }

  if (req.method === 'PUT') {
    const {
      contractAmount,
      budgetEstimate,
      actualCost,
      startDate,
      targetEndDate,
      actualEndDate,
      ...rest
    } = req.body

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        contractAmount: contractAmount !== undefined ? contractAmount : undefined,
        budgetEstimate: budgetEstimate !== undefined ? budgetEstimate : undefined,
        actualCost: actualCost !== undefined ? actualCost : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
      },
      include: { customer: true },
    })
    return res.json(project)
  }

  if (req.method === 'DELETE') {
    await prisma.project.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    return res.json({ success: true })
  }

  res.status(405).end()
}
