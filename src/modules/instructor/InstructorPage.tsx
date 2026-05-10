import { useEffect, useState } from 'react'
import { Plus, X, ExternalLink, Star, Phone, Mail, Briefcase } from 'lucide-react'
import { instructors as api, type Instructor } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type Status = Instructor['status']

const COLUMNS: { key: Status; label: string; color: string }[] = [
  { key: 'applied',        label: 'Applied',        color: 'border-gray-600' },
  { key: 'demo_scheduled', label: 'Demo Scheduled', color: 'border-blue-600' },
  { key: 'demo_done',      label: 'Demo Done',      color: 'border-purple-600' },
  { key: 'hired',          label: 'Hired ✓',        color: 'border-green-600' },
  { key: 'rejected',       label: 'Rejected',       color: 'border-red-700' },
]

const blank: Omit<Instructor, 'id' | 'created_at' | 'updated_at'> = {
  full_name: '', email: '', phone: '', specialization: '',
  cv_url: '', linkedin_url: '', status: 'applied', notes: '',
}

export default function InstructorPage() {
  const [data, setData] = useState<Instructor[]>([])
  const [form, setForm] = useState({ ...blank })
  const [editing, setEditing] = useState<Instructor | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => api.list().then(d => { setData(d); setLoading(false) })
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ ...blank }); setEditing(null); setShowForm(true) }
  const openEdit = (i: Instructor) => { setForm({ ...i }); setEditing(i); setShowForm(true) }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await api.update(editing.id, form)
    } else {
      await api.create(form)
    }
    setShowForm(false)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this instructor?')) return
    await api.delete(id)
    setData(d => d.filter(i => i.id !== id))
  }

  const updateStatus = async (id: number, status: Status) => {
    await api.update(id, { status })
    setData(d => d.map(i => i.id === id ? { ...i, status } : i))
  }

  const col = (key: Status) => data.filter(i => i.status === key)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Instructor Pipeline</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data.length} instructors total</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus size={16} /> Add Instructor
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col_ => (
            <div key={col_.key} className="w-64 shrink-0">
              <div className={`px-3 py-2 rounded-t-lg border-t-2 bg-gray-900 border-gray-800 ${col_.color} flex items-center justify-between mb-2`}>
                <span className="text-sm font-semibold text-gray-200">{col_.label}</span>
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">
                  {col(col_.key).length}
                </span>
              </div>
              <div className="space-y-2">
                {col(col_.key).map(inst => (
                  <div
                    key={inst.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-3 cursor-pointer hover:border-gray-700 transition"
                    onClick={() => openEdit(inst)}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-semibold text-white leading-tight">{inst.full_name}</p>
                      <button
                        onClick={e => { e.stopPropagation(); remove(inst.id) }}
                        className="text-gray-600 hover:text-red-400 transition shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {inst.specialization && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Briefcase size={11} /> {inst.specialization}
                      </p>
                    )}
                    {inst.rating && (
                      <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <Star size={11} /> {inst.rating}/10
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1.5">{formatDate(inst.created_at)}</p>

                    {/* Quick status change */}
                    <select
                      value={inst.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateStatus(inst.id, e.target.value as Status)}
                      className="mt-2 w-full text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-1.5 py-1 focus:outline-none"
                    >
                      {COLUMNS.map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">{editing ? 'Edit Instructor' : 'Add Instructor'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              {([
                ['full_name', 'Full Name *', 'text', true],
                ['email', 'Email', 'email', false],
                ['phone', 'Phone', 'tel', false],
                ['specialization', 'Specialization', 'text', false],
                ['linkedin_url', 'LinkedIn URL', 'url', false],
                ['cv_url', 'CV URL', 'url', false],
              ] as [keyof typeof form, string, string, boolean][]).map(([key, label, type, req]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input
                    type={type}
                    required={req}
                    value={(form[key] as string) ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
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
                  {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rating (1–10)</label>
                <input
                  type="number" min={1} max={10}
                  value={form.rating ?? ''}
                  onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) || undefined }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                  {editing ? 'Save Changes' : 'Add Instructor'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
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
