import { useEffect, useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import {
  transcripts as api, transcriptTemplates as tplApi, learners as learnerApi,
  type Transcript, type TranscriptTemplate, type Learner,
  uploadFile,
} from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface CourseRow {
  name: string
  code: string
  hours: string
  grade: string
}

const blankCourse = (): CourseRow => ({ name: '', code: '', hours: '', grade: '' })

export default function TranscriptPage() {
  const [transcriptList, setTranscriptList] = useState<Transcript[]>([])
  const [templates, setTemplates] = useState<TranscriptTemplate[]>([])
  const [learnerList, setLearnerList] = useState<Learner[]>([])
  const [tab, setTab] = useState<'list' | 'generate' | 'templates'>('list')

  const [selectedLearner, setSelectedLearner] = useState('')
  const [selectedTpl, setSelectedTpl] = useState('')
  const [courses, setCourses] = useState<CourseRow[]>([blankCourse()])

  const [tplName, setTplName] = useState('')
  const [tplFile, setTplFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    const [t, tpl, l] = await Promise.all([api.list(), tplApi.list(), learnerApi.list()])
    setTranscriptList(t)
    setTemplates(tpl)
    setLearnerList(l)
  }

  useEffect(() => { load() }, [])

  const addCourse = () => setCourses(c => [...c, blankCourse()])
  const removeCourse = (i: number) => setCourses(c => c.filter((_, idx) => idx !== i))
  const updateCourse = (i: number, field: keyof CourseRow, val: string) =>
    setCourses(c => c.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.create({
      template_id: selectedTpl ? Number(selectedTpl) : undefined,
      learner_id: Number(selectedLearner),
      courses_data: JSON.stringify(courses),
    })
    setTab('list')
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this transcript?')) return
    await api.delete(id)
    setTranscriptList(t => t.filter(x => x.id !== id))
  }

  const uploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tplFile || !tplName) return
    setUploading(true)
    try {
      const path = `transcript-templates/${Date.now()}_${tplFile.name}`
      const url = await uploadFile('templates', path, tplFile)
      await tplApi.create({ name: tplName, docx_url: url })
      setTplName('')
      setTplFile(null)
      load()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Transcripts</h1>
          <p className="text-gray-400 text-sm mt-0.5">{transcriptList.length} transcripts</p>
        </div>
        <button
          onClick={() => { setSelectedLearner(''); setSelectedTpl(''); setCourses([blankCourse()]); setTab('generate') }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus size={16} /> New Transcript
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg w-fit">
        {(['list', 'generate', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md transition capitalize ${tab === t ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-white'}`}>
            {t === 'generate' ? '+ New' : t === 'templates' ? 'DOCX Templates' : 'Transcripts'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Learner', 'Template', 'Courses', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {transcriptList.map(t => {
                const coursesParsed = (() => { try { return JSON.parse(t.courses_data) } catch { return [] } })()
                return (
                  <tr key={t.id} className="hover:bg-gray-900/50">
                    <td className="px-3 py-2.5 text-white font-medium">{t.learners?.full_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400">{t.transcript_templates?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{coursesParsed.length} courses</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{formatDate(t.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => remove(t.id)} className="text-gray-600 hover:text-red-400 transition">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {transcriptList.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">No transcripts yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'generate' && (
        <form onSubmit={save} className="max-w-3xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Learner *</label>
              <select required value={selectedLearner} onChange={e => setSelectedLearner(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">Select learner…</option>
                {learnerList.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">DOCX Template (optional)</label>
              <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                <option value="">None</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Courses</label>
              <button type="button" onClick={addCourse} className="text-xs text-blue-400 hover:text-blue-300">+ Add Course</button>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 gap-0 text-xs text-gray-500 px-3 py-2 border-b border-gray-800">
                <span>Course Name *</span>
                <span>Code</span>
                <span>Hours</span>
                <span>Grade</span>
              </div>
              {courses.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-0 border-b border-gray-800 last:border-0 relative group">
                  {(['name', 'code', 'hours', 'grade'] as const).map(field => (
                    <input
                      key={field}
                      required={field === 'name'}
                      value={row[field]}
                      onChange={e => updateCourse(i, field, e.target.value)}
                      placeholder={field}
                      className="px-3 py-2 bg-transparent text-white text-sm border-r border-gray-800 last:border-0 focus:outline-none focus:bg-gray-800/50"
                    />
                  ))}
                  {courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCourse(i)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            Save Transcript
          </button>
        </form>
      )}

      {tab === 'templates' && (
        <div className="max-w-xl">
          <form onSubmit={uploadTemplate} className="flex items-end gap-3 mb-6">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Template Name *</label>
              <input required value={tplName} onChange={e => setTplName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">DOCX File *</label>
              <input required type="file" accept=".docx" onChange={e => setTplFile(e.target.files?.[0] ?? null)}
                className="text-xs text-gray-400" />
            </div>
            <button type="submit" disabled={uploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm rounded-lg transition">
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 truncate">{t.docx_url}</p>
                </div>
                <button onClick={async () => { await tplApi.delete(t.id); load() }} className="text-gray-600 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-sm text-gray-500">No templates yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
