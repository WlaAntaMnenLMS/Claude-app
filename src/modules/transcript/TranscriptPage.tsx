import { useEffect, useState, useRef } from 'react'
import { BookOpen, Plus, Upload, Trash2, Download, FolderOpen } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDate } from '@/lib/utils'

export default function TranscriptPage() {
  const [transcripts, setTranscripts] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [learners, setLearners] = useState<any[]>([])
  const [tab, setTab] = useState<'transcripts' | 'templates'>('transcripts')
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const [t, tmpl, l] = await Promise.all([
      api.transcript.list(), api.transcript.templates.list(), api.learner.list()
    ])
    setTranscripts(t); setTemplates(tmpl); setLearners(l)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold">Transcripts</h1>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full">
            {transcripts.length}
          </span>
        </div>
        <button onClick={() => setShowForm(true)} disabled={templates.length === 0 || learners.length === 0}
          title={templates.length === 0 ? 'Upload a template first' : ''}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50">
          <Plus className="w-4 h-4" /> New Transcript
        </button>
      </div>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {(['transcripts', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
              tab === t ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>{t}</button>
        ))}
      </div>

      {tab === 'templates' ? (
        <TranscriptTemplatesTab templates={templates} onUpdate={load} />
      ) : (
        <div className="space-y-3">
          {transcripts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No transcripts yet.</p>
              {templates.length === 0 && (
                <button onClick={() => setTab('templates')}
                  className="mt-3 px-4 py-2 text-sm bg-secondary hover:bg-accent rounded-lg">
                  Upload Template First
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Learner', 'Template', 'Courses', 'Date', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transcripts.map(t => {
                    const courses = JSON.parse(t.courses_data || '[]')
                    return (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-accent/20">
                        <td className="px-4 py-3 font-medium">{t.learner_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.template_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{courses.length} courses</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                        <td className="px-4 py-3">
                          {t.output_path && (
                            <button onClick={() => api.shell.openPath(t.output_path)}
                              className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <Download className="w-3 h-3" /> Open
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <TranscriptForm
          templates={templates}
          learners={learners}
          onSave={async (data: any) => {
            await api.transcript.create(data)
            setShowForm(false)
            load()
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ─── Transcript Form ─────────────────────────────────────────────────────────
function TranscriptForm({ templates, learners, onSave, onClose }: any) {
  const [form, setForm] = useState({
    template_id: templates[0]?.id || '',
    learner_id: '',
    courses: [{ course_name: '', code: '', grade: '', hours: '', completion_date: '' }],
  })
  const [saving, setSaving] = useState(false)

  function addCourse() {
    setForm(f => ({ ...f, courses: [...f.courses, { course_name: '', code: '', grade: '', hours: '', completion_date: '' }] }))
  }

  function removeCourse(i: number) {
    setForm(f => ({ ...f, courses: f.courses.filter((_, idx) => idx !== i) }))
  }

  function updateCourse(i: number, k: string, v: string) {
    setForm(f => {
      const c = [...f.courses]; c[i] = { ...c[i], [k]: v }; return { ...f, courses: c }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.template_id || !form.learner_id) return
    setSaving(true)
    try {
      await onSave({
        template_id: Number(form.template_id),
        learner_id: Number(form.learner_id),
        courses_data: form.courses.filter(c => c.course_name),
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">New Transcript</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Learner *</label>
              <select required value={form.learner_id} onChange={e => setForm(f => ({ ...f, learner_id: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select learner…</option>
                {learners.map((l: any) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Template *</label>
              <select required value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">Courses</label>
              <button type="button" onClick={addCourse}
                className="text-xs text-primary hover:underline">+ Add Course</button>
            </div>
            <div className="space-y-2">
              {form.courses.map((course, i) => (
                <div key={i} className="bg-secondary rounded-lg p-3 grid grid-cols-5 gap-2">
                  {[
                    { k: 'course_name', ph: 'Course Name *', span: 2 },
                    { k: 'code', ph: 'Code' },
                    { k: 'grade', ph: 'Grade' },
                    { k: 'hours', ph: 'Hours' },
                  ].map(({ k, ph, span }) => (
                    <input key={k} value={(course as any)[k]} onChange={e => updateCourse(i, k, e.target.value)}
                      placeholder={ph}
                      className={`bg-card border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary ${span === 2 ? 'col-span-2' : ''}`} />
                  ))}
                  <button type="button" onClick={() => removeCourse(i)}
                    className="text-destructive hover:text-destructive/80 text-xs">✕</button>
                  <div className="col-span-5">
                    <input type="date" value={course.completion_date} onChange={e => updateCourse(i, 'completion_date', e.target.value)}
                      className="bg-card border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
              {saving ? 'Generating…' : 'Generate Transcript'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Templates Tab ───────────────────────────────────────────────────────────
function TranscriptTemplatesTab({ templates, onUpdate }: { templates: any[]; onUpdate: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function upload() {
    if (!selectedFile || !name.trim()) return
    setUploading(true)
    try {
      await api.transcript.templates.upload({ name, sourcePath: (selectedFile as any).path })
      setName(''); setSelectedFile(null); onUpdate()
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-dashed border-border rounded-xl p-6">
        <p className="text-sm font-medium mb-1">Upload Transcript Template (.docx)</p>
        <p className="text-xs text-muted-foreground mb-4">
          Use {`{{learner_name}}`}, {`{{national_id}}`}, {`{{issue_date}}`} for header fields.
          For repeating course rows, use {`{#courses}`}...{`{/courses}`} loop syntax with
          {`{{course_name}}`}, {`{{grade}}`}, {`{{hours}}`}, {`{{completion_date}}`}.
        </p>
        <div className="flex gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name"
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          <input ref={inputRef} type="file" accept=".docx" className="hidden"
            onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
          <button onClick={() => inputRef.current?.click()}
            className="px-3 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm">
            {selectedFile ? selectedFile.name : 'Choose File'}
          </button>
          <button onClick={upload} disabled={uploading || !selectedFile || !name.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
      {templates.map((t: any) => (
        <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{t.name}</p>
            <p className="text-xs text-muted-foreground">Variables: {JSON.parse(t.variables || '[]').join(', ') || 'auto-detect'}</p>
          </div>
          <button onClick={async () => { await api.transcript.templates.delete(t.id); onUpdate() }}
            className="text-xs text-destructive hover:underline">Delete</button>
        </div>
      ))}
    </div>
  )
}
