import { useEffect, useState, useRef } from 'react'
import { Award, Plus, Upload, Users, Download, FolderOpen, FileSpreadsheet, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDate } from '@/lib/utils'
import Papa from 'papaparse'
import LearnerManager from './LearnerManager'
import ExportButton from '@/components/shared/ExportButton'
import BulkFillWizard from './BulkFillWizard'
import RBCExport from './RBCExport'

export default function CertificatePage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [tab, setTab] = useState<'certificates' | 'excel' | 'learners' | 'templates' | 'rbc'>('certificates')
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
        {(['certificates', 'excel', 'learners', 'templates', 'rbc'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
              tab === t ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t === 'rbc' ? 'RBC Export' : t === 'excel' ? 'Excel Fill' : t}
          </button>
        ))}
      </div>

      {tab === 'learners' && <LearnerManager />}
      {tab === 'rbc' && <RBCExport />}
      {tab === 'excel' && <ExcelFillTab templates={templates} onDone={load} />}

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

// ─── Excel Fill Tab ──────────────────────────────────────────────────────────
function ExcelFillTab({ templates, onDone }: { templates: any[]; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [excelFile, setExcelFile]       = useState<File | null>(null)
  const [preview, setPreview]           = useState<{ headers: string[]; rows: string[][]; rowCount: number } | null>(null)
  const [templateId, setTemplateId]     = useState<number>(templates[0]?.id || 0)
  const [outputDir, setOutputDir]       = useState(localStorage.getItem('ld_rbc_output_dir') || 'C:\\Users\\Public\\Documents\\LD-Certificates')
  const [filling, setFilling]           = useState(false)
  const [progress, setProgress]         = useState<{ current: number; total: number } | null>(null)
  const [results, setResults]           = useState<any[]>([])
  const [msg, setMsg]                   = useState('')

  useEffect(() => {
    if (templates.length > 0 && !templateId) setTemplateId(templates[0].id)
  }, [templates])

  useEffect(() => {
    const unsub = api.on('certificate:fillProgress', (p: any) => setProgress(p))
    return unsub
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setExcelFile(f)
    setPreview(null)
    setResults([])
    if (!f) return
    try {
      const data = await api.certificate.previewExcel((f as any).path)
      setPreview(data)
    } catch (err: any) {
      flash(`Could not read Excel: ${err.message}`)
    }
  }

  async function handleFill() {
    if (!excelFile) { flash('Choose an Excel file first'); return }
    if (!templateId) { flash('Upload a template in the Templates tab first'); return }
    setFilling(true); setResults([]); setProgress(null)
    try {
      const { results: res } = await api.certificate.fillFromExcel({
        excelPath: (excelFile as any).path,
        templateId,
        outputDir,
      })
      setResults(res)
      const ok = res.filter((r: any) => r.success).length
      flash(`Done — ${ok}/${res.length} documents generated`)
      if (ok > 0) onDone()
    } catch (err: any) {
      flash(`Failed: ${err.message}`)
    } finally { setFilling(false); setProgress(null) }
  }

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 6000) }

  const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm">
        <FileSpreadsheet className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-green-300">Excel → Template Fill</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload any Excel file (e.g. from RBC Export or your own). Each row becomes one filled document.
            Column headers map directly to template placeholders — works with both <code className="bg-card px-1 rounded">{`{{name}}`}</code> and <code className="bg-card px-1 rounded">{`<<name>>`}</code> templates.
            Every generated file is saved to the <strong>Certificates</strong> history tab.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: settings */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">1 — Choose Excel file</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary hover:bg-accent border border-border rounded-lg text-sm">
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
              {excelFile ? excelFile.name : 'Choose .xlsx file…'}
            </button>
            {preview && (
              <p className="text-xs text-green-400">
                {preview.rowCount} data row(s) · {preview.headers.filter(Boolean).length} column(s) · Sheet: {preview.sheetName}
              </p>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">2 — Choose template</p>
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No templates uploaded yet. Go to the Templates tab to upload a .docx or .potm file.</p>
            ) : (
              <select value={templateId} onChange={e => setTemplateId(Number(e.target.value))} className={inputCls}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">3 — Output folder</p>
            <div className="flex gap-2">
              <input value={outputDir} onChange={e => setOutputDir(e.target.value)} className={inputCls} />
              <button onClick={() => api.rbc.openFolder(outputDir)}
                className="px-2.5 py-2 bg-secondary hover:bg-accent border border-border rounded-lg shrink-0">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <button onClick={handleFill}
            disabled={filling || !excelFile || !templateId}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50">
            {filling
              ? <><RefreshCw className="w-4 h-4 animate-spin" />
                  {progress ? `Filling ${progress.current}/${progress.total}…` : 'Working…'}</>
              : <><FileSpreadsheet className="w-4 h-4" />
                  {`Generate Documents${preview ? ` (${preview.rowCount} rows)` : ''}`}</>}
          </button>

          {msg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${msg.includes('Failed') || msg.includes('not') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {msg}
            </p>
          )}
        </div>

        {/* Right: preview + results */}
        <div className="space-y-4">
          {preview && preview.headers.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <p className="px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-border">Excel preview (first 3 rows)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {preview.headers.filter(Boolean).map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border/50">
                        {preview.headers.filter(Boolean).map((_, ci) => (
                          <td key={ci} className="px-3 py-2 truncate max-w-[120px]">{row[ci] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <p className="px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-border">
                Results — {results.filter(r => r.success).length} ok / {results.filter(r => !r.success).length} failed
              </p>
              <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2">
                    {r.success
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="text-sm flex-1 truncate">{r.name}</span>
                    {r.success && r.outputPath && (
                      <button onClick={() => api.shell.showItemInFolder(r.outputPath)}
                        className="text-xs text-primary hover:underline shrink-0">Show</button>
                    )}
                    {!r.success && <span className="text-xs text-red-400 truncate max-w-[150px]">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
