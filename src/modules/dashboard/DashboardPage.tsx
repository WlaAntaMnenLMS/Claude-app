import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CalendarDays, FileText, Award, BookOpen, Package, TrendingUp, Clock } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ instructors: 0, demos: 0, proposals: 0, certificates: 0 })
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [recentInstructors, setRecentInstructors] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [instructors, demos, proposals, certs, upcomingDemos] = await Promise.all([
        api.instructor.list(),
        api.demo.list(),
        api.proposal.list(),
        api.certificate.list(),
        api.demo.getUpcoming(),
      ])
      setStats({
        instructors: instructors.length,
        demos: demos.length,
        proposals: proposals.length,
        certificates: certs.length,
      })
      setUpcoming(upcomingDemos.slice(0, 5))
      setRecentInstructors(instructors.slice(0, 5))
    }
    load()
  }, [])

  const cards = [
    { label: 'Instructors',   value: stats.instructors,  icon: Users,        route: '/instructors',  color: 'text-blue-400' },
    { label: 'Demo Sessions', value: stats.demos,        icon: CalendarDays, route: '/demos',        color: 'text-yellow-400' },
    { label: 'Proposals',     value: stats.proposals,    icon: FileText,     route: '/proposals',    color: 'text-purple-400' },
    { label: 'Certificates',  value: stats.certificates, icon: Award,        route: '/certificates', color: 'text-green-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Good morning, Ahmed</h1>
        <p className="text-muted-foreground mt-0.5">Here's what's happening at Trainnovation today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, route, color }) => (
          <button
            key={label}
            onClick={() => navigate(route)}
            className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/50 hover:bg-accent transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming demos */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h2 className="font-semibold text-sm">Upcoming Demos (7 days)</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No upcoming demos</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((demo) => (
                <div key={demo.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                  <div>
                    <p className="text-sm font-medium">{demo.instructor_name}</p>
                    <p className="text-xs text-muted-foreground">{demo.topic || 'No topic'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatDateTime(demo.scheduled_at)}</p>
                    <StatusBadge status={demo.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/demos')}
            className="mt-3 w-full text-xs text-primary hover:underline"
          >
            View all demos →
          </button>
        </div>

        {/* Recent instructors */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-sm">Recent Instructors</h2>
          </div>
          {recentInstructors.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No instructors yet</p>
          ) : (
            <div className="space-y-2">
              {recentInstructors.map((inst) => (
                <div key={inst.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                  <div>
                    <p className="text-sm font-medium">{inst.full_name}</p>
                    <p className="text-xs text-muted-foreground">{inst.specialization || 'No specialization'}</p>
                  </div>
                  <StatusBadge status={inst.status} />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/instructors')}
            className="mt-3 w-full text-xs text-primary hover:underline"
          >
            View all instructors →
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ Add Instructor', route: '/instructors', icon: Users },
            { label: '+ Schedule Demo', route: '/demos', icon: CalendarDays },
            { label: '+ New Proposal', route: '/proposals', icon: FileText },
            { label: '+ Fill Certificates', route: '/certificates', icon: Award },
            { label: '+ Fill Transcript', route: '/transcripts', icon: BookOpen },
            { label: '+ Doxx Order', route: '/doxx', icon: Package },
          ].map(({ label, route, icon: Icon }) => (
            <button
              key={label}
              onClick={() => navigate(route)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg text-xs transition-colors"
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
