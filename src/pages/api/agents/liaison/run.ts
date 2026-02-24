import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LiaisonAgent } from '@/agents/liaison-agent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await new LiaisonAgent().run(req.body || {})
    res.json({ success: true, result })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Agent failed' })
  }
}
