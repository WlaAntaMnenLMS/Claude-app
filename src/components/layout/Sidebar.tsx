import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, CalendarDays, FileText, Award,
  BookOpen, Package, Bot, ChevronLeft, ChevronRight, Zap,
  MessageSquare, Settings, Search, LogOut, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

interface Props {
  open: boolean
  onToggle: () => void
  onSearchOpen: () => void
}

export default function Sidebar({ open, onToggle, onSearchOpen }: Props) {
  const { user, setUser, isManager } = useAuthStore()

  const NAV = [
    { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard',     managerOnly: false },
    { to: '/instructors',    icon: Users,            label: 'Instructors',   managerOnly: false },
    { to: '/demos',          icon: CalendarDays,     label: 'Demo Sessions', managerOnly: false },
    { to: '/proposals',      icon: FileText,         label: 'Proposals',     managerOnly: false },
    { to: '/certificates',   icon: Award,            label: 'Certificates',  managerOnly: true },
    { to: '/transcripts',    icon: BookOpen,         label: 'Transcripts',   managerOnly: true },
    { to: '/doxx',           icon: Package,          label: 'Doxx Orders',   managerOnly: true },
    { to: '/communications', icon: MessageSquare,    label: 'Messages',      managerOnly: false },
    { to: '/agent',          icon: Bot,              label: 'JARVIS Agent',  managerOnly: false },
  ].filter(item => !item.managerOnly || isManager())

  const BOTTOM_NAV = [
    ...(isManager() ? [{ to: '/users', icon: ShieldCheck, label: 'Users' }] : []),
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside className={cn(
      'flex flex-col bg-card border-r border-border transition-all duration-200 shrink-0',
      open ? 'w-56' : 'w-16'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-2 h-14 px-4 border-b border-border', !open && 'justify-center px-0')}>
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

      {/* Search button */}
      <div className="px-2 py-2 border-b border-border">
        <button
          onClick={onSearchOpen}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            !open && 'justify-center'
          )}
          title="Search (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          {open && (
            <span className="flex-1 flex items-center justify-between">
              <span>Search…</span>
              <kbd className="text-[10px] px-1 py-0.5 rounded bg-muted">⌃K</kbd>
            </span>
          )}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
              isActive ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              !open && 'justify-center px-0'
            )}
            title={!open ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-2 border-t border-border space-y-0.5">
        {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
              isActive ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              !open && 'justify-center px-0'
            )}
            title={!open ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* User info + logout */}
      <div className={cn('flex items-center gap-2 px-3 py-3 border-t border-border', !open && 'justify-center px-0 py-3')}>
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        {open && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
          </div>
        )}
        {open && (
          <button onClick={() => setUser(null)} className="text-muted-foreground hover:text-red-400 transition-colors" title="Sign out">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-9 border-t border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title={open ? 'Collapse' : 'Expand'}
      >
        {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  )
}
