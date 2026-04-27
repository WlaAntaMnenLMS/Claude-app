import { useEffect, useState, useMemo } from 'react'
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
    variables_data: initial?.variables_data ? JSON.parse(initial.variables_data) : {} as Record<string, string>,
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
    setForm(f => ({ ...f, template_id: tmpl.id, content: tmpl.content }))
  }

  function updateVar(k: string, val: string) {
    setForm(f => ({ ...f, variables_data: { ...f.variables_data, [k]: val } }))
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
        variables_data: JSON.stringify(form.variables_data),
      })
    } finally { setSaving(false) }
  }

  const STEPS = ['Setup', 'Variables', 'Edit Content', 'Done']

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-5xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
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
        <div className="flex-1 overflow-hidden">
          {step === 0 && <StepSetup form={form} setForm={setForm} clients={clients} templates={templates}
            newClient={newClient} setNewClient={setNewClient} showNewClient={showNewClient}
            setShowNewClient={setShowNewClient} addClient={addClient} applyTemplate={applyTemplate} />}

          {step === 1 && <StepVariables vars={templateVars} values={form.variables_data}
            rawTemplate={selectedTemplate?.content || form.content} updateVar={updateVar} />}

          {step === 2 && <StepEditContent form={form} setForm={setForm} />}

          {step === 3 && <StepDone title={form.title} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.title.trim()}
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

// ── Step 1: Setup ─────────────────────────────────────────────────────────────

function StepSetup({ form, setForm, clients, templates, newClient, setNewClient, showNewClient, setShowNewClient, addClient, applyTemplate }: any) {
  const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary'
  return (
    <div className="overflow-y-auto p-6 h-full space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Proposal Title *</label>
        <input value={form.title} onChange={(e: any) => setForm((f: any) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Leadership Development Program — ABC Company"
          className={inputCls} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Program Name</label>
        <input value={form.program_name} onChange={(e: any) => setForm((f: any) => ({ ...f, program_name: e.target.value }))}
          placeholder="e.g. Leadership Essentials"
          className={inputCls} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-muted-foreground">Client</label>
          <button onClick={() => setShowNewClient((s: boolean) => !s)} className="text-xs text-primary hover:underline">+ New Client</button>
        </div>
        {showNewClient && (
          <div className="bg-secondary rounded-lg p-3 space-y-2 mb-2">
            <div className="grid grid-cols-2 gap-2">
              {[['name', 'Company name *'], ['email', 'Email'], ['phone', 'Phone'], ['industry', 'Industry']].map(([k, p]) => (
                <input key={k} value={(newClient as any)[k]} onChange={(e: any) => setNewClient((n: any) => ({ ...n, [k]: e.target.value }))}
                  placeholder={p}
                  className="bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
              ))}
            </div>
            <button onClick={addClient} className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-lg">Add Client</button>
          </div>
        )}
        <select value={form.client_id} onChange={(e: any) => setForm((f: any) => ({ ...f, client_id: e.target.value }))}
          className={inputCls}>
          <option value="">No client / personal use</option>
          {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Template (optional)</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setForm((f: any) => ({ ...f, template_id: '', content: '' })) }}
            className={`p-3 rounded-xl border text-sm text-left transition-colors ${!form.template_id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:bg-accent'}`}>
            <p className="font-medium">Blank</p>
            <p className="text-xs text-muted-foreground">Start from scratch</p>
          </button>
          {templates.map((t: any) => (
            <button key={t.id} onClick={() => applyTemplate(t)}
              className={`p-3 rounded-xl border text-sm text-left transition-colors ${form.template_id === t.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:bg-accent'}`}>
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{t.name}</p>
                {t.is_premium && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-medium">Premium</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {JSON.parse(t.variables || '[]').length} variables
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Variables with live split-pane preview ────────────────────────────

function StepVariables({ vars, values, rawTemplate, updateVar }: {
  vars: string[]
  values: Record<string, string>
  rawTemplate: string
  updateVar: (k: string, v: string) => void
}) {
  const preview = useMemo(() => {
    if (!rawTemplate) return ''
    let html = rawTemplate
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')

    // Highlight each variable: green if filled, purple if empty
    html = html.replace(/\{\{(\w+)\}\}/g, (_: string, name: string) => {
      const val = values[name]
      if (val) {
        return `<mark style="background:rgba(34,197,94,0.2);color:#86efac;border-radius:3px;padding:0 2px;">${val}</mark>`
      }
      return `<mark style="background:rgba(168,85,247,0.2);color:#c4b5fd;border-radius:3px;padding:0 2px;">{{${name}}}</mark>`
    })
    return html
  }, [rawTemplate, values])

  if (vars.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
        No template selected or no variables found. Click Next to edit content directly.
      </div>
    )
  }

  return (
    <div className="flex h-full divide-x divide-border overflow-hidden">
      {/* Left: form */}
      <div className="w-72 shrink-0 overflow-y-auto p-5 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Variables</p>
        {vars.map(v => (
          <div key={v}>
            <label className="text-xs text-muted-foreground mb-1 block capitalize">{v.replace(/_/g, ' ')}</label>
            <input value={values[v] || ''} onChange={e => updateVar(v, e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">
          <span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: 'rgba(168,85,247,0.4)' }} />
          Unfilled &nbsp;
          <span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: 'rgba(34,197,94,0.4)' }} />
          Filled
        </p>
      </div>
      {/* Right: live preview */}
      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Live Preview</p>
        <div
          className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-mono bg-secondary/50 rounded-xl p-4 min-h-40"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </div>
    </div>
  )
}

// ── Step 3: Edit content ──────────────────────────────────────────────────────

function StepEditContent({ form, setForm }: any) {
  return (
    <div className="flex flex-col h-full p-6 gap-3">
      <p className="text-sm text-muted-foreground shrink-0">Edit the proposal content directly:</p>
      <textarea
        value={form.content}
        onChange={(e: any) => setForm((f: any) => ({ ...f, content: e.target.value }))}
        className="flex-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary font-mono resize-none"
      />
    </div>
  )
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────

function StepDone({ title }: { title: string }) {
  const exportFolder = localStorage.getItem('ld_export_folder') || ''
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center py-8 space-y-3 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <span className="text-3xl">✓</span>
        </div>
        <p className="font-semibold">Ready to save!</p>
        <p className="text-sm text-muted-foreground">
          Proposal "<strong>{title}</strong>" is ready. After saving, export it as DOCX from the proposals list.
        </p>
        {exportFolder && (
          <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            Will be exported to:<br />
            <span className="font-mono text-yellow-300">{exportFolder}</span>
          </p>
        )}
      </div>
    </div>
  )
}
