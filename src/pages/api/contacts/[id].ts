import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        customerProjects: { include: { milestones: true } },
        subScheduleItems: { include: { project: true } },
        communications: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!contact) return res.status(404).json({ error: 'Not found' })
    return res.json(contact)
  }

  if (req.method === 'PUT') {
    const contact = await prisma.contact.update({ where: { id }, data: req.body })
    return res.json(contact)
  }

  if (req.method === 'DELETE') {
    await prisma.contact.delete({ where: { id } })
    return res.json({ success: true })
  }

  res.status(405).end()
}
