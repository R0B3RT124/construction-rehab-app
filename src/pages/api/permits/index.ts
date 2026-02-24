import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { projectId, status } = req.query
    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status

    const permits = await prisma.permit.findMany({
      where,
      include: { project: { select: { name: true, address: true } } },
      orderBy: { expiresDate: 'asc' },
    })
    return res.json(permits)
  }

  if (req.method === 'POST') {
    const { projectId, type, permitNumber, status, appliedDate, approvedDate, expiresDate, inspectionDate, notes } =
      req.body

    const permit = await prisma.permit.create({
      data: {
        projectId,
        type,
        permitNumber,
        status: status || 'NOT_APPLIED',
        appliedDate: appliedDate ? new Date(appliedDate) : undefined,
        approvedDate: approvedDate ? new Date(approvedDate) : undefined,
        expiresDate: expiresDate ? new Date(expiresDate) : undefined,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
        notes,
      },
    })
    return res.status(201).json(permit)
  }

  res.status(405).end()
}
