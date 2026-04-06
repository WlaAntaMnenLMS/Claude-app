import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, FileText } from 'lucide-react'
import { api } from '@/lib/ipc'

export default function TemplateManager() {
  const [templates, setTemplates] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState({ name: '', content: '' })
  const [saving, setSaving] = useState(false)

  async function load() { setTemplates(await api.proposal.templates.list()) }
  useEffect(() => { load() }, [])

  function openEdit(t: any) {
    setEditTarget(t)
    setForm({ name: t.name, content: t.content })
    setShowForm(true)
  }

  function openNew() {
    setEditTarget(null)
    setForm({
      name: '',
      content: `# {{program_name}} Training Proposal

**Prepared for:** {{client_name}}
**Date:** {{date}}
**Prepared by:** Ahmed Younes — Learning & Development Manager

---

## Program Overview

{{program_description}}

## Objectives

By the end of this program, participants will be able to:
- {{objective_1}}
- {{objective_2}}
- {{objective_3}}

## Duration & Schedule

{{duration}}

## Investment

{{investment_details}}

---

*Trainnovation — Cairo, Egypt*`
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      if (editTarget) await api.proposal.templates.update(editTarget.id, form)
      else await api.proposal.templates.create(form)
      setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this template?')) return
    await api.proposal.templates.delete(id)
    load()
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{editTarget ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={() => setShowForm(false)}
            className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Template Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Standard Training Proposal"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Content — use {`{{variable_name}}`} for placeholders
          </label>
          <textarea
            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={20}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowForm(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        <button onClick={openNew}
          className="flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg text-sm">
          <Plus className="w-3.5 h-3.5" /> New Template
        </button>
      </div>
      {templates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No templates yet. Create your first one!</p>
          <button onClick={openNew}
            className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Variables: {JSON.parse(t.variables || '[]').join(', ') || 'none'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)}
                    className="p-1.5 hover:bg-accent rounded"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(t.id)}
                    className="p-1.5 hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 font-mono">
                {t.content.slice(0, 100)}…
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
