'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'

interface Contact { id: string; name: string; phone?: string }
interface Milestone { id: string; name: string; status: string }
interface Project {
  id: string
  name: string
  address: string
  status: string
  billingModel: string
  completionPct: number
  contractAmount?: number
  budgetEstimate?: number
  startDate?: string
  targetEndDate?: string
  customer: Contact
  milestones: Milestone[]
  _count?: { scheduleItems: number; invoices: number; approvals: number }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-900/30 border-green-700',
  LEAD: 'text-blue-400 bg-blue-900/30 border-blue-700',
  ON_HOLD: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  COMPLETED: 'text-slate-400 bg-slate-800 border-slate-600',
  CANCELLED: 'text-red-400 bg-red-900/30 border-red-700',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const [form, setForm] = useState({
    name: '', address: '', description: '', status: 'ACTIVE',
    billingModel: 'FIXED_PRICE', contractAmount: '', budgetEstimate: '',
    startDate: '', targetEndDate: '', customerId: '',
  })

  useEffect(() => {
    fetchProjects()
    fetch('/api/contacts?type=CUSTOMER').then(r => r.json()).then(setContacts)
  }, [filterStatus])

  async function fetchProjects() {
    setLoading(true)
    const url = filterStatus ? `/api/projects?status=${filterStatus}` : '/api/projects'
    const data = await fetch(url).then(r => r.json())
    setProjects(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      ...form,
      contractAmount: form.contractAmount ? parseFloat(form.contractAmount) : undefined,
      budgetEstimate: form.budgetEstimate ? parseFloat(form.budgetEstimate) : undefined,
    }
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setShowForm(false)
    setForm({ name: '', address: '', description: '', status: 'ACTIVE', billingModel: 'FIXED_PRICE', contractAmount: '', budgetEstimate: '', startDate: '', targetEndDate: '', customerId: '' })
    fetchProjects()
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + New Project
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {['', 'ACTIVE', 'LEAD', 'ON_HOLD', 'COMPLETED'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-orange-500 text-white' : 'bg-[#1a1f2e] text-slate-400 hover:text-slate-200 border border-[#2d3748]'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* New Project Form */}
        {showForm && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 mb-5">
            <h2 className="font-semibold text-slate-200 mb-4">New Project</h2>
            <form onSubmit={createProject} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Project Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Kitchen & Bath Renovation" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Address *</label>
                <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="123 Main St, City, ST 12345" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Customer *</label>
                <select required value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Select customer</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Billing Model</label>
                <select value={form.billingModel} onChange={e => setForm(f => ({ ...f, billingModel: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="FIXED_PRICE">Fixed Price</option>
                  <option value="TIME_AND_MATERIALS">Time & Materials</option>
                  <option value="MILESTONE">Milestone-Based</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contract Amount ($)</label>
                <input type="number" value={form.contractAmount} onChange={e => setForm(f => ({ ...f, contractAmount: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="25000" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Budget Estimate ($)</label>
                <input type="number" value={form.budgetEstimate} onChange={e => setForm(f => ({ ...f, budgetEstimate: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="22000" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target End Date</label>
                <input type="date" value={form.targetEndDate} onChange={e => setForm(f => ({ ...f, targetEndDate: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div className="col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">Create Project</button>
              </div>
            </form>
          </div>
        )}

        {/* Project List */}
        {loading ? (
          <div className="text-slate-500 text-center py-12">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-slate-500 text-center py-12 bg-[#1a1f2e] border border-[#2d3748] rounded-xl">No projects found. Create your first project above.</div>
        ) : (
          <div className="space-y-3">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} className="block bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 hover:border-orange-500/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-semibold text-slate-200">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[p.status]}`}>{p.status}</span>
                    </div>
                    <div className="text-sm text-slate-400">{p.address}</div>
                    <div className="text-xs text-slate-500 mt-1">Customer: {p.customer?.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-sm font-medium text-slate-200">{p.completionPct}%</div>
                    <div className="text-xs text-slate-500 mb-2">complete</div>
                    <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${p.completionPct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2d3748]">
                  <span className="text-xs text-slate-500">{p.milestones?.length || 0} milestones</span>
                  {p.contractAmount && <span className="text-xs text-slate-500">Contract: ${p.contractAmount.toLocaleString()}</span>}
                  <span className="text-xs text-slate-500">{p.billingModel.replace(/_/g, ' ')}</span>
                  {p.targetEndDate && <span className="text-xs text-slate-500">Due: {new Date(p.targetEndDate).toLocaleDateString()}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
