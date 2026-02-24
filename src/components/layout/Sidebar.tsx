'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '▦' },
  { href: '/projects', label: 'Projects', icon: '🏗' },
  { href: '/approvals', label: 'Approvals', icon: '✓' },
  { href: '/schedule', label: 'Schedule', icon: '📅' },
  { href: '/communications', label: 'Communications', icon: '💬' },
  { href: '/calls', label: 'Call Logs', icon: '📞' },
  { href: '/billing', label: 'Billing', icon: '💰' },
  { href: '/activity', label: 'Activity Feed', icon: '⚡' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-[#1a1f2e] border-r border-[#2d3748] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2d3748]">
        <div className="text-xl font-bold text-orange-500">RehabOps</div>
        <div className="text-xs text-slate-500 mt-0.5">Construction Management</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && (pathname ?? '').startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: sign out */}
      <div className="p-4 border-t border-[#2d3748]">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left text-sm text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
