import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/modules/auth/LoginPage'
import DashboardPage from '@/modules/dashboard/DashboardPage'
import InstructorPage from '@/modules/instructor/InstructorPage'
import DemoPage from '@/modules/demo/DemoPage'
import ProposalPage from '@/modules/proposal/ProposalPage'
import CertificatePage from '@/modules/certificate/CertificatePage'
import TranscriptPage from '@/modules/transcript/TranscriptPage'
import DoxxPage from '@/modules/doxx/DoxxPage'
import AgentPage from '@/modules/agent/AgentPage'
import CommunicationPage from '@/modules/communication/CommunicationPage'
import SettingsPage from '@/modules/settings/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default function App() {
  const loadSession = useAuthStore(s => s.loadSession)

  useEffect(() => {
    loadSession()
  }, [loadSession])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="instructors"  element={<InstructorPage />} />
        <Route path="demos"        element={<DemoPage />} />
        <Route path="proposals"    element={<ProposalPage />} />
        <Route path="certificates" element={<CertificatePage />} />
        <Route path="transcripts"  element={<TranscriptPage />} />
        <Route path="doxx"         element={<DoxxPage />} />
        <Route path="agent"        element={<AgentPage />} />
        <Route path="communication" element={<CommunicationPage />} />
        <Route path="settings"     element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
