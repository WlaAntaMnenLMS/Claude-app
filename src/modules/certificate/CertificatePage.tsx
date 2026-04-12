import { useEffect, useState, useRef } from 'react'
import { Award, Plus, Upload, Users, Download, FolderOpen } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDate } from '@/lib/utils'
import Papa from 'papaparse'
import LearnerManager from './LearnerManager'
import ExportButton from '@/components/shared/ExportButton'
import BulkFillWizard from './BulkFillWizard'

export default function CertificatePage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [tab, setTab] = useState<'certificates' | 'learners' | 'templates'>('certificates')
  const [showWizard, setShowWizard] = useState(false)

  async function load() {
    const [certs, tmpls] = await Promise.all([api.certificate.list(), api.certificate.templates.list()])
    setCertificates(certs)
    setTemplates(tmpls)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-green-400" />
          <h1 className="text-xl font-bold">Certificates</h1>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full">
            {certificates.length} issued
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton module="certificates" />
          <ExportButton module="learners" className="text-xs" />
          <button
            onClick={() => setShowWizard(true)}
            disabled={templates.length === 0}
            title={templates.length === 0 ? 'Upload a template first' : ''}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Bulk Fill
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {(['certificates', 'learners', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
              tab === t ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'learners' && <LearnerManager />}

      {tab === 'templates' && (
        <TemplatesTab templates={templates} onUpdate={load} />
      )}

      {tab === 'certificates' && (
        <div className="space-y-3">
          {certificates.length === 0 ? (
            <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No certificates generated yet.</p>
              {templates.length === 0 && (
                <p className="text-xs mt-1">Upload a DOCX template in the Templates tab first.</p>
              )}
              <button onClick={() => setTab('templates')}
                className="mt-3 px-4 py-2 text-sm bg-secondary hover:bg-accent rounded-lg">
                Go to Templates
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Learner</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Course</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Cert #</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Issue Date</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Template</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {certificates.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-3 font-medium">{c.learner_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.course_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.cert_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.issue_date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.template_name}</td>
                      <td className="px-4 py-3">
                        {c.output_path && (
                          <button onClick={() => api.shell.openPath(c.output_path)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <Download className="w-3 h-3" /> Open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showWizard && (
        <BulkFillWizard
          templates={templates}
          onDone={() => { setShowWizard(false); load() }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  )
}

// ─── Templates Sub-Tab ──────────────────────────────────────────────────────
function TemplatesTab({ templates, onUpdate }: { templates: any[]; onUpdate: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  async function handleUpload() {
    if (!selectedFile || !name.trim()) return
    setUploading(true)
    try {
      await api.certificate.templates.upload({ name, sourcePath: (selectedFile as any).path })
      setName('')
      setSelectedFile(null)
      onUpdate()
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="bg-card border border-dashed border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Upload Certificate Template (.docx)</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Your template should use {`{{learner_name}}`}, {`{{course_name}}`}, {`{{issue_date}}`}, {`{{cert_number}}`} as placeholders.
        </p>
        <div className="flex gap-3">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Template name"
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <input ref={inputRef} type="file" accept=".docx" className="hidden"
            onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
          <button onClick={() => inputRef.current?.click()}
            className="px-3 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm">
            {selectedFile ? selectedFile.name : 'Choose File'}
          </button>
          <button onClick={handleUpload} disabled={uploading || !selectedFile || !name.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Existing templates */}
      {templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Placeholders: {JSON.parse(t.variables || '[]').join(', ') || 'auto-detect'}
                </p>
              </div>
              <button onClick={async () => { await api.certificate.templates.delete(t.id); onUpdate() }}
                className="text-xs text-destructive hover:underline ml-4 shrink-0">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
