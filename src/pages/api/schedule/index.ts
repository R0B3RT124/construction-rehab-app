import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  projectId: z.string(),
  subcontractorId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  allDay: z.boolean().default(false),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { projectId, startDate, endDate } = req.query
    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (startDate || endDate) {
      where.startDate = {}
      if (startDate) (where.startDate as Record<string, Date>).gte = new Date(startDate as string)
      if (endDate) (where.startDate as Record<string, Date>).lte = new Date(endDate as string)
    }

    const items = await prisma.scheduleItem.findMany({
      where,
      include: {
        subcontractor: true,
        project: { select: { name: true, address: true } },
      },
      orderBy: { startDate: 'asc' },
    })
    return res.json(items)
  }

  if (req.method === 'POST') {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { startDate, endDate, ...rest } = parsed.data
    const item = await prisma.scheduleItem.create({
      data: { ...rest, startDate: new Date(startDate), endDate: new Date(endDate) },
      include: { subcontractor: true },
    })
    return res.status(201).json(item)
  }

  res.status(405).end()
}
