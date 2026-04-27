import { useState, useEffect } from 'react'
import {
  Server, Wifi, WifiOff, Copy, Check, RefreshCw, Users,
  FolderOpen, CalendarDays, Building2, Save, Cpu,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const DEFAULTS_KEY = 'ld_company_defaults'

interface CompanyDefaults {
  vendor_name: string
  sender_name: string
  sender_title: string
  sender_email: string
}

function loadDefaults(): CompanyDefaults {
  try { return JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}') } catch { return {} as CompanyDefaults }
}

const EXPORT_KEY = 'ld_export_folder'
const DRIVE_SYNC_KEY = 'ld_drive_sync'
const RBC_PATH_KEY = 'ld_rbc_exe_path'

export default function SettingsPage() {
  const { user, isManager } = useAuthStore()

  // ── Network ──────────────────────────────────────────────────────────────────
  const [net, setNet] = useState({ mode: 'local', server_port: 4765, server_pin: '', server_host: '' })
  const [serverRunning, setServerRunning] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [netLoading, setNetLoading] = useState(false)
  const [netMsg, setNetMsg] = useState('')

  // ── Export folder ─────────────────────────────────────────────────────────────
  const [exportFolder, setExportFolder] = useState(localStorage.getItem(EXPORT_KEY) || '')
  const [driveSync, setDriveSync] = useState(localStorage.getItem(DRIVE_SYNC_KEY) === 'true')
  const [folderSaved, setFolderSaved] = useState(false)

  // ── RBC Generator path ────────────────────────────────────────────────────────
  const [rbcPath, setRbcPath] = useState(localStorage.getItem(RBC_PATH_KEY) || 'E:\\Certificates\\RBC Generator.exe')
  const [rbcSaved, setRbcSaved] = useState(false)

  // ── Company defaults ──────────────────────────────────────────────────────────
  const [defaults, setDefaults] = useState<CompanyDefaults>({
    vendor_name: 'Trainnovation',
    sender_name: '',
    sender_title: '',
    sender_email: '',
    ...loadDefaults(),
  })
  const [defaultsSaved, setDefaultsSaved] = useState(false)

  useEffect(() => { loadNet() }, [])

  async function loadNet() {
    const s = await (window as any).api.network.getSettings()
    if (s) setNet({ mode: s.mode, server_port: s.server_port, server_pin: s.server_pin || '', server_host: s.server_host || '' })
    const running = await (window as any).api.network.isRunning()
    setServerRunning(running)
  }

  async function saveNet() {
    await (window as any).api.network.saveSettings(net)
    flash(setNetMsg, 'Settings saved')
  }

  async function startServer() {
    if (!net.server_pin || net.server_pin.length < 4) { flash(setNetMsg, 'PIN must be at least 4 characters'); return }
    setNetLoading(true)
    const res = await (window as any).api.network.startServer(net.server_port, net.server_pin)
    setNetLoading(false)
    if (res.success) { setServerRunning(true); setServerUrl(res.url); flash(setNetMsg, 'Server started — share the URL and PIN with colleagues') }
    else flash(setNetMsg, `Error: ${res.error}`)
  }

  async function stopServer() {
    await (window as any).api.network.stopServer()
    setServerRunning(false); setServerUrl('')
  }

  function copyUrl() {
    navigator.clipboard.writeText(`${serverUrl} | PIN: ${net.server_pin}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function saveFolder() {
    localStorage.setItem(EXPORT_KEY, exportFolder)
    localStorage.setItem(DRIVE_SYNC_KEY, String(driveSync))
    setFolderSaved(true); setTimeout(() => setFolderSaved(false), 2000)
  }

  function toggleDriveSync() {
    const next = !driveSync
    setDriveSync(next)
    localStorage.setItem(DRIVE_SYNC_KEY, String(next))
  }

  function saveDefaults() {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults))
    setDefaultsSaved(true); setTimeout(() => setDefaultsSaved(false), 2000)
  }

  function saveRbc() {
    localStorage.setItem(RBC_PATH_KEY, rbcPath)
    setRbcSaved(true); setTimeout(() => setRbcSaved(false), 2000)
  }

  function flash(setter: (v: string) => void, msg: string) {
    setter(msg); setTimeout(() => setter(''), 2500)
  }

  const input = 'w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const label = 'block text-xs font-medium mb-1.5 text-muted-foreground'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Network, exports, and company configuration</p>
      </div>

      {/* ── Network Sharing ──────────────────────────────────────────────────── */}
      <Section icon={<Server className="w-5 h-5 text-blue-400" />} bg="bg-blue-500/10"
        title="Network Sharing" sub="Share your data with colleagues on the same network">
        <div className="space-y-1">
          <p className={label.replace('mb-1.5', 'mb-2') + ' uppercase tracking-wide'}>Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'local', label: 'Local Only', desc: 'Data stays on this PC', icon: WifiOff },
              { value: 'server', label: 'Server Mode', desc: 'Share with colleagues', icon: Wifi },
            ].map(({ value, label: lbl, desc, icon: Icon }) => (
              <button key={value} onClick={() => setNet(s => ({ ...s, mode: value }))}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${net.mode === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${net.mode === value ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-medium ${net.mode === value ? 'text-primary' : ''}`}>{lbl}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {net.mode === 'server' && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Port</label>
                <input type="number" value={net.server_port}
                  onChange={e => setNet(s => ({ ...s, server_port: Number(e.target.value) }))}
                  className={input} />
              </div>
              <div>
                <label className={label}>PIN (share with colleagues)</label>
                <input type="text" value={net.server_pin} maxLength={8}
                  onChange={e => setNet(s => ({ ...s, server_pin: e.target.value }))}
                  placeholder="e.g. TRAIN2025" className={input} />
              </div>
            </div>
            {!serverRunning ? (
              <button onClick={startServer} disabled={netLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {netLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
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
                <p className="text-xs text-muted-foreground">Share this URL + PIN with your colleague so they can connect.</p>
                <button onClick={stopServer}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                  <WifiOff className="w-4 h-4" /> Stop Sharing
                </button>
              </div>
            )}
          </div>
        )}

        {net.mode === 'local' && (
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Connect to a colleague's shared server:</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Server IP Address</label>
                <input type="text" value={net.server_host}
                  onChange={e => setNet(s => ({ ...s, server_host: e.target.value }))}
                  placeholder="192.168.1.10" className={input} />
              </div>
              <div>
                <label className={label}>Port</label>
                <input type="number" value={net.server_port}
                  onChange={e => setNet(s => ({ ...s, server_port: Number(e.target.value) }))}
                  className={input} />
              </div>
            </div>
            {net.server_host && (
              <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                Connected to: <span className="font-mono text-blue-400">{net.server_host}:{net.server_port}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={saveNet}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            Save Settings
          </button>
          {netMsg && <p className="text-sm text-green-400">{netMsg}</p>}
        </div>
      </Section>

      {/* ── Export Folder ─────────────────────────────────────────────────────── */}
      <Section icon={<FolderOpen className="w-5 h-5 text-yellow-400" />} bg="bg-yellow-500/10"
        title="Export Folder" sub="Where generated proposals and certificates are saved">
        <div className="space-y-3">
          <div>
            <label className={label}>Folder path</label>
            <input value={exportFolder} onChange={e => setExportFolder(e.target.value)}
              placeholder="e.g. C:\Users\Ahmed\Google Drive\Trainnovation Exports"
              className={input} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Point this at your <span className="text-yellow-400 font-medium">Google Drive</span> or{' '}
              <span className="text-blue-400 font-medium">OneDrive</span> desktop sync folder and all exports
              will auto-upload — no API setup required.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={toggleDriveSync}
              className={`relative w-10 h-5 rounded-full transition-colors ${driveSync ? 'bg-primary' : 'bg-secondary border border-border'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${driveSync ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm">Auto-open export folder after saving</span>
          </label>

          <div className="flex items-center gap-3">
            <button onClick={saveFolder}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Save className="w-3.5 h-3.5" /> Save Path
            </button>
            {folderSaved && <p className="text-sm text-green-400">Saved!</p>}
          </div>
        </div>
      </Section>

      {/* ── Calendar Integration ──────────────────────────────────────────────── */}
      <Section icon={<CalendarDays className="w-5 h-5 text-purple-400" />} bg="bg-purple-500/10"
        title="Calendar Integration" sub="Add demo sessions to your calendar">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <span className="text-green-400 text-lg mt-0.5">✓</span>
            <div>
              <p className="font-medium text-green-300">.ics invites — enabled now</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every scheduled demo has a <strong>calendar invite button</strong>. Click it to download a{' '}
                <code className="bg-secondary px-1 rounded">.ics</code> file that opens in{' '}
                <strong>Google Calendar</strong>, <strong>Outlook</strong>, or <strong>Apple Calendar</strong>.
                No account setup needed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary border border-border">
            <span className="text-muted-foreground text-lg mt-0.5">○</span>
            <div>
              <p className="font-medium">Google Calendar 2-way sync — not set up</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time sync requires a Google Cloud OAuth app. Requires: Google Cloud project, OAuth
                consent screen, and a small backend service. Recommended once the pilot is complete.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary border border-border">
            <span className="text-muted-foreground text-lg mt-0.5">○</span>
            <div>
              <p className="font-medium">Microsoft Outlook sync — not set up</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Requires Azure app registration and Microsoft Graph API. Can be added in a future phase.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Company Defaults ──────────────────────────────────────────────────── */}
      <Section icon={<Building2 className="w-5 h-5 text-indigo-400" />} bg="bg-indigo-500/10"
        title="Company Defaults" sub="Pre-fill these values in proposals, certificates and messages">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={label}>Company / Vendor name</label>
            <input value={defaults.vendor_name}
              onChange={e => setDefaults(d => ({ ...d, vendor_name: e.target.value }))}
              placeholder="Trainnovation" className={input} />
          </div>
          <div>
            <label className={label}>Sender full name</label>
            <input value={defaults.sender_name}
              onChange={e => setDefaults(d => ({ ...d, sender_name: e.target.value }))}
              placeholder="Ahmed Hassan" className={input} />
          </div>
          <div>
            <label className={label}>Sender title / role</label>
            <input value={defaults.sender_title}
              onChange={e => setDefaults(d => ({ ...d, sender_title: e.target.value }))}
              placeholder="L&D Manager" className={input} />
          </div>
          <div className="col-span-2">
            <label className={label}>Sender email</label>
            <input value={defaults.sender_email}
              onChange={e => setDefaults(d => ({ ...d, sender_email: e.target.value }))}
              placeholder="ahmed@trainnovation.com" className={input} />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={saveDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Save className="w-3.5 h-3.5" /> Save Defaults
          </button>
          {defaultsSaved && <p className="text-sm text-green-400">Saved!</p>}
        </div>
      </Section>

      {/* ── RBC Generator ─────────────────────────────────────────────────────── */}
      <Section icon={<Cpu className="w-5 h-5 text-orange-400" />} bg="bg-orange-500/10"
        title="RBC Generator" sub="Path to the RBC Generator .exe for certificate and transcript production">
        <div className="space-y-3">
          <div>
            <label className={label}>RBC Generator .exe path</label>
            <input value={rbcPath} onChange={e => setRbcPath(e.target.value)}
              placeholder="E:\Certificates\RBC Generator.exe" className={input} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Used by the <strong>RBC Export</strong> tab in Certificates to launch the generator directly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveRbc}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Save className="w-3.5 h-3.5" /> Save Path
            </button>
            {rbcSaved && <p className="text-sm text-green-400">Saved!</p>}
          </div>
        </div>
      </Section>

      {/* ── Current user ──────────────────────────────────────────────────────── */}
      <Section icon={<Users className="w-5 h-5 text-primary" />} bg="bg-primary/10"
        title="Signed In As" sub={user?.email || ''}>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${user?.role === 'manager' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {user?.role === 'manager' ? 'Manager' : 'Specialist'}
        </span>
      </Section>
    </div>
  )
}

function Section({
  icon, bg, title, sub, children,
}: { icon: React.ReactNode; bg: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
