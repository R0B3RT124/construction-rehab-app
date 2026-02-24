import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { projectId } = req.query

  if (req.method === 'GET') {
    const milestones = await prisma.milestone.findMany({
      where: { projectId: projectId as string },
      orderBy: { order: 'asc' },
    })
    return res.json(milestones)
  }

  if (req.method === 'POST') {
    const { name, description, status, dueDate, invoiceable, amount, order } = req.body
    const milestone = await prisma.milestone.create({
      data: {
        projectId: projectId as string,
        name,
        description,
        status: status || 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        invoiceable: invoiceable || false,
        amount,
        order: order || 0,
      },
    })
    return res.status(201).json(milestone)
  }

  res.status(405).end()
}
