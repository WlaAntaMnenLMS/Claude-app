import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Save, LogOut, User, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { user, signOut, isManager } = useAuthStore()
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') ?? '')
  const [saved, setSaved] = useState(false)

  // Invite new user (manager only)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'specialist' | 'manager'>('specialist')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const saveApiKey = () => {
    localStorage.setItem('claude_api_key', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMsg('')
    try {
      const { error } = await supabase.auth.admin.createUser({
        email: inviteEmail,
        password: invitePassword,
        user_metadata: { name: inviteName, role: inviteRole },
        email_confirm: true,
      })
      if (error) throw error
      setInviteMsg(`✓ Account created for ${inviteEmail}`)
      setInviteEmail('')
      setInvitePassword('')
      setInviteName('')
    } catch (err) {
      setInviteMsg('✗ ' + (err instanceof Error ? err.message : 'Failed to create user'))
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-blue-400" />
          <h2 className="font-semibold text-white">Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-lg font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-white font-medium">{user?.name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Claude API Key */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-amber-400" />
          <h2 className="font-semibold text-white">JARVIS — Claude API Key</h2>
        </div>
        <p className="text-sm text-gray-400 mb-3">
          Enter your Anthropic API key to enable the JARVIS AI assistant. The key is stored locally in your browser.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-…"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={saveApiKey}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">console.anthropic.com</a>
        </p>
      </div>

      {/* Team Management (manager only) */}
      {isManager() && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-green-400" />
            <h2 className="font-semibold text-white">Create Team Account</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Create a Supabase account for a new team member. They can then log in at this URL.
          </p>
          <form onSubmit={createUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                <input required value={inviteName} onChange={e => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'specialist' | 'manager')}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                  <option value="specialist">Specialist</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email *</label>
              <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Initial Password *</label>
              <input required type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
            </div>
            {inviteMsg && (
              <p className={`text-sm ${inviteMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{inviteMsg}</p>
            )}
            <button type="submit" disabled={inviteLoading}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
              {inviteLoading ? 'Creating…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-xs text-blue-300">
              <strong>Share this URL with your team:</strong><br />
              <span className="font-mono text-blue-400">{window.location.origin}</span>
            </p>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-sm font-medium rounded-lg transition"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
