import { useEffect, useRef, useState } from 'react'
import { Download, Play, FolderOpen, CheckSquare, Square, RefreshCw, FileSearch, FilePlus2 } from 'lucide-react'
import { api } from '@/lib/ipc'

const RBC_PATH_KEY = 'ld_rbc_exe_path'
const RBC_OUT_KEY  = 'ld_rbc_output_dir'

type Mode = 'excel' | 'direct'

export default function RBCExport() {
  const [mode, setMode] = useState<Mode>('excel')

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        <button onClick={() => setMode('excel')}
          className={`px-4 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5 ${
            mode === 'excel' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Download className="w-3.5 h-3.5" /> Excel Workbook
        </button>
        <button onClick={() => setMode('direct')}
          className={`px-4 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5 ${
            mode === 'direct' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <FilePlus2 className="w-3.5 h-3.5" /> Direct Fill
        </button>
      </div>

      {mode === 'excel'  && <ExcelMode />}
      {mode === 'direct' && <DirectFillMode />}
    </div>
  )
}

// ─── Excel Workbook Mode (original) ─────────────────────────────────────────
function ExcelMode() {
  const [programs, setPrograms]             = useState<string[]>([])
  const [learners, setLearners]             = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set())
  const [graduationDate, setGraduationDate] = useState('')
  const [academicYear, setAcademicYear]     = useState('2025-2026')
  const [exePath, setExePath]               = useState(localStorage.getItem(RBC_PATH_KEY) || 'E:\\Certificates\\RBC Generator.exe')
  const [outputDir, setOutputDir]           = useState(localStorage.getItem(RBC_OUT_KEY) || 'E:\\Certificates\\Admissions_Workbooks')
  const [exporting, setExporting]           = useState(false)
  const [lastExport, setLastExport]         = useState('')
  const [msg, setMsg]                       = useState('')
  const [filter, setFilter]                 = useState('')

  useEffect(() => {
    Promise.all([api.rbc.programs(), api.learner.list()]).then(([progs, lrns]) => {
      setPrograms(progs)
      if (progs.length > 0) setSelectedProgram(progs[0])
      setLearners(lrns)
    })
  }, [])

  const filtered = learners.filter(l =>
    !filter || l.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    (l.national_id || '').includes(filter))

  function toggleAll() {
    setSelectedIds(selectedIds.size === filtered.length
      ? new Set() : new Set(filtered.map((l: any) => l.id)))
  }
  function toggle(id: number) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function save() {
    localStorage.setItem(RBC_PATH_KEY, exePath)
    localStorage.setItem(RBC_OUT_KEY, outputDir)
  }
  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 4000) }

  async function handleExport() {
    if (!selectedProgram) { flash('Select a program first'); return }
    if (selectedIds.size === 0) { flash('Select at least one learner'); return }
    if (!graduationDate) { flash('Enter graduation date'); return }
    save(); setExporting(true)
    try {
      const { outputPath } = await api.rbc.exportWorkbook({
        program: selectedProgram, learnerIds: [...selectedIds],
        graduationDate, academicYear, outputDir,
      })
      setLastExport(outputPath)
      flash(`Workbook exported: ${outputPath.split('\\').pop()}`)
    } catch (err: any) {
      flash(`Export failed: ${err.message}`)
    } finally { setExporting(false) }
  }

  async function handleLaunch() {
    save()
    const res = await api.rbc.launch(exePath)
    if (!res.success) flash(res.error || 'Could not launch RBC Generator')
  }

  const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm">
        <span className="text-blue-400 text-lg mt-0.5">ℹ</span>
        <div className="text-blue-200/80">
          <p className="font-medium text-blue-300">How this works</p>
          <p className="text-xs mt-0.5">
            Select a program + learners → set graduation date → <strong>Export Workbook</strong>.
            An Excel file is created in RBC Generator format with learner names pre-filled.
            Open it in Excel to add module grades/marks, then load it into <strong>RBC Generator</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Export Settings</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Program</label>
              <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className={inputCls}>
                {programs.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Graduation Date</label>
                <input value={graduationDate} onChange={e => setGraduationDate(e.target.value)}
                  placeholder="e.g. 28th February 2026" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Academic Year</label>
                <input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025-2026" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Output folder</label>
              <input value={outputDir} onChange={e => setOutputDir(e.target.value)}
                placeholder="E:\Certificates\Admissions_Workbooks" className={inputCls} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">RBC Generator</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">.exe path</label>
              <input value={exePath} onChange={e => setExePath(e.target.value)}
                placeholder="E:\Certificates\RBC Generator.exe" className={inputCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleLaunch}
                className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-300 border border-green-600/30 rounded-lg text-sm hover:bg-green-600/30">
                <Play className="w-3.5 h-3.5" /> Launch RBC Generator
              </button>
              <button onClick={() => api.rbc.openFolder(outputDir)}
                className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-accent rounded-lg text-sm text-muted-foreground">
                <FolderOpen className="w-3.5 h-3.5" /> Output folder
              </button>
            </div>
          </div>

          <button onClick={handleExport} disabled={exporting || selectedIds.size === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting…' : `Export Workbook (${selectedIds.size} learners)`}
          </button>

          {lastExport && (
            <button onClick={() => api.shell.showItemInFolder(lastExport)}
              className="w-full text-xs text-primary hover:underline text-center">
              Open in folder: {lastExport.split('\\').pop()}
            </button>
          )}
          {msg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${msg.includes('failed') || msg.includes('not') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {msg}
            </p>
          )}
        </div>

        <LearnerPicker learners={learners} filtered={filtered} selectedIds={selectedIds}
          filter={filter} setFilter={setFilter} toggleAll={toggleAll} toggle={toggle} />
      </div>
    </div>
  )
}

// ─── Direct Fill Mode ────────────────────────────────────────────────────────
function DirectFillMode() {
  const templateInputRef                    = useRef<HTMLInputElement>(null)
  const [templateFile, setTemplateFile]     = useState<File | null>(null)
  const [placeholders, setPlaceholders]     = useState<string[]>([])
  const [scanning, setScanning]             = useState(false)
  const [learners, setLearners]             = useState<any[]>([])
  const [programs, setPrograms]             = useState<string[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set())
  const [graduationDate, setGraduationDate] = useState('')
  const [academicYear, setAcademicYear]     = useState('2025-2026')
  const [outputDir, setOutputDir]           = useState(localStorage.getItem(RBC_OUT_KEY) || 'E:\\Certificates\\Output')
  const [filling, setFilling]               = useState(false)
  const [progress, setProgress]             = useState<{ current: number; total: number } | null>(null)
  const [results, setResults]               = useState<any[]>([])
  const [msg, setMsg]                       = useState('')
  const [filter, setFilter]                 = useState('')

  useEffect(() => {
    Promise.all([api.rbc.programs(), api.learner.list()]).then(([progs, lrns]) => {
      setPrograms(progs)
      if (progs.length > 0) setSelectedProgram(progs[0])
      setLearners(lrns)
    })
    const unsub = api.on('rbc:fillProgress', (p: any) => setProgress(p))
    return unsub
  }, [])

  const filtered = learners.filter(l =>
    !filter || l.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    (l.national_id || '').includes(filter))

  function toggleAll() {
    setSelectedIds(selectedIds.size === filtered.length
      ? new Set() : new Set(filtered.map((l: any) => l.id)))
  }
  function toggle(id: number) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 5000) }

  async function handleScan() {
    if (!templateFile) return
    setScanning(true)
    try {
      const found = await api.rbc.scanTemplate((templateFile as any).path)
      setPlaceholders(found)
      if (found.length === 0) flash('No <<placeholders>> found in template')
    } catch (err: any) {
      flash(`Scan failed: ${err.message}`)
    } finally { setScanning(false) }
  }

  async function handleFill() {
    if (!templateFile) { flash('Choose a template file first'); return }
    if (selectedIds.size === 0) { flash('Select at least one learner'); return }
    if (!graduationDate) { flash('Enter graduation date'); return }
    localStorage.setItem(RBC_OUT_KEY, outputDir)
    setFilling(true)
    setResults([])
    setProgress(null)
    try {
      const { results: res } = await api.rbc.fillTemplates({
        templatePath: (templateFile as any).path,
        learnerIds: [...selectedIds],
        graduationDate,
        academicYear,
        program: selectedProgram,
        moduleGrades: {},
        outputDir,
      })
      setResults(res)
      flash(`Done — ${res.length} file(s) created in ${outputDir}`)
    } catch (err: any) {
      flash(`Fill failed: ${err.message}`)
    } finally { setFilling(false); setProgress(null) }
  }

  const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm">
        <span className="text-purple-400 text-lg mt-0.5">✦</span>
        <div className="text-purple-200/80">
          <p className="font-medium text-purple-300">Direct Template Fill</p>
          <p className="text-xs mt-0.5">
            Choose one of the RBC Generator template files (.potm / .dotm / .pptx / .docx).
            The app will scan for <code className="bg-purple-900/40 px-1 rounded">&lt;&lt;Placeholder&gt;&gt;</code> fields,
            then fill learner data (name, ID, email, graduation date…) directly into a copy of the template for each selected learner.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {/* Template picker */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Template File</p>
            <div className="flex gap-2">
              <input ref={templateInputRef} type="file"
                accept=".potm,.dotm,.pptx,.docx,.pptm,.dotx" className="hidden"
                onChange={e => { setTemplateFile(e.target.files?.[0] || null); setPlaceholders([]) }} />
              <button onClick={() => templateInputRef.current?.click()}
                className="flex-1 text-left px-3 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm truncate">
                {templateFile ? templateFile.name : 'Choose .potm / .dotm / .pptx / .docx…'}
              </button>
              <button onClick={handleScan} disabled={!templateFile || scanning}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm disabled:opacity-50">
                {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5" />}
                Scan
              </button>
            </div>

            {placeholders.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{placeholders.length} placeholder(s) found:</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {placeholders.map(p => (
                    <span key={p} className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                      {`<<${p}>>`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fill settings */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Fill Settings</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Program</label>
              <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className={inputCls}>
                {programs.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Graduation Date</label>
                <input value={graduationDate} onChange={e => setGraduationDate(e.target.value)}
                  placeholder="e.g. 28th February 2026" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Academic Year</label>
                <input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025-2026" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Output folder</label>
              <div className="flex gap-2">
                <input value={outputDir} onChange={e => setOutputDir(e.target.value)}
                  placeholder="E:\Certificates\Output" className={inputCls} />
                <button onClick={() => api.rbc.openFolder(outputDir)}
                  className="px-2.5 py-2 bg-secondary hover:bg-accent border border-border rounded-lg shrink-0">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Fill button */}
          <button onClick={handleFill} disabled={filling || selectedIds.size === 0 || !templateFile}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 disabled:opacity-50">
            {filling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
            {filling
              ? progress ? `Filling ${progress.current}/${progress.total}…` : 'Filling…'
              : `Fill Templates (${selectedIds.size} learners)`}
          </button>

          {msg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${msg.includes('failed') || msg.includes('not') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {msg}
            </p>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground">
                Output files ({results.length})
              </div>
              <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm truncate">{r.learner_name}</span>
                    {r.outputPath && (
                      <button onClick={() => api.shell.showItemInFolder(r.outputPath)}
                        className="text-xs text-primary hover:underline shrink-0 ml-2">
                        Show file
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <LearnerPicker learners={learners} filtered={filtered} selectedIds={selectedIds}
          filter={filter} setFilter={setFilter} toggleAll={toggleAll} toggle={toggle} />
      </div>
    </div>
  )
}

// ─── Shared learner picker ───────────────────────────────────────────────────
function LearnerPicker({ learners, filtered, selectedIds, filter, setFilter, toggleAll, toggle }: {
  learners: any[]; filtered: any[]; selectedIds: Set<number>
  filter: string; setFilter: (v: string) => void
  toggleAll: () => void; toggle: (id: number) => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: 480 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
            {selectedIds.size === filtered.length && filtered.length > 0
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />}
          </button>
          <p className="text-sm font-medium">{selectedIds.size} / {learners.length} learners selected</p>
        </div>
      </div>
      <div className="px-3 py-2 border-b border-border shrink-0">
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Search name or ID…"
          className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="overflow-y-auto flex-1">
        {learners.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No learners in the database.<br />
            <span className="text-xs">Add them in the Learners tab first.</span>
          </p>
        ) : filtered.map(l => (
          <label key={l.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 cursor-pointer border-b border-border/40 last:border-0">
            <input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => toggle(l.id)}
              className="accent-primary w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{l.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {l.national_id ? `ID: ${l.national_id}` : ''}
                {l.national_id && l.email ? ' · ' : ''}
                {l.email || ''}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
