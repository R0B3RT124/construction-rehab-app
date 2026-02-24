'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface LogEntry {
  id: string; action: string; agentType?: string; actorType: string; actorId?: string; createdAt: string
  entityType?: string; entityId?: string; metadata?: Record<string, unknown>
  project?: { name: string }
}

const agentColors: Record<string, string> = {
  LEAD: 'bg-purple-900/40 text-purple-300 border-purple-800',
  PROJECT_TRACKER: 'bg-blue-900/40 text-blue-300 border-blue-800',
  LIAISON: 'bg-green-900/40 text-green-300 border-green-800',
  SCHEDULING: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
}

const actorIcon: Record<string, string> = {
  agent: '🤖', user: '👤', system: '⚙️',
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [agentFilter, setAgentFilter] = useState('')

  useEffect(() => {
    const url = agentFilter ? `/api/activity?agentType=${agentFilter}&limit=100` : '/api/activity?limit=100'
    fetch(url).then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d : []))
  }, [agentFilter])

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Activity Feed</h1>

        <div className="flex gap-2 mb-5 flex-wrap">
          {['', 'LEAD', 'PROJECT_TRACKER', 'LIAISON', 'SCHEDULING'].map(a => (
            <button key={a} onClick={() => setAgentFilter(a)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${agentFilter === a ? 'bg-orange-500 text-white' : 'bg-[#1a1f2e] text-slate-400 border border-[#2d3748] hover:text-slate-200'}`}>
              {a ? a.replace('_', ' ') : 'All Agents'}
            </button>
          ))}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1f2e] border border-[#2d3748] rounded-xl text-slate-500">No activity yet. Run an agent cycle to start.</div>
        ) : (
          <div className="space-y-1.5">
            {logs.map(log => (
              <div key={log.id} className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg px-4 py-3 flex items-start gap-3">
                <div className="text-base flex-shrink-0 mt-0.5">{actorIcon[log.actorType] || '•'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-200 leading-tight">{log.action}</span>
                    {log.agentType && (
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${agentColors[log.agentType] || 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                        {log.agentType.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {log.project && <div className="text-xs text-slate-500 mt-0.5">{log.project.name}</div>}
                  {log.entityType && <div className="text-xs text-slate-600 mt-0.5">{log.entityType} · {log.entityId?.slice(0, 8)}...</div>}
                </div>
                <div className="text-xs text-slate-600 flex-shrink-0 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
