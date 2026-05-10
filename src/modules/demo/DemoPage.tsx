import { useEffect, useState } from 'react'
import { Plus, X, Calendar, Clock, MapPin, BookOpen, Star } from 'lucide-react'
import { demos as api, instructors as instrApi, type DemoSession, type Instructor } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

type Status = DemoSession['status']

const blank = {
  instructor_id: 0,
  scheduled_at: '',
  duration_mins: 60,
  location: '',
  topic: '',
  status: 'scheduled' as Status,
  feedback: '',
  score: undefined as number | undefined,
}

export default function DemoPage() {
  const [data, setData] = useState<DemoSession[]>([])
  const [instrList, setInstrList] = useState<Instructor[]>([])
  const [form, setForm] = useState({ ...blank })
  const [editing, setEditing] = useState<DemoSession | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | 'all'>('all')

  const load = async () => {
    const [d, i] = await Promise.all([api.list(), instrApi.list()])
    setData(d)
    setInstrList(i)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ ...blank, scheduled_at: new Date().toISOString().slice(0, 16) })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (d: DemoSession) => {
    setForm({
      instructor_id: d.instructor_id,
      scheduled_at: new Date(d.scheduled_at).toISOString().slice(0, 16),
      duration_mins: d.duration_mins,
      location: d.location ?? '',
      topic: d.topic ?? '',
      status: d.status,
      feedback: d.feedback ?? '',
      score: d.score,
    })
    setEditing(d)
    setShowForm(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    }
    if (editing) {
      await api.update(editing.id, payload)
    } else {
      await api.create(payload)
    }
    setShowForm(false)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this demo?')) return
    await api.delete(id)
    setData(d => d.filter(s => s.id !== id))
  }

  const statusColor = (s: Status) => ({
    scheduled: 'bg-blue-900/40 text-blue-300 border-blue-800',
    done: 'bg-green-900/40 text-green-300 border-green-800',
    cancelled: 'bg-gray-800 text-gray-500 border-gray-700',
  }[s])

  const filtered = filter === 'all' ? data : data.filter(d => d.status === filter)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Demo Sessions</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data.length} sessions</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus size={16} /> Schedule Demo
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'scheduled', 'done', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border transition capitalize ${
              filter === f
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          No demos found. <button onClick={openNew} className="text-blue-400 hover:underline">Schedule one</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <div
              key={d.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:border-gray-700 transition"
              onClick={() => openEdit(d)}
            >
              <div className="text-center bg-gray-800 rounded-lg p-2.5 shrink-0 min-w-[3rem]">
                <p className="text-xs text-gray-500">{new Date(d.scheduled_at).toLocaleDateString('en-GB', { month: 'short' })}</p>
                <p className="text-lg font-bold text-white">{new Date(d.scheduled_at).getDate()}</p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">
                    {d.instructors?.full_name ?? 'Unknown Instructor'}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(d.status)}`}>
                    {d.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={11} /> {formatDateTime(d.scheduled_at)}</span>
                  {d.location && <span className="flex items-center gap-1"><MapPin size={11} /> {d.location}</span>}
                  {d.topic && <span className="flex items-center gap-1"><BookOpen size={11} /> {d.topic}</span>}
                  {d.score && <span className="flex items-center gap-1"><Star size={11} className="text-amber-400" /> {d.score}/10</span>}
                </div>

                {d.feedback && (
                  <p className="text-xs text-gray-600 mt-1.5 italic truncate">"{d.feedback}"</p>
                )}
              </div>

              <button
                onClick={e => { e.stopPropagation(); remove(d.id) }}
                className="text-gray-600 hover:text-red-400 transition shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">{editing ? 'Edit Demo' : 'Schedule Demo'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Instructor *</label>
                <select
                  required
                  value={form.instructor_id}
                  onChange={e => setForm(f => ({ ...f, instructor_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                >
                  <option value={0}>Select instructor…</option>
                  {instrList.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date & Time *</label>
                <input
                  type="datetime-local" required
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (mins)</label>
                <input
                  type="number" min={15}
                  value={form.duration_mins}
                  onChange={e => setForm(f => ({ ...f, duration_mins: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                />
              </div>
              {[['location', 'Location', 'text'], ['topic', 'Topic', 'text']].map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, unknown>)[key] as string ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {(form.status === 'done' || editing?.status === 'done') && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Score (1–10)</label>
                    <input
                      type="number" min={1} max={10}
                      value={form.score ?? ''}
                      onChange={e => setForm(f => ({ ...f, score: Number(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Feedback</label>
                    <textarea
                      value={form.feedback}
                      onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                  {editing ? 'Save' : 'Schedule'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg transition hover:bg-gray-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
