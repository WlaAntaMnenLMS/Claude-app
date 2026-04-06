import { useState } from 'react'
import { X } from 'lucide-react'
import { toUnixTs } from '@/lib/utils'

interface Props {
  instructors: any[]
  onSave: (data: any) => Promise<void>
  onClose: () => void
}

export default function DemoForm({ instructors, onSave, onClose }: Props) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const [form, setForm] = useState({
    instructor_id: '',
    scheduled_date: tomorrow.toISOString().split('T')[0],
    scheduled_time: '10:00',
    duration_mins: 60,
    location: '',
    topic: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.instructor_id) return
    setSaving(true)
    const dt = new Date(`${form.scheduled_date}T${form.scheduled_time}:00`)
    try {
      await onSave({
        instructor_id: Number(form.instructor_id),
        scheduled_at: toUnixTs(dt),
        duration_mins: Number(form.duration_mins),
        location: form.location || null,
        topic: form.topic || null,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Schedule Demo Session</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Instructor *</label>
            <select required value={form.instructor_id} onChange={set('instructor_id')}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select instructor…</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date *</label>
              <input type="date" required value={form.scheduled_date} onChange={set('scheduled_date')}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Time *</label>
              <input type="time" required value={form.scheduled_time} onChange={set('scheduled_time')}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (mins)</label>
              <input type="number" value={form.duration_mins}
                onChange={e => setForm(f => ({ ...f, duration_mins: Number(e.target.value) }))}
                min={15} max={240}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Location</label>
              <input value={form.location} onChange={set('location')} placeholder="Online / Room 3"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Demo Topic</label>
            <input value={form.topic} onChange={set('topic')} placeholder="e.g. Presentation Skills"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
