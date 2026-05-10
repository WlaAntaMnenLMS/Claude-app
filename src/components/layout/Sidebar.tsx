import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, FileText, Award, BookOpen,
  Package, Bot, MessageSquare, Settings, LogOut, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const nav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/instructors',   icon: Users,            label: 'Instructors' },
  { to: '/demos',         icon: Calendar,         label: 'Demo Sessions' },
  { to: '/proposals',     icon: FileText,         label: 'Proposals' },
  { to: '/certificates',  icon: Award,            label: 'Certificates' },
  { to: '/transcripts',   icon: BookOpen,         label: 'Transcripts' },
  { to: '/doxx',          icon: Package,          label: 'Doxx Orders' },
  { to: '/communication', icon: MessageSquare,    label: 'Communication' },
]

export default function Sidebar() {
  const { user, signOut } = useAuthStore()

  return (
    <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">L&D Assistant</p>
            <p className="text-xs text-gray-500 mt-0.5">Trainnovation</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {/* JARVIS Agent */}
        <NavLink
          to="/agent"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mt-2 ${
              isActive
                ? 'bg-amber-500/20 text-amber-400 font-medium'
                : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10'
            }`
          }
        >
          <Zap size={16} className="text-amber-500" />
          JARVIS
        </NavLink>
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`
          }
        >
          <Settings size={16} />
          Settings
        </NavLink>

        {/* User info */}
        <div className="px-3 py-2 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
