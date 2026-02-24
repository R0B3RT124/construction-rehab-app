import { runAllAgents } from './lead-agent'
import type { AgentContext } from './types'

/**
 * Main orchestration entry point.
 * Called by cron job or admin trigger.
 */
export async function runOrchestratorCycle(context: AgentContext = {}) {
  console.log('[Orchestrator] Starting agent cycle at', new Date().toISOString())

  try {
    const results = await runAllAgents(context)

    console.log('[Orchestrator] Cycle complete:', {
      totalPendingApprovals: results.totalPendingApprovals,
      leadSummary: results.lead.summary.slice(0, 200),
    })

    return results
  } catch (err) {
    console.error('[Orchestrator] Cycle failed:', err)
    throw err
  }
}
