'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'

interface StatsData {
  activeProjects: number
  pendingApprovals: number
  overdueInvoices: number
  scheduledThisWeek: number
}

interface ApprovalItem {
  id: string
  title: string
  agentType: string
  priority: string
  actionType: string
  createdAt: string
  project?: { name: string }
}

interface ActivityItem {
  id: string
  action: string
  agentType?: string
  actorType: string
  createdAt: string
  project?: { name: string }
}

const priorityColors: Record<string, string> = {
  URGENT: 'text-red-400 bg-red-900/30 border-red-700',
  HIGH: 'text-orange-400 bg-orange-900/30 border-orange-700',
  NORMAL: 'text-blue-400 bg-blue-900/30 border-blue-700',
  LOW: 'text-slate-400 bg-slate-800 border-slate-600',
}

const agentColors: Record<string, string> = {
  LEAD: 'bg-purple-900/40 text-purple-300',
  PROJECT_TRACKER: 'bg-blue-900/40 text-blue-300',
  LIAISON: 'bg-green-900/40 text-green-300',
  SCHEDULING: 'bg-yellow-900/40 text-yellow-300',
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="block bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 hover:border-orange-500/50 transition-colors">
      <div className={`text-3xl font-bold mb-1 ${color}`}>{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </Link>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData>({ activeProjects: 0, pendingApprovals: 0, overdueInvoices: 0, scheduledThisWeek: 0 })
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentMsg, setAgentMsg] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [approvalRes, activityRes, projectsRes, invoicesRes, scheduleRes] = await Promise.all([
      fetch('/api/approvals?status=PENDING&limit=5'),
      fetch('/api/activity?limit=10'),
      fetch('/api/projects?status=ACTIVE'),
      fetch('/api/billing/invoices?status=OVERDUE'),
      fetch(`/api/schedule?startDate=${new Date().toISOString()}&endDate=${new Date(Date.now() + 7 * 864e5).toISOString()}`),
    ])

    const [approvalsData, activityData, projectsData, invoicesData, scheduleData] = await Promise.all([
      approvalRes.json(),
      activityRes.json(),
      projectsRes.json(),
      invoicesRes.json(),
      scheduleRes.json(),
    ])

    setApprovals(Array.isArray(approvalsData) ? approvalsData : [])
    setActivity(Array.isArray(activityData) ? activityData : [])
    setStats({
      activeProjects: Array.isArray(projectsData) ? projectsData.length : 0,
      pendingApprovals: Array.isArray(approvalsData) ? approvalsData.length : 0,
      overdueInvoices: Array.isArray(invoicesData) ? invoicesData.length : 0,
      scheduledThisWeek: Array.isArray(scheduleData) ? scheduleData.length : 0,
    })
  }

  async function runAgentCycle() {
    setAgentRunning(true)
    setAgentMsg('')
    try {
      const res = await fetch('/api/agents/lead/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      setAgentMsg(data.results?.lead?.summary?.slice(0, 200) || 'Cycle complete')
      fetchData()
    } catch {
      setAgentMsg('Agent cycle failed')
    }
    setAgentRunning(false)
  }

  async function handleApproval(id: string, status: 'APPROVED' | 'REJECTED') {
    await fetch(`/api/approvals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Operations Overview</h1>
            <p className="text-slate-400 text-sm mt-0.5">AI agent status and business snapshot</p>
          </div>
          <button
            onClick={runAgentCycle}
            disabled={agentRunning}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {agentRunning ? (
              <>
                <span className="animate-spin">⟳</span> Running Agents...
              </>
            ) : (
              '⟳ Run Agent Cycle'
            )}
          </button>
        </div>

        {agentMsg && (
          <div className="mb-4 bg-blue-900/30 border border-blue-700 rounded-lg px-4 py-3 text-blue-300 text-sm">
            <strong>Agent summary:</strong> {agentMsg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Projects" value={stats.activeProjects} color="text-blue-400" href="/projects" />
          <StatCard label="Pending Approvals" value={stats.pendingApprovals} color="text-orange-400" href="/approvals" />
          <StatCard label="Overdue Invoices" value={stats.overdueInvoices} color="text-red-400" href="/billing" />
          <StatCard label="Work This Week" value={stats.scheduledThisWeek} color="text-green-400" href="/schedule" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Pending Approvals */}
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200">Pending Approvals</h2>
              <Link href="/approvals" className="text-xs text-orange-400 hover:text-orange-300">View all</Link>
            </div>
            {approvals.length === 0 ? (
              <div className="text-slate-500 text-sm py-4 text-center">No pending approvals</div>
            ) : (
              <div className="space-y-3">
                {approvals.map((a) => (
                  <div key={a.id} className={`border rounded-lg px-3 py-2.5 ${priorityColors[a.priority]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{a.title}</div>
                        {a.project && (
                          <div className="text-xs opacity-70 truncate">{a.project.name}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${agentColors[a.agentType] || 'bg-slate-800 text-slate-400'}`}>
                            {a.agentType.replace('_', ' ')}
                          </span>
                          <span className="text-xs opacity-60">{a.actionType.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleApproval(a.id, 'APPROVED')}
                          className="text-xs bg-green-700 hover:bg-green-600 text-white px-2.5 py-1 rounded transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(a.id, 'REJECTED')}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200">Activity Feed</h2>
              <Link href="/activity" className="text-xs text-orange-400 hover:text-orange-300">View all</Link>
            </div>
            {activity.length === 0 ? (
              <div className="text-slate-500 text-sm py-4 text-center">No recent activity</div>
            ) : (
              <div className="space-y-2">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-[#2d3748] last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.agentType ? 'bg-orange-400' : 'bg-slate-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-300 leading-tight">{a.action}</div>
                      {a.project && (
                        <div className="text-xs text-slate-500 mt-0.5">{a.project.name}</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex-shrink-0">
                      {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
