import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }

  if (req.method === 'PUT') {
    const { appliedDate, approvedDate, expiresDate, inspectionDate, ...rest } = req.body
    const permit = await prisma.permit.update({
      where: { id },
      data: {
        ...rest,
        appliedDate: appliedDate ? new Date(appliedDate) : undefined,
        approvedDate: approvedDate ? new Date(approvedDate) : undefined,
        expiresDate: expiresDate ? new Date(expiresDate) : undefined,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
      },
    })
    return res.json(permit)
  }

  if (req.method === 'DELETE') {
    await prisma.permit.delete({ where: { id } })
    return res.json({ success: true })
  }

  res.status(405).end()
}
