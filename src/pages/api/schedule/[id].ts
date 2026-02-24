import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const item = await prisma.scheduleItem.findUnique({
      where: { id },
      include: { subcontractor: true, project: true },
    })
    if (!item) return res.status(404).json({ error: 'Not found' })
    return res.json(item)
  }

  if (req.method === 'PUT') {
    const { startDate, endDate, ...rest } = req.body
    const item = await prisma.scheduleItem.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    })
    return res.json(item)
  }

  if (req.method === 'DELETE') {
    await prisma.scheduleItem.delete({ where: { id } })
    return res.json({ success: true })
  }

  res.status(405).end()
}
