import { useEffect, useState } from 'react'
import { Users, Plus, Search, LayoutGrid, List } from 'lucide-react'
import { api } from '@/lib/ipc'
import StatusBadge from '@/components/shared/StatusBadge'
import InstructorForm from './InstructorForm'
import InstructorProfile from './InstructorProfile'
import HiringKanban from './HiringKanban'

export default function InstructorPage() {
  const [instructors, setInstructors] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [profileId, setProfileId] = useState<number | null>(null)

  async function load() {
    setInstructors(await api.instructor.list())
  }
  useEffect(() => { load() }, [])

  const filtered = instructors.filter(i =>
    i.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.specialization || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: number) {
    if (!confirm('Delete this instructor and all their demo sessions?')) return
    await api.instructor.delete(id)
    load()
  }

  async function handleStatusChange(id: number, status: string) {
    await api.instructor.update(id, { status })
    load()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold">Instructor Hiring</h1>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full">
            {instructors.length}
          </span>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Instructor
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search instructors..."
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          <button onClick={() => setView('list')}
            className={`p-1.5 rounded ${view === 'list' ? 'bg-card' : ''}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView('kanban')}
            className={`p-1.5 rounded ${view === 'kanban' ? 'bg-card' : ''}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <HiringKanban
          instructors={filtered}
          onStatusChange={handleStatusChange}
          onOpen={id => setProfileId(id)}
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Specialization</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Demos</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Rating</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                  No instructors found. Add your first one!
                </td></tr>
              ) : filtered.map(inst => (
                <tr key={inst.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setProfileId(inst.id)}
                      className="font-medium hover:text-primary transition-colors"
                    >{inst.full_name}</button>
                    {inst.phone && <p className="text-xs text-muted-foreground">{inst.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.specialization || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.email || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={inst.status}
                      onChange={e => handleStatusChange(inst.id, e.target.value)}
                      className="bg-transparent text-xs outline-none"
                    >
                      {['applied','demo_scheduled','demo_done','hired','rejected'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.demo_count || 0}</td>
                  <td className="px-4 py-3">
                    {inst.rating ? `${inst.rating.toFixed(1)} ⭐` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditTarget(inst); setShowForm(true) }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >Edit</button>
                      <button
                        onClick={() => handleDelete(inst.id)}
                        className="text-xs text-destructive hover:text-destructive/80"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <InstructorForm
          initial={editTarget}
          onSave={async (data) => {
            if (editTarget) await api.instructor.update(editTarget.id, data)
            else await api.instructor.create(data)
            setShowForm(false)
            load()
          }}
          onClose={() => setShowForm(false)}
        />
      )}
      {profileId !== null && (
        <InstructorProfile
          id={profileId}
          onClose={() => setProfileId(null)}
          onEdit={(inst) => { setProfileId(null); setEditTarget(inst); setShowForm(true) }}
        />
      )}
    </div>
  )
}
