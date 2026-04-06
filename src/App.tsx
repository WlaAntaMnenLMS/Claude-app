import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './modules/dashboard/DashboardPage'
import InstructorPage from './modules/instructor/InstructorPage'
import DemoPage from './modules/demo/DemoPage'
import ProposalPage from './modules/proposal/ProposalPage'
import CertificatePage from './modules/certificate/CertificatePage'
import TranscriptPage from './modules/transcript/TranscriptPage'
import DoxxPage from './modules/doxx/DoxxPage'
import AgentPage from './modules/agent/AgentPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/instructors" element={<InstructorPage />} />
        <Route path="/demos" element={<DemoPage />} />
        <Route path="/proposals" element={<ProposalPage />} />
        <Route path="/certificates" element={<CertificatePage />} />
        <Route path="/transcripts" element={<TranscriptPage />} />
        <Route path="/doxx" element={<DoxxPage />} />
        <Route path="/agent" element={<AgentPage />} />
      </Routes>
    </AppShell>
  )
}
