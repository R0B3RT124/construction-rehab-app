export type AgentType = 'LEAD' | 'PROJECT_TRACKER' | 'LIAISON' | 'SCHEDULING'

export interface AgentContext {
  projectIds?: string[]
  triggerReason?: string
  callLogId?: string
  agentRunId?: string
}

export interface AgentResult {
  success: boolean
  summary: string
  actionsCreated: string[]
  pendingApprovals: string[]
  tokenUsage: { input: number; output: number }
}

export interface LineItem {
  description: string
  qty: number
  rate: number
  amount: number
}
