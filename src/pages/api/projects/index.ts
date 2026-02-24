import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['LEAD', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  billingModel: z.enum(['FIXED_PRICE', 'TIME_AND_MATERIALS', 'MILESTONE']).default('FIXED_PRICE'),
  contractAmount: z.number().optional(),
  budgetEstimate: z.number().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  customerId: z.string().min(1),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { status, search } = req.query
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: true,
        milestones: { orderBy: { order: 'asc' } },
        permits: { where: { status: { not: 'CLOSED' } } },
        _count: { select: { scheduleItems: true, invoices: true, approvals: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return res.json(projects)
  }

  if (req.method === 'POST') {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { startDate, targetEndDate, contractAmount, budgetEstimate, ...rest } = parsed.data
    const project = await prisma.project.create({
      data: {
        ...rest,
        contractAmount: contractAmount ? contractAmount : undefined,
        budgetEstimate: budgetEstimate ? budgetEstimate : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
      },
      include: { customer: true },
    })

    await prisma.activityLog.create({
      data: {
        actorType: 'user',
        action: `Project "${project.name}" created`,
        entityType: 'Project',
        entityId: project.id,
        projectId: project.id,
      },
    })

    return res.status(201).json(project)
  }

  res.status(405).end()
}
