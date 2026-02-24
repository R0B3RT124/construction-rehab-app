import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { status = 'PENDING', projectId, limit = '50', cursor } = req.query

    const approvals = await prisma.approvalRequest.findMany({
      where: {
        status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED',
        ...(projectId ? { projectId: projectId as string } : {}),
      },
      include: {
        project: { select: { id: true, name: true, address: true } },
        milestone: { select: { id: true, name: true } },
        scheduleItem: { select: { id: true, title: true, startDate: true } },
        communication: { select: { id: true, channel: true, subject: true } },
        invoice: { select: { id: true, total: true, status: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: parseInt(limit as string),
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    })

    return res.json(approvals)
  }

  res.status(405).end()
}
