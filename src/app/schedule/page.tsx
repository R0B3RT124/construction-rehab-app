'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface ScheduleItem {
  id: string; title: string; description?: string; startDate: string; endDate: string
  status: string; reminderSentAt?: string
  subcontractor?: { name: string; phone?: string }
  project?: { name: string; address: string }
}

interface Permit {
  id: string; type: string; status: string; permitNumber?: string
  expiresDate?: string; inspectionDate?: string; notes?: string
  project?: { name: string; address: string }
}

interface Contact { id: string; name: string }
interface Project { id: string; name: string }

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-900/40 text-blue-300', IN_PROGRESS: 'bg-orange-900/40 text-orange-300',
  COMPLETED: 'bg-green-900/40 text-green-300', CANCELLED: 'bg-slate-800 text-slate-400', RESCHEDULED: 'bg-yellow-900/40 text-yellow-300',
}

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [permits, setPermits] = useState<Permit[]>([])
  const [tab, setTab] = useState<'schedule' | 'permits'>('schedule')
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showPermitForm, setShowPermitForm] = useState(false)
  const [form, setForm] = useState({ projectId: '', subcontractorId: '', title: '', description: '', startDate: '', endDate: '' })
  const [permitForm, setPermitForm] = useState({ projectId: '', type: '', permitNumber: '', status: 'NOT_APPLIED', appliedDate: '', approvedDate: '', expiresDate: '', inspectionDate: '', notes: '' })

  useEffect(() => {
    fetch('/api/schedule').then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : []))
    fetch('/api/permits').then(r => r.json()).then(d => setPermits(Array.isArray(d) ? d : []))
    fetch('/api/projects?status=ACTIVE').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : []))
    fetch('/api/contacts?type=SUBCONTRACTOR').then(r => r.json()).then(d => setContacts(Array.isArray(d) ? d : []))
  }, [])

  async function addScheduleItem(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowForm(false)
    const data = await fetch('/api/schedule').then(r => r.json())
    setItems(Array.isArray(data) ? data : [])
  }

  async function addPermit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/permits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(permitForm) })
    setShowPermitForm(false)
    const data = await fetch('/api/permits').then(r => r.json())
    setPermits(Array.isArray(data) ? data : [])
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Schedule & Permits</h1>
          <button onClick={() => tab === 'schedule' ? setShowForm(true) : setShowPermitForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + {tab === 'schedule' ? 'Add Work Item' : 'Add Permit'}
          </button>
        </div>

        <div className="flex gap-1 mb-5 bg-[#1a1f2e] border border-[#2d3748] p-1 rounded-lg w-fit">
          {(['schedule', 'permits'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'schedule' ? 'Work Schedule' : 'Permits'}
            </button>
          ))}
        </div>

        {/* Schedule Form */}
        {showForm && tab === 'schedule' && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 mb-4">
            <h2 className="font-semibold text-slate-200 mb-4">New Schedule Item</h2>
            <form onSubmit={addScheduleItem} className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-slate-400 mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Project *</label>
                <select required value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label className="block text-xs text-slate-400 mb-1">Subcontractor</label>
                <select value={form.subcontractorId} onChange={e => setForm(f => ({ ...f, subcontractorId: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">None</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-xs text-slate-400 mb-1">Start Date *</label>
                <input required type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">End Date *</label>
                <input required type="datetime-local" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div className="col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">Cancel</button>
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Add</button>
              </div>
            </form>
          </div>
        )}

        {/* Permit Form */}
        {showPermitForm && tab === 'permits' && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 mb-4">
            <h2 className="font-semibold text-slate-200 mb-4">New Permit</h2>
            <form onSubmit={addPermit} className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-slate-400 mb-1">Type *</label>
                <input required placeholder="Building, Electrical, Plumbing..." value={permitForm.type} onChange={e => setPermitForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Project *</label>
                <select required value={permitForm.projectId} onChange={e => setPermitForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Select</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={permitForm.status} onChange={e => setPermitForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  {['NOT_APPLIED','APPLIED','APPROVED','REJECTED','EXPIRED','INSPECTION_SCHEDULED','INSPECTION_PASSED','INSPECTION_FAILED','CLOSED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select></div>
              <div><label className="block text-xs text-slate-400 mb-1">Permit #</label>
                <input value={permitForm.permitNumber} onChange={e => setPermitForm(f => ({ ...f, permitNumber: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Expiry Date</label>
                <input type="date" value={permitForm.expiresDate} onChange={e => setPermitForm(f => ({ ...f, expiresDate: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Inspection Date</label>
                <input type="date" value={permitForm.inspectionDate} onChange={e => setPermitForm(f => ({ ...f, inspectionDate: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
              <div className="col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPermitForm(false)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">Cancel</button>
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Add Permit</button>
              </div>
            </form>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-3">
            {items.length === 0 ? <div className="text-center py-12 bg-[#1a1f2e] border border-[#2d3748] rounded-xl text-slate-500">No work items scheduled</div> :
              items.map(item => (
                <div key={item.id} className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-slate-200">{item.title}</h3>
                      {item.project && <div className="text-xs text-slate-500 mt-0.5">{item.project.name} — {item.project.address}</div>}
                      {item.subcontractor && <div className="text-xs text-slate-400 mt-0.5">Subcontractor: {item.subcontractor.name} {item.subcontractor.phone && `(${item.subcontractor.phone})`}</div>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[item.status]}`}>{item.status}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>Start: {new Date(item.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span>End: {new Date(item.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    {item.reminderSentAt && <span className="text-green-600">Reminder sent</span>}
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === 'permits' && (
          <div className="space-y-3">
            {permits.length === 0 ? <div className="text-center py-12 bg-[#1a1f2e] border border-[#2d3748] rounded-xl text-slate-500">No permits tracked</div> :
              permits.map(p => (
                <div key={p.id} className={`bg-[#1a1f2e] border rounded-xl p-4 ${p.expiresDate && new Date(p.expiresDate) < new Date(Date.now() + 14 * 864e5) ? 'border-orange-700/60' : 'border-[#2d3748]'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-slate-200">{p.type} Permit {p.permitNumber && `#${p.permitNumber}`}</h3>
                      {p.project && <div className="text-xs text-slate-500 mt-0.5">{p.project.name}</div>}
                    </div>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{p.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    {p.expiresDate && <span className={new Date(p.expiresDate) < new Date(Date.now() + 14 * 864e5) ? 'text-orange-400' : ''}>Expires: {new Date(p.expiresDate).toLocaleDateString()}</span>}
                    {p.inspectionDate && <span>Inspection: {new Date(p.inspectionDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
