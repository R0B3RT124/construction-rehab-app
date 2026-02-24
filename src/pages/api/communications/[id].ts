import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSms } from '@/lib/twilio'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }

  if (req.method === 'PUT') {
    const comm = await prisma.communication.update({ where: { id }, data: req.body })
    return res.json(comm)
  }

  // POST /api/communications/:id/send (handled via query param action=send)
  if (req.method === 'POST' && req.query.action === 'send') {
    const comm = await prisma.communication.findUnique({
      where: { id },
      include: { contact: true },
    })
    if (!comm) return res.status(404).json({ error: 'Not found' })
    if (comm.status === 'SENT') return res.status(400).json({ error: 'Already sent' })

    if (comm.channel === 'SMS' && comm.contact?.phone) {
      await sendSms(comm.contact.phone, comm.body)
    }

    const updated = await prisma.communication.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    })
    return res.json(updated)
  }

  res.status(405).end()
}
