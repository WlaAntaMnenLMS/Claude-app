import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Award,
  BookOpen,
  Package,
  Bot,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/instructors',  icon: Users,            label: 'Instructors' },
  { to: '/demos',        icon: CalendarDays,     label: 'Demo Sessions' },
  { to: '/proposals',    icon: FileText,         label: 'Proposals' },
  { to: '/certificates', icon: Award,            label: 'Certificates' },
  { to: '/transcripts',  icon: BookOpen,         label: 'Transcripts' },
  { to: '/doxx',         icon: Package,          label: 'Doxx Orders' },
  { to: '/agent',        icon: Bot,              label: 'JARVIS Agent' },
]

interface Props {
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ open, onToggle }: Props) {
  return (
    <aside className={cn(
      'flex flex-col bg-card border-r border-border transition-all duration-200 shrink-0',
      open ? 'w-56' : 'w-16'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-2 h-14 px-4 border-b border-border',
        !open && 'justify-center px-0'
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        {open && (
          <div>
            <p className="text-sm font-semibold leading-none">L&D Assistant</p>
            <p className="text-xs text-muted-foreground">Trainnovation</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              !open && 'justify-center px-0'
            )}
            title={!open ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title={open ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  )
}
