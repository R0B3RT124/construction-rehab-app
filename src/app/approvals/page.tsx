'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Approval {
  id: string; title: string; description: string; agentType: string; actionType: string
  priority: string; status: string; createdAt: string; proposedData: Record<string, unknown>
  project?: { name: string; address: string }
  communication?: { channel: string; subject?: string; body?: string }
  invoice?: { total: number }
  scheduleItem?: { title: string; startDate: string }
}

const priorityBadge: Record<string, string> = {
  URGENT: 'bg-red-900/40 text-red-400 border-red-700', HIGH: 'bg-orange-900/40 text-orange-400 border-orange-700',
  NORMAL: 'bg-blue-900/40 text-blue-400 border-blue-700', LOW: 'bg-slate-800 text-slate-400 border-slate-600',
}
const agentBadge: Record<string, string> = {
  LEAD: 'bg-purple-900/40 text-purple-300', PROJECT_TRACKER: 'bg-blue-900/40 text-blue-300',
  LIAISON: 'bg-green-900/40 text-green-300', SCHEDULING: 'bg-yellow-900/40 text-yellow-300',
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { fetchApprovals() }, [statusFilter])

  async function fetchApprovals() {
    const data = await fetch(`/api/approvals?status=${statusFilter}&limit=100`).then(r => r.json())
    setApprovals(Array.isArray(data) ? data : [])
  }

  async function decide(id: string, status: 'APPROVED' | 'REJECTED', notes?: string) {
    await fetch(`/api/approvals/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewNotes: notes }),
    })
    fetchApprovals()
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Approvals</h1>

        <div className="flex gap-2 mb-5">
          {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-[#1a1f2e] text-slate-400 border border-[#2d3748] hover:text-slate-200'}`}>
              {s}
            </button>
          ))}
        </div>

        {approvals.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1f2e] border border-[#2d3748] rounded-xl text-slate-500">
            No {statusFilter.toLowerCase()} approvals
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map(a => (
              <div key={a.id} className={`bg-[#1a1f2e] border rounded-xl overflow-hidden ${a.priority === 'URGENT' ? 'border-red-700/60' : 'border-[#2d3748]'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-200 text-sm">{a.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded border ${priorityBadge[a.priority]}`}>{a.priority}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${agentBadge[a.agentType]}`}>{a.agentType.replace('_', ' ')}</span>
                      </div>
                      {a.project && <div className="text-xs text-slate-500 mt-0.5">{a.project.name} — {a.project.address}</div>}
                      <div className="text-sm text-slate-400 mt-1.5 leading-relaxed">{a.description}</div>
                      <div className="text-xs text-slate-600 mt-1">Action: {a.actionType.replace(/_/g, ' ')}</div>
                    </div>
                    {statusFilter === 'PENDING' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => decide(a.id, 'APPROVED')}
                          className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                          Approve
                        </button>
                        <button onClick={() => decide(a.id, 'REJECTED')}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expand proposed data */}
                  <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    className="text-xs text-slate-600 hover:text-slate-400 mt-2 transition-colors">
                    {expandedId === a.id ? '▲ Hide details' : '▼ View proposed action'}
                  </button>
                </div>

                {expandedId === a.id && (
                  <div className="bg-[#0f1117] border-t border-[#2d3748] px-4 py-3">
                    <pre className="text-xs text-slate-400 overflow-auto max-h-40">
                      {JSON.stringify(a.proposedData, null, 2)}
                    </pre>
                    {a.communication?.body && (
                      <div className="mt-3 p-3 bg-[#1a1f2e] rounded-lg border border-[#2d3748]">
                        <div className="text-xs text-slate-500 mb-1">Draft Message ({a.communication.channel}):</div>
                        <div className="text-sm text-slate-300 whitespace-pre-wrap">{a.communication.body}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
