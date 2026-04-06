import { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'
import AgentFloat from '../shared/AgentFloat'

interface Props { children: ReactNode }

export default function AppShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>

      {/* Floating JARVIS button */}
      <AgentFloat />
    </div>
  )
}
