import { ReactNode, useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import AgentFloat from '../shared/AgentFloat'
import GlobalSearch from '../shared/GlobalSearch'

interface Props { children: ReactNode }

export default function AppShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)

  // Ctrl+K / Cmd+K opens global search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>

      <AgentFloat />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
