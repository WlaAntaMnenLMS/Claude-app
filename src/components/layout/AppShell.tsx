import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from '@/components/shared/GlobalSearch'

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <GlobalSearch />
    </div>
  )
}
