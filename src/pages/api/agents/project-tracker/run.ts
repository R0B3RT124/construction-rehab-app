import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProjectTrackerAgent } from '@/agents/project-tracker-agent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await new ProjectTrackerAgent().run(req.body || {})
    res.json({ success: true, result })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Agent failed' })
  }
}
