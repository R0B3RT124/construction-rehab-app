'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Invoice {
  id: string; total: number; subtotal: number; tax?: number; status: string
  billingModel: string; dueDate?: string; issuedDate?: string; paidDate?: string
  qbInvoiceNumber?: string; notes?: string; lineItems: Array<{ description: string; qty: number; rate: number; amount: number }>
  project: { name: string; address: string; customer: { name: string } }
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-800 text-slate-300', PENDING_APPROVAL: 'bg-orange-900/40 text-orange-300',
  APPROVED: 'bg-blue-900/40 text-blue-300', SENT: 'bg-purple-900/40 text-purple-300',
  PAID: 'bg-green-900/40 text-green-300', PARTIAL: 'bg-yellow-900/40 text-yellow-300',
  OVERDUE: 'bg-red-900/40 text-red-400', VOID: 'bg-slate-800 text-slate-500',
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isQbConnected, setIsQbConnected] = useState(false)

  useEffect(() => {
    const url = statusFilter ? `/api/billing/invoices?status=${statusFilter}` : '/api/billing/invoices'
    fetch(url).then(r => r.json()).then(d => setInvoices(Array.isArray(d) ? d : []))
  }, [statusFilter])

  async function pushToQb(id: string) {
    const res = await fetch(`/api/billing/invoices/${id}?action=push-to-qb`, { method: 'POST' })
    if (res.ok) {
      const data = await fetch('/api/billing/invoices').then(r => r.json())
      setInvoices(Array.isArray(data) ? data : [])
    }
  }

  const totalOutstanding = invoices.filter(i => ['SENT', 'OVERDUE', 'PARTIAL'].includes(i.status)).reduce((s, i) => s + Number(i.total), 0)
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.total), 0)

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Billing & Invoices</h1>
          <a href="/api/billing/qb-auth" className="text-xs text-slate-400 hover:text-slate-200 border border-[#2d3748] px-3 py-1.5 rounded-lg transition-colors">
            Connect QuickBooks
          </a>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-400">${totalOutstanding.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">Outstanding</div>
          </div>
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">${totalPaid.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total Paid</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PAID', 'OVERDUE'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-[#1a1f2e] text-slate-400 border border-[#2d3748] hover:text-slate-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1f2e] border border-[#2d3748] rounded-xl text-slate-500">No invoices found</div>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <div key={inv.id} className={`bg-[#1a1f2e] border rounded-xl overflow-hidden ${inv.status === 'OVERDUE' ? 'border-red-700/60' : 'border-[#2d3748]'}`}>
                <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200">${Number(inv.total).toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[inv.status]}`}>{inv.status}</span>
                        {inv.qbInvoiceNumber && <span className="text-xs text-slate-500">QB #{inv.qbInvoiceNumber}</span>}
                      </div>
                      <div className="text-sm text-slate-400 mt-0.5">{inv.project.name} — {inv.project.customer.name}</div>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1">
                        <span>{inv.billingModel.replace(/_/g, ' ')}</span>
                        {inv.dueDate && <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>}
                        {inv.issuedDate && <span>Issued: {new Date(inv.issuedDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    {inv.status === 'APPROVED' && (
                      <button onClick={(e) => { e.stopPropagation(); pushToQb(inv.id) }}
                        className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
                        Push to QB
                      </button>
                    )}
                  </div>
                </div>
                {expanded === inv.id && (
                  <div className="border-t border-[#2d3748] px-4 py-3 bg-[#0f1117]">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-[#2d3748]">
                        <th className="text-left py-1.5 text-slate-500 font-medium">Description</th>
                        <th className="text-right py-1.5 text-slate-500 font-medium">Qty</th>
                        <th className="text-right py-1.5 text-slate-500 font-medium">Rate</th>
                        <th className="text-right py-1.5 text-slate-500 font-medium">Amount</th>
                      </tr></thead>
                      <tbody>
                        {inv.lineItems.map((li, i) => (
                          <tr key={i} className="border-b border-[#2d3748] last:border-0">
                            <td className="py-2 text-slate-300">{li.description}</td>
                            <td className="py-2 text-right text-slate-400">{li.qty}</td>
                            <td className="py-2 text-right text-slate-400">${li.rate.toLocaleString()}</td>
                            <td className="py-2 text-right text-slate-200 font-medium">${li.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end gap-6 text-xs mt-2 pt-2 border-t border-[#2d3748]">
                      <span className="text-slate-500">Subtotal: ${Number(inv.subtotal).toLocaleString()}</span>
                      {inv.tax && <span className="text-slate-500">Tax: ${Number(inv.tax).toLocaleString()}</span>}
                      <span className="text-slate-200 font-semibold">Total: ${Number(inv.total).toLocaleString()}</span>
                    </div>
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
