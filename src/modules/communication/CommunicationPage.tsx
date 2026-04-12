import { useState, useEffect } from 'react'
import { MessageSquare, Mail, Plus, Pencil, Trash2, Send, Copy, Check, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

interface CommTemplate {
  id: number; name: string; channel: string; subject?: string
  body: string; variables?: string; category?: string
}

const CATEGORIES = ['all', 'demo', 'certificate', 'transcript', 'proposal']
const CHANNELS = [{ value: 'whatsapp', label: 'WhatsApp', icon: Smartphone }, { value: 'email', label: 'Email', icon: Mail }]

export default function CommunicationPage() {
  const isManager = useAuthStore(s => s.isManager())
  const [templates, setTemplates] = useState<CommTemplate[]>([])
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<CommTemplate | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showSend, setShowSend] = useState<CommTemplate | null>(null)
  const [editing, setEditing] = useState<CommTemplate | null>(null)

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const list = await (window as any).api.comm.list()
    setTemplates(list)
  }

  const filtered = templates.filter(t => category === 'all' || t.category === category)

  return (
    <div className="flex gap-6 h-full">
      {/* Left: template list */}
      <div className="w-72 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          {isManager && (
            <button onClick={() => { setEditing(null); setShowForm(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn('px-2 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent')}>
              {c}
            </button>
          ))}
        </div>

        {/* Templates */}
        <div className="space-y-1.5 overflow-y-auto">
          {filtered.map(t => (
            <button key={t.id} onClick={() => setSelected(t)}
              className={cn('w-full text-left p-3 rounded-xl border transition-colors',
                selected?.id === t.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent')}>
              <div className="flex items-start gap-2">
                {t.channel === 'whatsapp'
                  ? <Smartphone className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  : <Mail className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.channel} · {t.category || 'general'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: preview + actions */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <TemplatePreview
            template={selected}
            isManager={isManager}
            onEdit={() => { setEditing(selected); setShowForm(true) }}
            onDelete={async () => {
              if (!confirm('Delete this template?')) return
              await (window as any).api.comm.delete(selected.id)
              setSelected(null); loadTemplates()
            }}
            onSend={() => setShowSend(selected)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-sm">Select a template to preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <TemplateFormModal
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadTemplates() }}
        />
      )}

      {/* Send modal */}
      {showSend && (
        <SendModal
          template={showSend}
          onClose={() => setShowSend(null)}
        />
      )}
    </div>
  )
}

// ── Template Preview ──────────────────────────────────────────────────────────
function TemplatePreview({ template: t, isManager, onEdit, onDelete, onSend }: {
  template: CommTemplate; isManager: boolean
  onEdit: () => void; onDelete: () => void; onSend: () => void
}) {
  const vars = t.variables ? JSON.parse(t.variables) : []
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{t.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              t.channel === 'whatsapp' ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400')}>
              {t.channel === 'whatsapp' ? '📱 WhatsApp' : '✉️ Email'}
            </span>
            {t.category && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{t.category}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {isManager && <>
            <button onClick={onEdit} className="p-2 rounded-lg border border-border hover:bg-accent"><Pencil className="w-4 h-4" /></button>
            <button onClick={onDelete} className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
          </>}
          <button onClick={onSend} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Send className="w-4 h-4" /> Use Template
          </button>
        </div>
      </div>

      {t.subject && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
          <p className="text-sm">{t.subject}</p>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Message</p>
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{t.body}</pre>
      </div>

      {vars.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Variables to fill</p>
          <div className="flex flex-wrap gap-2">
            {vars.map((v: string) => (
              <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{`{{${v}}}`}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Send Modal ────────────────────────────────────────────────────────────────
function SendModal({ template, onClose }: { template: CommTemplate; onClose: () => void }) {
  const vars: string[] = template.variables ? JSON.parse(template.variables) : []
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(vars.map(v => [v, ''])))
  const [recipient, setRecipient] = useState('')
  const [rendered, setRendered] = useState('')
  const [renderedSubject, setRenderedSubject] = useState('')
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'fill' | 'preview'>('fill')

  async function handlePreview() {
    const res = await (window as any).api.comm.render(template.id, values)
    setRendered(res.body)
    setRenderedSubject(res.subject || '')
    setStep('preview')
  }

  async function handleCopy() {
    const text = renderedSubject ? `Subject: ${renderedSubject}\n\n${rendered}` : rendered
    await navigator.clipboard.writeText(text)
    await (window as any).api.comm.logSent({ template_id: template.id, recipient, channel: template.channel, subject: renderedSubject, message: rendered })
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function openWhatsApp() {
    const phone = recipient.replace(/\D/g, '')
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(rendered)}`
    ;(window as any).api.shell.openPath(url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg space-y-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{step === 'fill' ? 'Fill Variables' : 'Preview & Send'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {step === 'fill' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Recipient ({template.channel === 'whatsapp' ? 'phone number' : 'email'})</label>
              <input value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder={template.channel === 'whatsapp' ? '+20123456789' : 'name@email.com'}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {vars.map(v => (
              <div key={v}>
                <label className="block text-sm font-medium mb-1 capitalize">{v.replaceAll('_', ' ')}</label>
                <input value={values[v]} onChange={e => setValues(p => ({ ...p, [v]: e.target.value }))}
                  placeholder={`Enter ${v.replaceAll('_', ' ')}`}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={handlePreview} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Preview →</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {renderedSubject && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                <p className="text-sm">{renderedSubject}</p>
              </div>
            )}
            <div className="bg-muted rounded-xl p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{rendered}</pre>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('fill')} className="px-3 py-2 rounded-lg border border-border text-sm">← Back</button>
              <button onClick={handleCopy} className="flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg bg-muted text-sm hover:bg-accent">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Message'}
              </button>
              {template.channel === 'whatsapp' && recipient && (
                <button onClick={openWhatsApp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">
                  <Smartphone className="w-4 h-4" /> Open WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Template Form ─────────────────────────────────────────────────────────────
function TemplateFormModal({ initial, onClose, onSaved }: {
  initial: CommTemplate | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '', channel: initial?.channel ?? 'whatsapp',
    subject: initial?.subject ?? '', body: initial?.body ?? '', category: initial?.category ?? 'general'
  })

  async function handleSave() {
    if (!form.name || !form.body) return
    if (initial) await (window as any).api.comm.update(initial.id, form)
    else await (window as any).api.comm.create(form)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="font-semibold text-lg">{initial ? 'Edit Template' : 'New Template'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
              {['general','demo','certificate','transcript','proposal'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          {form.channel === 'email' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Use {{variables}} for dynamic content"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Message Body <span className="text-muted-foreground font-normal">(use {'{{variable_name}}'} for dynamic parts)</span></label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              rows={8} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save Template</button>
        </div>
      </div>
    </div>
  )
}
