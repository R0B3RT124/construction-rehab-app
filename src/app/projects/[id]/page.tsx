'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'

interface Project {
  id: string; name: string; address: string; status: string; billingModel: string
  completionPct: number; contractAmount?: number; budgetEstimate?: number; actualCost?: number
  startDate?: string; targetEndDate?: string; description?: string
  customer: { id: string; name: string; email?: string; phone?: string }
  milestones: Array<{ id: string; name: string; status: string; dueDate?: string; invoiceable: boolean; amount?: number; order: number }>
  scheduleItems: Array<{ id: string; title: string; startDate: string; endDate: string; status: string; subcontractor?: { name: string } }>
  permits: Array<{ id: string; type: string; status: string; expiresDate?: string; inspectionDate?: string }>
  invoices: Array<{ id: string; total: number; status: string; dueDate?: string }>
  approvals: Array<{ id: string; title: string; priority: string; actionType: string }>
}

const milestoneColors: Record<string, string> = {
  PENDING: 'text-slate-400', IN_PROGRESS: 'text-blue-400', COMPLETED: 'text-green-400', DELAYED: 'text-red-400', BLOCKED: 'text-orange-400'
}

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<'milestones' | 'schedule' | 'permits' | 'invoices'>('milestones')

  useEffect(() => {
    if (id) fetch(`/api/projects/${id}`).then(r => r.json()).then(setProject)
  }, [id])

  if (!project) return <DashboardLayout><div className="p-6 text-slate-500">Loading...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl">
        {/* Back */}
        <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-300 mb-4 block">← Projects</Link>

        {/* Header */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100">{project.name}</h1>
              <div className="text-slate-400 text-sm mt-0.5">{project.address}</div>
              <div className="text-slate-500 text-xs mt-1">Customer: {project.customer.name} {project.customer.phone && `· ${project.customer.phone}`}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-400">{project.completionPct}%</div>
              <div className="text-xs text-slate-500">complete</div>
              <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${project.completionPct}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#2d3748]">
            <div><div className="text-xs text-slate-500">Status</div><div className="text-sm text-slate-200 font-medium">{project.status}</div></div>
            <div><div className="text-xs text-slate-500">Billing</div><div className="text-sm text-slate-200 font-medium">{project.billingModel.replace(/_/g, ' ')}</div></div>
            {project.contractAmount && <div><div className="text-xs text-slate-500">Contract</div><div className="text-sm text-slate-200 font-medium">${Number(project.contractAmount).toLocaleString()}</div></div>}
            {project.targetEndDate && <div><div className="text-xs text-slate-500">Target End</div><div className="text-sm text-slate-200 font-medium">{new Date(project.targetEndDate).toLocaleDateString()}</div></div>}
          </div>
        </div>

        {/* Pending Approvals */}
        {project.approvals.length > 0 && (
          <div className="bg-orange-900/20 border border-orange-700/50 rounded-xl p-4 mb-4">
            <div className="text-sm font-medium text-orange-400 mb-2">{project.approvals.length} pending approval{project.approvals.length !== 1 ? 's' : ''} for this project</div>
            {project.approvals.map(a => (
              <Link key={a.id} href={`/approvals`} className="block text-xs text-orange-300 hover:text-orange-200">· {a.title}</Link>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[#1a1f2e] border border-[#2d3748] p-1 rounded-lg w-fit">
          {(['milestones', 'schedule', 'permits', 'invoices'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${activeTab === t ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'milestones' && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
            {project.milestones.length === 0 ? (
              <div className="text-slate-500 text-center py-8 text-sm">No milestones yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#2d3748]">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Milestone</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Due</th>
                  <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-medium">Amount</th>
                </tr></thead>
                <tbody>
                  {project.milestones.map(m => (
                    <tr key={m.id} className="border-b border-[#2d3748] last:border-0">
                      <td className="px-4 py-3 text-slate-200">{m.name}</td>
                      <td className="px-4 py-3"><span className={`font-medium ${milestoneColors[m.status]}`}>{m.status}</span></td>
                      <td className="px-4 py-3 text-slate-400">{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{m.amount ? `$${Number(m.amount).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
            {project.scheduleItems.length === 0 ? (
              <div className="text-slate-500 text-center py-8 text-sm">No scheduled items</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#2d3748]">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Work</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Subcontractor</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Start</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {project.scheduleItems.map(s => (
                    <tr key={s.id} className="border-b border-[#2d3748] last:border-0">
                      <td className="px-4 py-3 text-slate-200">{s.title}</td>
                      <td className="px-4 py-3 text-slate-400">{s.subcontractor?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(s.startDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'permits' && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
            {project.permits.length === 0 ? (
              <div className="text-slate-500 text-center py-8 text-sm">No permits tracked</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#2d3748]">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Expires</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Inspection</th>
                </tr></thead>
                <tbody>
                  {project.permits.map(p => (
                    <tr key={p.id} className="border-b border-[#2d3748] last:border-0">
                      <td className="px-4 py-3 text-slate-200">{p.type}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{p.status.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3 text-slate-400">{p.expiresDate ? new Date(p.expiresDate).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{p.inspectionDate ? new Date(p.inspectionDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
            {project.invoices.length === 0 ? (
              <div className="text-slate-500 text-center py-8 text-sm">No invoices yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#2d3748]">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Total</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Due</th>
                </tr></thead>
                <tbody>
                  {project.invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-[#2d3748] last:border-0">
                      <td className="px-4 py-3 text-slate-200 font-medium">${Number(inv.total).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${inv.status === 'PAID' ? 'bg-green-900/40 text-green-400' : inv.status === 'OVERDUE' ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-300'}`}>{inv.status}</span></td>
                      <td className="px-4 py-3 text-slate-400">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
