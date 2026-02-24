import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { status, projectId, channel } = req.query
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (projectId) where.projectId = projectId
    if (channel) where.channel = channel

    const comms = await prisma.communication.findMany({
      where,
      include: {
        contact: true,
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return res.json(comms)
  }

  if (req.method === 'POST') {
    const comm = await prisma.communication.create({
      data: {
        ...req.body,
        status: req.body.status || 'DRAFT',
        draftedBy: req.body.draftedBy || session.user?.email || 'admin',
      },
    })
    return res.status(201).json(comm)
  }

  res.status(405).end()
}
