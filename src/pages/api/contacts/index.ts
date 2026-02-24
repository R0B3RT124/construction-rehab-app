import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  type: z.enum(['CUSTOMER', 'SUBCONTRACTOR', 'SUPPLIER', 'OTHER']),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { type, search } = req.query
    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    })
    return res.json(contacts)
  }

  if (req.method === 'POST') {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const contact = await prisma.contact.create({ data: parsed.data })
    return res.status(201).json(contact)
  }

  res.status(405).end()
}
