import type { NextApiRequest, NextApiResponse } from 'next'
import { runOrchestratorCycle } from '@/agents/orchestrator'

// This endpoint is called by Vercel Cron or an external cron service
// Protect with a shared secret token
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('[Cron] Triggering agent cycle...')
    const results = await runOrchestratorCycle({ triggerReason: 'cron' })
    res.json({
      success: true,
      totalPendingApprovals: results.totalPendingApprovals,
      leadSummary: results.lead.summary.slice(0, 300),
    })
  } catch (err) {
    console.error('[Cron] Agent cycle failed:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Cycle failed' })
  }
}
