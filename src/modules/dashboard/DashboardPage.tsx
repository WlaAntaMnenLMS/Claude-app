import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Calendar, FileText, Award, TrendingUp, Clock } from 'lucide-react'
import { getDashboardStats, demos, type DemoSession } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { formatDateTime } from '@/lib/utils'

interface Stats {
  totalInstructors: number
  activeInstructors: number
  demosThisWeek: number
  upcomingDemos: number
  totalProposals: number
  draftProposals: number
  certsThisWeek: number
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcoming, setUpcoming] = useState<DemoSession[]>([])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  useEffect(() => {
    getDashboardStats().then(setStats)
    demos.list().then(all => {
      const now = new Date()
      setUpcoming(
        all
          .filter(d => d.status === 'scheduled' && new Date(d.scheduled_at) >= now)
          .slice(0, 5)
      )
    })
  }, [])

  const statCards = stats ? [
    { label: 'Total Instructors', value: stats.totalInstructors, sub: `${stats.activeInstructors} active`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', to: '/instructors' },
    { label: 'Demos This Week', value: stats.demosThisWeek, sub: `${stats.upcomingDemos} upcoming`, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10', to: '/demos' },
    { label: 'Proposals', value: stats.totalProposals, sub: `${stats.draftProposals} drafts`, icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10', to: '/proposals' },
    { label: 'Certs This Week', value: stats.certsThisWeek, sub: 'generated', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10', to: '/certificates' },
  ] : []

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-gray-400 mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition group"
          >
            <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
              <card.icon size={18} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm font-medium text-gray-300 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
          </Link>
        ))}
        {!stats && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-gray-800 mb-3" />
            <div className="h-7 w-12 bg-gray-800 rounded mb-1" />
            <div className="h-4 w-24 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Upcoming Demos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-purple-400" />
            <h2 className="font-semibold text-white">Upcoming Demos</h2>
          </div>
          <Link to="/demos" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No upcoming demos scheduled</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {d.instructors?.full_name ?? 'Unknown Instructor'}
                  </p>
                  <p className="text-xs text-gray-500">{d.topic}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-300">{formatDateTime(d.scheduled_at)}</p>
                  <p className="text-xs text-gray-500">{d.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <TrendingUp size={12} /> Quick Actions
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ Add Instructor', to: '/instructors' },
            { label: '+ Schedule Demo', to: '/demos' },
            { label: '+ New Proposal', to: '/proposals' },
            { label: '⚡ Ask JARVIS', to: '/agent' },
          ].map(a => (
            <Link
              key={a.label}
              to={a.to}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition border border-gray-700"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
