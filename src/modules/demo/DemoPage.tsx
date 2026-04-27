import { useEffect, useState } from 'react'
import { CalendarDays, Plus, CalendarPlus } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import DemoForm from './DemoForm'
import DemoFeedbackForm from './DemoFeedbackForm'
import { downloadIcs } from '@/lib/ics'

export default function DemoPage() {
  const [demos, setDemos] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'done' | 'cancelled'>('all')
  const [showForm, setShowForm] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<any>(null)

  async function load() {
    const [d, i] = await Promise.all([api.demo.list(), api.instructor.list()])
    setDemos(d)
    setInstructors(i)
  }
  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? demos : demos.filter(d => d.status === filter)

  async function handleDelete(id: number) {
    if (!confirm('Delete this demo session?')) return
    await api.demo.delete(id)
    load()
  }

  function handleDownloadIcs(demo: any) {
    downloadIcs(
      {
        title: `Demo: ${demo.instructor_name || 'Instructor'} — ${demo.topic || 'No topic'}`,
        startUnix: demo.scheduled_at,
        durationMins: demo.duration_mins || 60,
        location: demo.location || '',
        description: `Instructor demo session.\nInstructor: ${demo.instructor_name || ''}\nTopic: ${demo.topic || ''}`,
      },
      `demo-${demo.instructor_name?.replace(/\s+/g, '-') || demo.id}`
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-yellow-400" />
          <h1 className="text-xl font-bold">Demo Sessions</h1>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full">
            {demos.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Schedule Demo
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {(['all', 'scheduled', 'done', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
              filter === f ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {f === 'all' ? `All (${demos.length})` : `${f} (${demos.filter(d => d.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Demo list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
            No demo sessions found.
          </div>
        ) : filtered.map(demo => (
          <div key={demo.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{demo.instructor_name || 'Unknown Instructor'}</p>
                  <StatusBadge status={demo.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {demo.topic || 'No topic specified'}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>📅 {formatDateTime(demo.scheduled_at)}</span>
                  <span>⏱ {demo.duration_mins} mins</span>
                  {demo.location && <span>📍 {demo.location}</span>}
                </div>
                {demo.feedback && (
                  <p className="mt-2 text-sm italic text-muted-foreground">"{demo.feedback}"</p>
                )}
                {demo.score && (
                  <p className="mt-1 text-sm">Score: <strong>{demo.score}/10</strong></p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {demo.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => handleDownloadIcs(demo)}
                      className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground"
                      title="Download calendar invite (.ics)"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setFeedbackTarget(demo)}
                      className="px-2.5 py-1 text-xs bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30"
                    >
                      Submit Feedback
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(demo.id)}
                  className="px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showForm && (
        <DemoForm
          instructors={instructors}
          onSave={async (data) => {
            await api.demo.create(data)
            setShowForm(false)
            load()
          }}
          onClose={() => setShowForm(false)}
        />
      )}
      {feedbackTarget && (
        <DemoFeedbackForm
          demo={feedbackTarget}
          onSave={async (feedback) => {
            await api.demo.submitFeedback(feedbackTarget.id, feedback)
            setFeedbackTarget(null)
            load()
          }}
          onClose={() => setFeedbackTarget(null)}
        />
      )}
    </div>
  )
}
