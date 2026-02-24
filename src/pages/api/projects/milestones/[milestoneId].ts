import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { milestoneId } = req.query as { milestoneId: string }

  if (req.method === 'PUT') {
    const { dueDate, completedAt, ...rest } = req.body
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      },
    })
    return res.json(milestone)
  }

  if (req.method === 'DELETE') {
    await prisma.milestone.delete({ where: { id: milestoneId } })
    return res.json({ success: true })
  }

  res.status(405).end()
}
