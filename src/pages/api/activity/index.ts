import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { projectId, agentType, limit = '50', cursor } = req.query

    const logs = await prisma.activityLog.findMany({
      where: {
        ...(projectId ? { projectId: projectId as string } : {}),
        ...(agentType ? { agentType: agentType as 'LEAD' | 'PROJECT_TRACKER' | 'LIAISON' | 'SCHEDULING' } : {}),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    })

    return res.json(logs)
  }

  res.status(405).end()
}
