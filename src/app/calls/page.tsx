'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface CallLog {
  id: string; direction: string; fromNumber: string; toNumber: string
  status: string; duration?: number; summary?: string; transcript?: string
  startedAt: string; endedAt?: string; routedToAgent?: string
  contact?: { name: string }; project?: { name: string }
}

const statusColors: Record<string, string> = {
  COMPLETED: 'text-green-400', FAILED: 'text-red-400', IN_PROGRESS: 'text-orange-400', NO_ANSWER: 'text-slate-400', BUSY: 'text-slate-400',
}

export default function CallsPage() {
  const [calls, setCallLogs] = useState<CallLog[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [outboundForm, setOutboundForm] = useState({ toPhone: '', script: '' })
  const [showOutbound, setShowOutbound] = useState(false)

  useEffect(() => {
    fetch('/api/calls').then(r => r.json()).then(d => setCallLogs(Array.isArray(d) ? d : []))
  }, [])

  async function initiateCall(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/calls/outbound', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(outboundForm)
    })
    if (res.ok) {
      setShowOutbound(false)
      setTimeout(() => fetch('/api/calls').then(r => r.json()).then(d => setCallLogs(Array.isArray(d) ? d : [])), 1500)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Call Logs</h1>
            <p className="text-slate-400 text-sm mt-0.5">AI voice call history and transcripts</p>
          </div>
          <button onClick={() => setShowOutbound(!showOutbound)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            📞 New Outbound Call
          </button>
        </div>

        {showOutbound && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 mb-5">
            <h2 className="font-semibold text-slate-200 mb-3">Initiate Outbound Call</h2>
            <form onSubmit={initiateCall} className="space-y-3">
              <div><label className="block text-xs text-slate-400 mb-1">Phone Number *</label>
                <input required placeholder="+15551234567" value={outboundForm.toPhone} onChange={e => setOutboundForm(f => ({ ...f, toPhone: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Opening Script *</label>
                <textarea required rows={3} placeholder="Hello, this is a call from your construction team regarding your renovation project..." value={outboundForm.script} onChange={e => setOutboundForm(f => ({ ...f, script: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none" /></div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowOutbound(false)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">Cancel</button>
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Initiate Call</button>
              </div>
            </form>
          </div>
        )}

        {calls.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1f2e] border border-[#2d3748] rounded-xl text-slate-500">
            <div className="text-3xl mb-3">📞</div>
            No call logs yet. Calls will appear here after your Twilio webhook is configured.
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map(c => (
              <div key={c.id} className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.direction === 'INBOUND' ? '⬇' : '⬆'}</span>
                        <span className="font-medium text-slate-200 text-sm">{c.direction === 'INBOUND' ? c.fromNumber : c.toNumber}</span>
                        <span className={`text-xs font-medium ${statusColors[c.status]}`}>{c.status}</span>
                      </div>
                      {c.contact && <div className="text-xs text-slate-500 mt-0.5">Contact: {c.contact.name}</div>}
                      {c.project && <div className="text-xs text-slate-500">Project: {c.project.name}</div>}
                      {c.summary && <div className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-lg">{c.summary}</div>}
                    </div>
                    <div className="text-right text-xs text-slate-500 flex-shrink-0">
                      <div>{new Date(c.startedAt).toLocaleDateString()}</div>
                      <div>{new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {c.duration && <div>{c.duration}s</div>}
                    </div>
                  </div>
                </div>
                {expanded === c.id && c.transcript && (
                  <div className="border-t border-[#2d3748] px-4 py-3 bg-[#0f1117]">
                    <div className="text-xs text-slate-500 mb-2 font-medium">Transcript</div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{c.transcript}</pre>
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
