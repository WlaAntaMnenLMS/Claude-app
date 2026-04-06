import { useEffect, useState } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { api } from '@/lib/ipc'

interface Props {
  initial?: any
  onSave: (data: any) => Promise<void>
  onClose: () => void
}

export default function ProposalWizard({ initial, onSave, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [clients, setClients] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: initial?.title || '',
    program_name: initial?.program_name || '',
    client_id: initial?.client_id || '',
    template_id: initial?.template_id || '',
    content: initial?.content || '',
    variables_data: initial?.variables_data ? JSON.parse(initial.variables_data) : {},
    status: initial?.status || 'draft',
  })

  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', industry: '' })
  const [showNewClient, setShowNewClient] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [templateVars, setTemplateVars] = useState<string[]>([])

  useEffect(() => {
    Promise.all([api.client.list(), api.proposal.templates.list()]).then(([c, t]) => {
      setClients(c)
      setTemplates(t)
    })
  }, [])

  function applyTemplate(tmpl: any) {
    setSelectedTemplate(tmpl)
    const vars = JSON.parse(tmpl.variables || '[]') as string[]
    setTemplateVars(vars)

    // Render template content with current variable values
    let content = tmpl.content
    for (const v of vars) {
      content = content.replaceAll(`{{${v}}}`, form.variables_data[v] || `[${v}]`)
    }
    setForm(f => ({ ...f, template_id: tmpl.id, content }))
  }

  function updateVar(k: string, val: string) {
    const newVars = { ...form.variables_data, [k]: val }
    setForm(f => ({ ...f, variables_data: newVars }))
    // Re-render content
    if (selectedTemplate) {
      let content = selectedTemplate.content
      for (const v of templateVars) {
        content = content.replaceAll(`{{${v}}}`, newVars[v] || `[${v}]`)
      }
      setForm(f => ({ ...f, content }))
    }
  }

  async function addClient() {
    if (!newClient.name.trim()) return
    const c = await api.client.create(newClient)
    setClients(prev => [...prev, c])
    setForm(f => ({ ...f, client_id: c.id }))
    setShowNewClient(false)
    setNewClient({ name: '', email: '', phone: '', industry: '' })
  }

  async function submit() {
    setSaving(true)
    try {
      await onSave({
        ...form,
        client_id: form.client_id || null,
        template_id: form.template_id || null,
      })
    } finally { setSaving(false) }
  }

  const STEPS = ['Setup', 'Variables', 'Edit Content', 'Done']

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold">{initial ? 'Edit Proposal' : 'New Proposal'}</h2>
            <div className="flex items-center gap-2 mt-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    i === step ? 'bg-primary text-primary-foreground' :
                    i < step ? 'bg-green-500/20 text-green-300' : 'bg-secondary text-muted-foreground'
                  }`}>{i + 1}. {s}</span>
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Proposal Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Leadership Development Program — ABC Company"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Program Name</label>
                <input value={form.program_name} onChange={e => setForm(f => ({ ...f, program_name: e.target.value }))}
                  placeholder="e.g. Leadership Essentials"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Client</label>
                  <button onClick={() => setShowNewClient(s => !s)}
                    className="text-xs text-primary hover:underline">+ New Client</button>
                </div>
                {showNewClient && (
                  <div className="bg-secondary rounded-lg p-3 space-y-2 mb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={newClient.name} onChange={e => setNewClient(n => ({ ...n, name: e.target.value }))}
                        placeholder="Company name *"
                        className="bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <input value={newClient.email} onChange={e => setNewClient(n => ({ ...n, email: e.target.value }))}
                        placeholder="Email"
                        className="bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <input value={newClient.phone} onChange={e => setNewClient(n => ({ ...n, phone: e.target.value }))}
                        placeholder="Phone"
                        className="bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <input value={newClient.industry} onChange={e => setNewClient(n => ({ ...n, industry: e.target.value }))}
                        placeholder="Industry"
                        className="bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <button onClick={addClient}
                      className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-lg">Add Client</button>
                  </div>
                )}
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                  <option value="">No client / personal use</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Template (optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm(f => ({ ...f, template_id: '' }))}
                    className={`p-2 rounded-lg border text-sm text-left transition-colors ${
                      !form.template_id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:bg-accent'
                    }`}>
                    <p className="font-medium">Blank</p>
                    <p className="text-xs text-muted-foreground">Start from scratch</p>
                  </button>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className={`p-2 rounded-lg border text-sm text-left transition-colors ${
                        form.template_id === t.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:bg-accent'
                      }`}>
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {JSON.parse(t.variables || '[]').length} variables
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {templateVars.length === 0 ? (
                <p className="text-muted-foreground text-sm">No template selected or no variables found. Click Next to edit content directly.</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Fill in the template variables. The proposal will be updated automatically.</p>
                  {templateVars.map(v => (
                    <div key={v}>
                      <label className="text-xs text-muted-foreground mb-1 block capitalize">{v.replace(/_/g, ' ')}</label>
                      <input
                        value={form.variables_data[v] || ''}
                        onChange={e => updateVar(v, e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Edit the proposal content directly:</p>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={18}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary font-mono resize-none"
              />
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <p className="font-semibold">Ready to save!</p>
              <p className="text-sm text-muted-foreground">
                Proposal "<strong>{form.title}</strong>" is ready.
                After saving, you can export it as DOCX from the proposals list.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !form.title.trim()}
              className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={saving}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Proposal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
