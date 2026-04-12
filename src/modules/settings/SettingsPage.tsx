import { useState, useEffect } from 'react'
import { Server, Wifi, WifiOff, Copy, Check, RefreshCw, Settings, Users } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

export default function SettingsPage() {
  const { user, isManager } = useAuthStore()
  const [settings, setSettings] = useState({ mode: 'local', server_port: 4765, server_pin: '', server_host: '' })
  const [serverRunning, setServerRunning] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const s = await (window as any).api.network.getSettings()
    if (s) setSettings({ mode: s.mode, server_port: s.server_port, server_pin: s.server_pin || '', server_host: s.server_host || '' })
    const running = await (window as any).api.network.isRunning()
    setServerRunning(running)
  }

  async function handleSave() {
    await (window as any).api.network.saveSettings(settings)
    setMsg('Settings saved')
    setTimeout(() => setMsg(''), 2000)
  }

  async function handleStartServer() {
    if (!settings.server_pin || settings.server_pin.length < 4) { setMsg('PIN must be at least 4 characters'); return }
    setLoading(true)
    const res = await (window as any).api.network.startServer(settings.server_port, settings.server_pin)
    setLoading(false)
    if (res.success) { setServerRunning(true); setServerUrl(res.url); setMsg('Server started — share the URL and PIN with your colleague') }
    else setMsg(`Error: ${res.error}`)
  }

  async function handleStopServer() {
    await (window as any).api.network.stopServer()
    setServerRunning(false)
    setServerUrl('')
  }

  function copyUrl() {
    navigator.clipboard.writeText(`${serverUrl} | PIN: ${settings.server_pin}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Network sharing and app configuration</p>
      </div>

      {/* Network sharing */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold">Network Sharing</h2>
            <p className="text-xs text-muted-foreground">Share your data with colleagues on the same network</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'local', label: 'Local Only', desc: 'Data stays on this PC', icon: WifiOff },
              { value: 'server', label: 'Server Mode', desc: 'Share with colleagues', icon: Wifi },
            ].map(({ value, label, desc, icon: Icon }) => (
              <button key={value} onClick={() => setSettings(s => ({ ...s, mode: value }))}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${settings.mode === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${settings.mode === value ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-medium ${settings.mode === value ? 'text-primary' : ''}`}>{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {settings.mode === 'server' && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">Port</label>
                <input type="number" value={settings.server_port}
                  onChange={e => setSettings(s => ({ ...s, server_port: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Server PIN (share with colleague)</label>
                <input type="text" value={settings.server_pin} maxLength={8}
                  onChange={e => setSettings(s => ({ ...s, server_pin: e.target.value }))}
                  placeholder="e.g. TRAIN2025"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {!serverRunning ? (
              <button onClick={handleStartServer} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                Start Sharing
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium text-green-400">Server running</span>
                  {serverUrl && <span className="text-xs text-muted-foreground ml-auto truncate">{serverUrl}</span>}
                  <button onClick={copyUrl} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your colleague should enter this IP and PIN in their app Settings → Connect to Server.
                </p>
                <button onClick={handleStopServer} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                  <WifiOff className="w-4 h-4" /> Stop Sharing
                </button>
              </div>
            )}
          </div>
        )}

        {settings.mode === 'local' && (
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Connect to a colleague's shared server:</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">Server IP Address</label>
                <input type="text" value={settings.server_host}
                  onChange={e => setSettings(s => ({ ...s, server_host: e.target.value }))}
                  placeholder="192.168.1.10"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Port</label>
                <input type="number" value={settings.server_port}
                  onChange={e => setSettings(s => ({ ...s, server_port: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            {settings.server_host && (
              <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                Connected to: <span className="font-mono text-blue-400">{settings.server_host}:{settings.server_port}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            Save Settings
          </button>
          {msg && <p className="text-sm text-green-400">{msg}</p>}
        </div>
      </div>

      {/* Current user */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Signed In As</h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${user?.role === 'manager' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {user?.role === 'manager' ? 'Manager' : 'Specialist'}
          </span>
        </div>
      </div>
    </div>
  )
}
