'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Comm {
  id: string; channel: string; direction: string; subject?: string; body: string
  status: string; draftedBy: string; sentAt?: string; createdAt: string
  contact?: { name: string; email?: string; phone?: string }
  project?: { name: string }
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-800 text-slate-300', PENDING_APPROVAL: 'bg-orange-900/40 text-orange-300',
  APPROVED: 'bg-blue-900/40 text-blue-300', SENT: 'bg-green-900/40 text-green-300', REJECTED: 'bg-red-900/40 text-red-300',
}

const channelIcon: Record<string, string> = {
  EMAIL: '✉', SMS: '💬', PHONE_CALL: '📞', INTERNAL_NOTE: '📝',
}

export default function CommunicationsPage() {
  const [comms, setComms] = useState<Comm[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const url = statusFilter ? `/api/communications?status=${statusFilter}` : '/api/communications'
    fetch(url).then(r => r.json()).then(d => setComms(Array.isArray(d) ? d : []))
  }, [statusFilter])

  async function sendComm(id: string) {
    await fetch(`/api/communications/${id}?action=send`, { method: 'POST' })
    const data = await fetch('/api/communications').then(r => r.json())
    setComms(Array.isArray(data) ? data : [])
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Communications</h1>

        <div className="flex gap-2 mb-5">
          {['', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-[#1a1f2e] text-slate-400 border border-[#2d3748] hover:text-slate-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {comms.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1f2e] border border-[#2d3748] rounded-xl text-slate-500">No communications found</div>
        ) : (
          <div className="space-y-2">
            {comms.map(c => (
              <div key={c.id} className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{channelIcon[c.channel]}</span>
                        <span className="font-medium text-sm text-slate-200 truncate">{c.subject || c.body.slice(0, 60) + '...'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[c.status]}`}>{c.status.replace(/_/g, ' ')}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${c.direction === 'OUTBOUND' ? 'bg-blue-900/40 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>{c.direction}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1">
                        {c.contact && <span>To: {c.contact.name}</span>}
                        {c.project && <span>Project: {c.project.name}</span>}
                        <span>By: {c.draftedBy}</span>
                      </div>
                    </div>
                    {c.status === 'APPROVED' && (
                      <button onClick={(e) => { e.stopPropagation(); sendComm(c.id) }}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
                        Send Now
                      </button>
                    )}
                  </div>
                </div>
                {expanded === c.id && (
                  <div className="border-t border-[#2d3748] px-4 py-3 bg-[#0f1117]">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{c.body}</p>
                    {c.sentAt && <div className="text-xs text-slate-600 mt-2">Sent: {new Date(c.sentAt).toLocaleString()}</div>}
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
