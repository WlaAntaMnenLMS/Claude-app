import { useEffect, useState } from 'react'
import { FileText, Plus, Search, Download, Trash2, Edit } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import ExportButton from '@/components/shared/ExportButton'
import ProposalWizard from './ProposalWizard'
import TemplateManager from './TemplateManager'

export default function ProposalPage() {
  const [proposals, setProposals] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'proposals' | 'templates'>('proposals')
  const [showWizard, setShowWizard] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)

  async function load() {
    setProposals(await api.proposal.list())
  }
  useEffect(() => { load() }, [])

  const filtered = proposals.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.client_name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleExport(id: number, format: 'docx' | 'pdf') {
    try {
      const { outputPath } = await api.proposal.export(id, format)
      await api.shell.showItemInFolder(outputPath)
    } catch (err: any) {
      alert('Export failed: ' + err.message)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this proposal?')) return
    await api.proposal.delete(id)
    load()
  }

  async function handleStatusChange(id: number, status: string) {
    await api.proposal.update(id, { ...proposals.find(p => p.id === id), status })
    load()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-bold">Proposals</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton module="proposals" />
          <button
          onClick={() => { setEditTarget(null); setShowWizard(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Proposal
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {(['proposals', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1 rounded text-sm capitalize transition-colors ${
              tab === t ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <TemplateManager />
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search proposals…"
              className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {/* List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
                No proposals yet. Create your first one!
              </div>
            ) : filtered.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{p.title}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    {p.client_name && (
                      <p className="text-sm text-muted-foreground mt-0.5">Client: {p.client_name}</p>
                    )}
                    {p.program_name && (
                      <p className="text-xs text-muted-foreground">Program: {p.program_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Created: {formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={p.status}
                      onChange={e => handleStatusChange(p.id, e.target.value)}
                      className="bg-secondary border border-border rounded text-xs px-2 py-1 outline-none"
                    >
                      {['draft', 'sent', 'approved', 'rejected'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button onClick={() => handleExport(p.id, 'docx')}
                      className="p-1.5 hover:bg-accent rounded-lg" title="Export DOCX">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => { setEditTarget(p); setShowWizard(true) }}
                      className="p-1.5 hover:bg-accent rounded-lg" title="Edit">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showWizard && (
        <ProposalWizard
          initial={editTarget}
          onSave={async (data) => {
            if (editTarget) await api.proposal.update(editTarget.id, data)
            else await api.proposal.create(data)
            setShowWizard(false)
            load()
          }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  )
}
