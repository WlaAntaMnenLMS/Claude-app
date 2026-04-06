import { useEffect, useState, useRef } from 'react'
import { X, CheckCircle, AlertCircle, FolderOpen, Loader2 } from 'lucide-react'
import { api } from '@/lib/ipc'

interface Props {
  templates: any[]
  onDone: () => void
  onClose: () => void
}

interface LearnerRow {
  learner_id: number
  learner_name: string
  course_name: string
  issue_date: string
  extra_data: Record<string, string>
}

export default function BulkFillWizard({ templates, onDone, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [templateId, setTemplateId] = useState<number | ''>('')
  const [learners, setLearners] = useState<any[]>([])
  const [rows, setRows] = useState<LearnerRow[]>([])
  const [courseName, setCourseName] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [outputDir, setOutputDir] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    api.learner.list().then(setLearners)
  }, [])

  // Listen for progress events
  useEffect(() => {
    const unsub = window.api.on('certificate:progress', (data: any) => {
      setProgress({ current: data.current, total: data.total })
    })
    return unsub
  }, [])

  function toggleLearner(id: number) {
    setSelectedLearnerIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedLearnerIds.size === learners.length) setSelectedLearnerIds(new Set())
    else setSelectedLearnerIds(new Set(learners.map(l => l.id)))
  }

  async function runBulkFill() {
    if (!templateId) return
    setRunning(true)
    setStep(3)
    setProgress({ current: 0, total: selectedLearnerIds.size })

    const rows = [...selectedLearnerIds].map(id => {
      const l = learners.find(x => x.id === id)
      return {
        learner_id: id,
        learner_name: l?.full_name || '',
        course_name: courseName,
        issue_date: issueDate,
        extra_data: {},
      }
    })

    try {
      const result = await api.certificate.bulkFill({
        template_id: templateId,
        learners: rows,
      })
      setResults(result.results)
      setOutputDir(result.outputDir)
    } finally {
      setRunning(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === templateId)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Bulk Certificate Fill</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 0: Select template + course info */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Certificate Template *</label>
                <select value={templateId} onChange={e => setTemplateId(Number(e.target.value) || '')}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Select template…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Placeholders: {JSON.parse(selectedTemplate.variables || '[]').join(', ')}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Course Name *</label>
                <input value={courseName} onChange={e => setCourseName(e.target.value)}
                  placeholder="e.g. Leadership Development Program"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Issue Date *</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}

          {/* Step 1: Select learners */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedLearnerIds.size} of {learners.length} selected
                </p>
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {selectedLearnerIds.size === learners.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {learners.map(l => (
                  <label key={l.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer">
                    <input type="checkbox"
                      checked={selectedLearnerIds.has(l.id)}
                      onChange={() => toggleLearner(l.id)}
                      className="w-4 h-4 accent-primary rounded" />
                    <div>
                      <p className="text-sm font-medium">{l.full_name}</p>
                      <p className="text-xs text-muted-foreground">{l.organization || l.email || ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <div className="space-y-4 text-center py-4">
              <div className="bg-secondary rounded-xl p-4 text-left space-y-2 text-sm">
                <p><span className="text-muted-foreground">Template:</span> {selectedTemplate?.name}</p>
                <p><span className="text-muted-foreground">Course:</span> {courseName}</p>
                <p><span className="text-muted-foreground">Date:</span> {issueDate}</p>
                <p><span className="text-muted-foreground">Learners:</span> {selectedLearnerIds.size}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Ready to generate <strong>{selectedLearnerIds.size}</strong> certificate(s).
                Each will be saved as a .docx file.
              </p>
            </div>
          )}

          {/* Step 3: Progress / Results */}
          {step === 3 && (
            <div className="space-y-4">
              {running ? (
                <div className="text-center py-8 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                  <p className="font-medium">Generating certificates…</p>
                  {progress && (
                    <>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{progress.current} / {progress.total}</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="font-medium">Done! {results.filter(r => r.success).length} certificates generated</p>
                  </div>
                  {results.filter(r => !r.success).length > 0 && (
                    <div className="bg-destructive/10 rounded-lg p-3 space-y-1">
                      <p className="text-sm text-destructive font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {results.filter(r => !r.success).length} failed
                      </p>
                      {results.filter(r => !r.success).map((r, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{r.learner_name}: {r.error}</p>
                      ))}
                    </div>
                  )}
                  {outputDir && (
                    <button
                      onClick={() => api.shell.showItemInFolder(outputDir)}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-accent rounded-lg text-sm"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Open Output Folder
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          {step < 3 ? (
            <>
              <button onClick={() => step > 0 && setStep(s => s - 1)}
                disabled={step === 0}
                className="px-3 py-1.5 text-sm text-muted-foreground disabled:opacity-30 hover:text-foreground">
                ← Back
              </button>
              {step < 2 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 0 ? !templateId || !courseName : selectedLearnerIds.size === 0}
                  className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
                  Next →
                </button>
              ) : (
                <button onClick={runBulkFill}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Generate Certificates
                </button>
              )}
            </>
          ) : (
            <button onClick={onDone} disabled={running}
              className="ml-auto px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
