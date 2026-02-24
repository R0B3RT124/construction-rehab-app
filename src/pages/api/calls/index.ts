import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { projectId, direction, limit = '50' } = req.query
    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (direction) where.direction = direction

    const calls = await prisma.callLog.findMany({
      where,
      include: {
        contact: { select: { name: true, phone: true } },
        project: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit as string),
    })
    return res.json(calls)
  }

  res.status(405).end()
}
