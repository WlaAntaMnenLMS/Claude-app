import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import LoginPage from './modules/auth/LoginPage'
import Dashboard from './modules/dashboard/DashboardPage'
import InstructorPage from './modules/instructor/InstructorPage'
import DemoPage from './modules/demo/DemoPage'
import ProposalPage from './modules/proposal/ProposalPage'
import CertificatePage from './modules/certificate/CertificatePage'
import TranscriptPage from './modules/transcript/TranscriptPage'
import DoxxPage from './modules/doxx/DoxxPage'
import AgentPage from './modules/agent/AgentPage'
import CommunicationPage from './modules/communication/CommunicationPage'
import UserManagementPage from './modules/auth/UserManagementPage'
import SettingsPage from './modules/settings/SettingsPage'
import { useAuthStore } from './store/auth.store'

export default function App() {
  const user = useAuthStore(s => s.user)

  // Persist session across refreshes in dev
  useEffect(() => {
    const saved = sessionStorage.getItem('ld_user')
    if (saved && !user) {
      try { useAuthStore.getState().setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  useEffect(() => {
    if (user) sessionStorage.setItem('ld_user', JSON.stringify(user))
    else sessionStorage.removeItem('ld_user')
  }, [user])

  if (!user) return <LoginPage />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/instructors"    element={<InstructorPage />} />
        <Route path="/demos"          element={<DemoPage />} />
        <Route path="/proposals"      element={<ProposalPage />} />
        <Route path="/certificates"   element={<CertificatePage />} />
        <Route path="/transcripts"    element={<TranscriptPage />} />
        <Route path="/doxx"           element={<DoxxPage />} />
        <Route path="/agent"          element={<AgentPage />} />
        <Route path="/communications" element={<CommunicationPage />} />
        <Route path="/settings"       element={<SettingsPage />} />
        {user.role === 'manager' && (
          <Route path="/users" element={<UserManagementPage />} />
        )}
      </Routes>
    </AppShell>
  )
}
