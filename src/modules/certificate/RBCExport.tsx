import { useEffect, useState } from 'react'
import { Download, Play, FolderOpen, CheckSquare, Square, RefreshCw } from 'lucide-react'
import { api } from '@/lib/ipc'

const RBC_PATH_KEY = 'ld_rbc_exe_path'
const RBC_OUT_KEY = 'ld_rbc_output_dir'

export default function RBCExport() {
  const [programs, setPrograms] = useState<string[]>([])
  const [learners, setLearners] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [graduationDate, setGraduationDate] = useState('')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [exePath, setExePath] = useState(localStorage.getItem(RBC_PATH_KEY) || 'E:\\Certificates\\RBC Generator.exe')
  const [outputDir, setOutputDir] = useState(localStorage.getItem(RBC_OUT_KEY) || 'E:\\Certificates\\Admissions_Workbooks')
  const [exporting, setExporting] = useState(false)
  const [lastExport, setLastExport] = useState('')
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    Promise.all([api.rbc.programs(), api.learner.list()]).then(([progs, lrns]) => {
      setPrograms(progs)
      if (progs.length > 0) setSelectedProgram(progs[0])
      setLearners(lrns)
    })
  }, [])

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((l: any) => l.id)))
    }
  }

  function toggle(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function saveSettings() {
    localStorage.setItem(RBC_PATH_KEY, exePath)
    localStorage.setItem(RBC_OUT_KEY, outputDir)
  }

  async function handleExport() {
    if (!selectedProgram) { flash('Select a program first'); return }
    if (selectedIds.size === 0) { flash('Select at least one learner'); return }
    if (!graduationDate) { flash('Enter graduation date'); return }
    saveSettings()
    setExporting(true)
    try {
      const { outputPath } = await api.rbc.exportWorkbook({
        program: selectedProgram,
        learnerIds: [...selectedIds],
        graduationDate,
        academicYear,
        outputDir,
      })
      setLastExport(outputPath)
      flash(`Workbook exported: ${outputPath.split('\\').pop()}`)
    } catch (err: any) {
      flash(`Export failed: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  async function handleLaunch() {
    saveSettings()
    const res = await api.rbc.launch(exePath)
    if (!res.success) flash(res.error || 'Could not launch RBC Generator')
  }

  async function openOutput() {
    await api.rbc.openFolder(outputDir)
  }

  function flash(text: string) {
    setMsg(text); setTimeout(() => setMsg(''), 4000)
  }

  const filtered = learners.filter(l =>
    !filter || l.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    (l.national_id || '').includes(filter)
  )

  const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm">
        <span className="text-blue-400 text-lg mt-0.5">ℹ</span>
        <div className="text-blue-200/80">
          <p className="font-medium text-blue-300">How this works</p>
          <p className="text-xs mt-0.5">
            Select a program + learners → set graduation date → click <strong>Export Workbook</strong>.
            An Excel file opens in the correct RBC Generator format with learner names pre-filled.
            Fill in module grades/marks in Excel, then open it in <strong>RBC Generator</strong> to produce certificates and transcripts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: config */}
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
              <button onClick={openOutput}
                className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-accent rounded-lg text-sm text-muted-foreground">
                <FolderOpen className="w-3.5 h-3.5" /> Output folder
              </button>
            </div>
          </div>

          {/* Export button */}
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
            <p className={`text-xs px-3 py-2 rounded-lg ${msg.includes('failed') || msg.includes('not found') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {msg}
            </p>
          )}
        </div>

        {/* Right: learner picker */}
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
      </div>
    </div>
  )
}
