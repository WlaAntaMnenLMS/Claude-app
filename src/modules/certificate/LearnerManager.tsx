import { useEffect, useState, useRef } from 'react'
import { Plus, Upload, Trash2, Users } from 'lucide-react'
import { api } from '@/lib/ipc'
import Papa from 'papaparse'

export default function LearnerManager() {
  const [learners, setLearners] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', national_id: '', email: '', phone: '', organization: '' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

  async function load() { setLearners(await api.learner.list()) }
  useEffect(() => { load() }, [])

  async function saveOne() {
    if (!form.full_name.trim()) return
    setSaving(true)
    try { await api.learner.create(form); setForm({ full_name: '', national_id: '', email: '', phone: '', organization: '' }); setShowForm(false); load() }
    finally { setSaving(false) }
  }

  async function handleCSV(file: File) {
    setImporting(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = (res.data as any[]).map(r => ({
          full_name: r.full_name || r.name || r['Full Name'] || '',
          national_id: r.national_id || r['National ID'] || '',
          email: r.email || r.Email || '',
          phone: r.phone || r.Phone || '',
          organization: r.organization || r.Organization || '',
        })).filter(r => r.full_name)
        await api.learner.createBulk(rows)
        load()
        setImporting(false)
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">{learners.length} Learners</p>
        </div>
        <div className="flex gap-2">
          <input ref={csvRef} type="file" accept=".csv" className="hidden"
            onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])} />
          <button onClick={() => csvRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg text-sm">
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
            <Plus className="w-3.5 h-3.5" /> Add Learner
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'full_name', label: 'Full Name *' },
              { k: 'national_id', label: 'National ID' },
              { k: 'email', label: 'Email' },
              { k: 'phone', label: 'Phone' },
              { k: 'organization', label: 'Organization' },
            ].map(({ k, label }) => (
              <div key={k} className={k === 'organization' ? 'col-span-2' : ''}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={saveOne} disabled={saving}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">CSV format: full_name, national_id, email, phone, organization</p>

      {learners.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-10 text-center text-muted-foreground">
          No learners yet. Add manually or import a CSV.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'National ID', 'Email', 'Phone', 'Organization', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learners.map(l => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="px-3 py-2 font-medium">{l.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{l.national_id || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.email || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.phone || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.organization || '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={async () => { await api.learner.delete(l.id); load() }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
