import { useEffect, useState } from 'react'
import { Plus, X, MessageSquare, Mail, Copy, Check } from 'lucide-react'
import { commTemplates as api, type CommunicationTemplate } from '@/lib/api'
import { extractVariables, fillTemplate } from '@/lib/utils'

const blank: Omit<CommunicationTemplate, 'id' | 'created_at' | 'updated_at'> = {
  name: '', channel: 'whatsapp', subject: '', body: '', variables: '', category: '',
}

export default function CommunicationPage() {
  const [data, setData] = useState<CommunicationTemplate[]>([])
  const [selected, setSelected] = useState<CommunicationTemplate | null>(null)
  const [form, setForm] = useState({ ...blank })
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [fillVars, setFillVars] = useState<Record<string, string>>({})
  const [filled, setFilled] = useState('')
  const [copied, setCopied] = useState(false)

  const load = () => api.list().then(d => { setData(d) })
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ ...blank }); setEditing(null); setShowForm(true) }
  const openEdit = (t: CommunicationTemplate) => {
    setForm({ name: t.name, channel: t.channel, subject: t.subject ?? '', body: t.body, variables: t.variables ?? '', category: t.category ?? '' })
    setEditing(t)
    setShowForm(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const vars = JSON.stringify(extractVariables(form.body))
    if (editing) {
      await api.update(editing.id, { ...form, variables: vars })
    } else {
      await api.create({ ...form, variables: vars })
    }
    setShowForm(false)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this template?')) return
    await api.delete(id)
    setData(d => d.filter(t => t.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const selectTemplate = (t: CommunicationTemplate) => {
    setSelected(t)
    const vars = extractVariables(t.body)
    const v: Record<string, string> = {}
    vars.forEach(k => { v[k] = '' })
    setFillVars(v)
    setFilled('')
  }

  const generateFilled = () => {
    if (!selected) return
    setFilled(fillTemplate(selected.body, fillVars))
  }

  const copyText = async () => {
    await navigator.clipboard.writeText(filled || selected?.body || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categories = [...new Set(data.map(t => t.category).filter(Boolean))]
  const groups = categories.length > 0
    ? categories.map(cat => ({ cat, items: data.filter(t => t.category === cat) }))
    : [{ cat: 'All', items: data }]
  const uncategorized = data.filter(t => !t.category)
  if (uncategorized.length > 0 && categories.length > 0) groups.push({ cat: 'Other', items: uncategorized })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Communication Templates</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data.length} templates</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={16} /> New Template
        </button>
      </div>

      <div className="flex gap-6">
        {/* Template list */}
        <div className="w-72 shrink-0 space-y-4">
          {groups.map(({ cat, items }) => (
            <div key={cat}>
              <p className="text-xs text-gray-600 uppercase tracking-wider px-1 mb-1.5">{cat}</p>
              <div className="space-y-1">
                {items.map(t => (
                  <div
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                      selected?.id === t.id ? 'bg-blue-900/30 border border-blue-700' : 'hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    {t.channel === 'whatsapp' ? (
                      <MessageSquare size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <Mail size={14} className="text-blue-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{t.channel}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); openEdit(t) }} className="text-gray-600 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-gray-700 transition">
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {data.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No templates yet</p>}
        </div>

        {/* Preview & Fill */}
        {selected ? (
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selected.channel === 'whatsapp' ? 'bg-green-900/40 text-green-300' : 'bg-blue-900/40 text-blue-300'
                  }`}>
                    {selected.channel}
                  </span>
                  {selected.category && <span className="text-xs text-gray-500">{selected.category}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyText} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition">
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => remove(selected.id)} className="text-gray-500 hover:text-red-400 transition">
                  <X size={16} />
                </button>
              </div>
            </div>

            {selected.channel === 'email' && selected.subject && (
              <div className="mb-3 pb-3 border-b border-gray-800">
                <span className="text-xs text-gray-500">Subject: </span>
                <span className="text-sm text-gray-300">{selected.subject}</span>
              </div>
            )}

            {/* Variables */}
            {Object.keys(fillVars).length > 0 && (
              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg space-y-2">
                <p className="text-xs text-gray-400 font-medium mb-2">Fill variables</p>
                {Object.keys(fillVars).map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 font-mono w-32 shrink-0">{'{{'}{k}{'}}'}</span>
                    <input
                      value={fillVars[k]}
                      onChange={e => setFillVars(v => ({ ...v, [k]: e.target.value }))}
                      placeholder={k}
                      className="flex-1 px-2.5 py-1 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:outline-none"
                    />
                  </div>
                ))}
                <button onClick={generateFilled}
                  className="mt-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                  Generate Message
                </button>
              </div>
            )}

            {/* Body preview */}
            <div className="bg-gray-800 rounded-lg p-4">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                {filled || selected.body}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <p className="text-sm">Select a template to preview</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">{editing ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Channel</label>
                  <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value as 'whatsapp' | 'email' }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>
              {form.channel === 'email' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Subject</label>
                  <input value={form.subject ?? ''} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. demo, certificate, proposal"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Body * <span className="text-gray-600">(use {'{{'}<span>variable</span>{'}}'})</span>
                </label>
                <textarea required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={8} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                  {editing ? 'Save' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition">
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
