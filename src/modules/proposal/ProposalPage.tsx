import { useEffect, useState } from 'react'
import { Plus, X, Download, FileText, ChevronRight } from 'lucide-react'
import {
  proposals as api, proposalTemplates, clients as clientsApi,
  type Proposal, type ProposalTemplate, type Client,
} from '@/lib/api'
import { extractVariables, fillTemplate, formatDate, downloadBlob } from '@/lib/utils'

type Status = Proposal['status']

const statusColor = (s: Status) => ({
  draft:    'bg-gray-800 text-gray-400 border-gray-700',
  sent:     'bg-blue-900/40 text-blue-300 border-blue-800',
  approved: 'bg-green-900/40 text-green-300 border-green-800',
  rejected: 'bg-red-900/40 text-red-400 border-red-800',
}[s])

export default function ProposalPage() {
  const [data, setData] = useState<Proposal[]>([])
  const [templates, setTemplates] = useState<ProposalTemplate[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [selected, setSelected] = useState<Proposal | null>(null)
  const [step, setStep] = useState<'list' | 'new' | 'edit'>('list')

  // New proposal wizard
  const [wiz, setWiz] = useState({ client_id: '', template_id: '', title: '', program_name: '' })
  const [content, setContent] = useState('')
  const [vars, setVars] = useState<Record<string, string>>({})

  const load = async () => {
    const [d, t, c] = await Promise.all([api.list(), proposalTemplates.list(), clientsApi.list()])
    setData(d)
    setTemplates(t)
    setClientList(c)
  }

  useEffect(() => { load() }, [])

  const pickTemplate = (tplId: string) => {
    const tpl = templates.find(t => String(t.id) === tplId)
    if (tpl) {
      setContent(tpl.content)
      const extracted = extractVariables(tpl.content)
      const v: Record<string, string> = {}
      extracted.forEach(k => { v[k] = '' })
      setVars(v)
    }
    setWiz(w => ({ ...w, template_id: tplId }))
  }

  const saveNew = async (e: React.FormEvent) => {
    e.preventDefault()
    const filled = fillTemplate(content, vars)
    await api.create({
      client_id: wiz.client_id ? Number(wiz.client_id) : undefined,
      template_id: wiz.template_id ? Number(wiz.template_id) : undefined,
      title: wiz.title,
      program_name: wiz.program_name,
      content: filled,
      variables_data: JSON.stringify(vars),
      status: 'draft',
    })
    setStep('list')
    load()
  }

  const updateStatus = async (id: number, status: Status) => {
    await api.update(id, { status })
    setData(d => d.map(p => p.id === id ? { ...p, status } : p))
    if (selected?.id === id) setSelected(s => s ? { ...s, status } : s)
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this proposal?')) return
    await api.delete(id)
    setData(d => d.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const exportTxt = (p: Proposal) => {
    const blob = new Blob([p.title + '\n\n' + p.content], { type: 'text/plain' })
    downloadBlob(blob, `${p.title.replace(/\s+/g, '_')}.txt`)
  }

  if (step === 'new') {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('list')} className="text-gray-400 hover:text-white"><X size={20} /></button>
          <h1 className="text-xl font-bold text-white">New Proposal</h1>
        </div>

        <form onSubmit={saveNew} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Proposal Title *</label>
              <input required value={wiz.title}
                onChange={e => setWiz(w => ({ ...w, title: e.target.value }))}
                placeholder="e.g. Leadership Training Proposal"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Program Name</label>
              <input value={wiz.program_name}
                onChange={e => setWiz(w => ({ ...w, program_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Client</label>
              <select value={wiz.client_id} onChange={e => setWiz(w => ({ ...w, client_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                <option value="">No client</option>
                {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Template</label>
              <select value={wiz.template_id} onChange={e => pickTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                <option value="">Blank</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Variable fills */}
          {Object.keys(vars).length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <p className="text-xs text-gray-400 font-medium mb-2">Fill template variables</p>
              {Object.keys(vars).map(k => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-mono w-32 shrink-0">{'{{'}{k}{'}}'}</span>
                  <input
                    value={vars[k]}
                    onChange={e => setVars(v => ({ ...v, [k]: e.target.value }))}
                    placeholder={k}
                    className="flex-1 px-2.5 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Content *</label>
            <textarea required value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              placeholder="Write your proposal content here. Use {{variable}} for dynamic values."
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none resize-y font-mono"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              Save as Draft
            </button>
            <button type="button" onClick={() => setStep('list')} className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg transition hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Proposals</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data.length} proposals</p>
        </div>
        <button
          onClick={() => { setWiz({ client_id: '', template_id: '', title: '', program_name: '' }); setContent(''); setVars({}); setStep('new') }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus size={16} /> New Proposal
        </button>
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="w-80 shrink-0 space-y-2">
          {data.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">No proposals yet.</p>
          )}
          {data.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                selected?.id === p.id
                  ? 'bg-blue-900/20 border-blue-700'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-semibold text-white leading-tight">{p.title}</p>
                <ChevronRight size={14} className="text-gray-600 shrink-0 mt-0.5" />
              </div>
              {p.clients?.name && <p className="text-xs text-gray-500 mt-1">{p.clients.name}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(p.status)}`}>{p.status}</span>
                <span className="text-xs text-gray-600">{formatDate(p.created_at)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected && (
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-5 min-h-[400px]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                {selected.clients?.name && <p className="text-sm text-gray-400">{selected.clients.name}</p>}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selected.status}
                  onChange={e => updateStatus(selected.id, e.target.value as Status)}
                  className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => exportTxt(selected)} className="p-1.5 text-gray-400 hover:text-blue-400 transition" title="Export">
                  <Download size={16} />
                </button>
                <button onClick={() => remove(selected.id)} className="p-1.5 text-gray-400 hover:text-red-400 transition">
                  <X size={16} />
                </button>
              </div>
            </div>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{selected.content}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
