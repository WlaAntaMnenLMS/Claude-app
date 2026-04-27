import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Edit, FileText, Upload, Star } from 'lucide-react'
import { api } from '@/lib/ipc'

const NAGUIB_TEMPLATE = `# {{program_name}} Training Proposal

**Prepared for:** {{client_name}}
**Industry:** {{client_industry}}
**Date:** {{proposal_date}}
**Prepared by:** {{sender_name}} — {{sender_title}}
**Vendor:** {{vendor_name}}

---

## Executive Summary

Dear {{client_contact_name}},

Thank you for the opportunity to present this proposal for {{client_name}}. We at {{vendor_name}} are pleased to offer a customized {{program_name}} program tailored to your organization's specific needs and goals.

{{executive_summary}}

---

## Program Overview

**Program Name:** {{program_name}}
**Target Audience:** {{target_audience}}
**Number of Participants:** {{participant_count}}
**Total Duration:** {{total_duration}}
**Language:** {{language}}
**Delivery Mode:** {{delivery_mode}}

---

## Learning Objectives

By the end of this program, participants will be able to:

1. {{objective_1}}
2. {{objective_2}}
3. {{objective_3}}
4. {{objective_4}}

---

## Program Tracks & Modules

### Track 1: {{track_1_name}}

| Module | Topic | Duration |
|--------|-------|----------|
| 1 | {{module_1_topic}} | {{module_1_duration}} |
| 2 | {{module_2_topic}} | {{module_2_duration}} |
| 3 | {{module_3_topic}} | {{module_3_duration}} |

### Track 2: {{track_2_name}}

| Module | Topic | Duration |
|--------|-------|----------|
| 4 | {{module_4_topic}} | {{module_4_duration}} |
| 5 | {{module_5_topic}} | {{module_5_duration}} |

---

## Schedule & Timeline

{{schedule_details}}

**Start Date:** {{start_date}}
**End Date:** {{end_date}}

---

## Methodology

{{methodology_description}}

Our approach combines:
- {{method_1}}
- {{method_2}}
- {{method_3}}

---

## Investment

| Item | Amount |
|------|--------|
| Program Fee ({{participant_count}} participants) | {{program_fee}} |
| Materials & Resources | {{materials_fee}} |
| **Total Investment** | **{{total_fee}}** |

**Payment Terms:** {{payment_terms}}

---

## About {{vendor_name}}

{{vendor_description}}

---

## Next Steps

1. Review this proposal and share feedback
2. Schedule a follow-up meeting to finalize scope
3. Sign the service agreement
4. Confirm participant list and logistics

---

*This proposal is valid for {{validity_days}} days from {{proposal_date}}.*

**{{sender_name}}**
{{sender_title}}
{{vendor_name}}
{{sender_email}}
`

const BLANK_TEMPLATE = `# {{program_name}} Training Proposal

**Prepared for:** {{client_name}}
**Date:** {{proposal_date}}
**Prepared by:** {{sender_name}} — {{sender_title}}

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

*{{vendor_name}} — Cairo, Egypt*`

export default function TemplateManager() {
  const [templates, setTemplates] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState({ name: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() { setTemplates(await api.proposal.templates.list()) }
  useEffect(() => { load() }, [])

  function openEdit(t: any) {
    setEditTarget(t)
    setForm({ name: t.name, content: t.content })
    setShowForm(true)
  }

  function openNew() {
    setEditTarget(null)
    setForm({ name: '', content: BLANK_TEMPLATE })
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

  function handleImportClick() { fileRef.current?.click() }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      // Auto-extract {{variables}}
      const detected = [...new Set((text.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2)))]
      const suggestedName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      setEditTarget(null)
      setForm({ name: suggestedName, content: text })
      setShowForm(true)
      if (detected.length > 0) {
        alert(`Detected ${detected.length} variable${detected.length > 1 ? 's' : ''}: ${detected.join(', ')}.\n\nReview the template below and save it.`)
      }
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const varCount = (t: any) => JSON.parse(t.variables || '[]').length

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{editTarget ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Template Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Standard Training Proposal"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Content — use {'{{variable_name}}'} for placeholders
          </label>
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={22}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
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
        <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".txt,.md,.html" className="hidden" onChange={handleFileImport} />
          <button onClick={handleImportClick} disabled={importing}
            className="flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg text-sm text-muted-foreground hover:text-foreground">
            <Upload className="w-3.5 h-3.5" /> {importing ? 'Importing…' : 'Import'}
          </button>
          <button onClick={openNew}
            className="flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg text-sm">
            <Plus className="w-3.5 h-3.5" /> New Template
          </button>
        </div>
      </div>

      {/* Seed hint if no templates */}
      {templates.length === 0 && (
        <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground space-y-3">
          <FileText className="w-8 h-8 mx-auto opacity-30" />
          <p>No templates yet.</p>
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <button onClick={openNew}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
              Create from scratch
            </button>
            <button onClick={() => {
              setEditTarget(null)
              setForm({ name: 'Naguib Selim — Full Proposal', content: NAGUIB_TEMPLATE })
              setShowForm(true)
            }}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-sm flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" /> Load Premium Template
            </button>
          </div>
        </div>
      )}

      {templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Premium Naguib Selim shortcut card */}
          <button onClick={() => {
            setEditTarget(null)
            setForm({ name: 'Naguib Selim — Full Proposal', content: NAGUIB_TEMPLATE })
            setShowForm(true)
          }}
            className="p-4 rounded-xl border border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 text-left transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <p className="font-medium text-sm text-yellow-200">Full Multi-Page Proposal</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-medium">Premium</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Complete proposal with tracks, modules, schedule, investment table, and company bio.
              {' '}~{[...NAGUIB_TEMPLATE.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i).length} variables.
            </p>
          </button>

          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    {t.is_premium && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-medium">Premium</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {varCount(t)} variable{varCount(t) !== 1 ? 's' : ''}
                    {varCount(t) > 0 && `: ${JSON.parse(t.variables || '[]').slice(0, 3).join(', ')}${varCount(t) > 3 ? '…' : ''}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-accent rounded" title="Edit">
                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-destructive/10 rounded" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 font-mono opacity-60">
                {t.content.slice(0, 120)}…
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
