import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  demo: any
  onSave: (feedback: any) => Promise<void>
  onClose: () => void
}

export default function DemoFeedbackForm({ demo, onSave, onClose }: Props) {
  const [score, setScore] = useState(7)
  const [feedback, setFeedback] = useState('')
  const [recommendation, setRecommendation] = useState<'yes' | 'no' | 'maybe'>('maybe')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ score, feedback, recommendation })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold">Demo Feedback</h2>
            <p className="text-xs text-muted-foreground">{demo.instructor_name} — {demo.topic}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Score slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">Performance Score</label>
              <span className="text-2xl font-bold text-primary">{score}<span className="text-sm text-muted-foreground">/10</span></span>
            </div>
            <input
              type="range" min={1} max={10} value={score}
              onChange={e => setScore(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Poor</span><span>Average</span><span>Excellent</span>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Hire Recommendation</label>
            <div className="flex gap-2">
              {(['yes', 'maybe', 'no'] as const).map(r => (
                <button type="button" key={r} onClick={() => setRecommendation(r)}
                  className={`flex-1 py-2 rounded-lg text-sm capitalize border transition-colors ${
                    recommendation === r
                      ? r === 'yes' ? 'bg-green-500/20 border-green-500/50 text-green-300'
                        : r === 'no' ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}>
                  {r === 'yes' ? '✓ Hire' : r === 'no' ? '✗ Reject' : '? Maybe'}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Feedback Notes</label>
            <textarea
              value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Strengths, areas for improvement, observations…"
              rows={4}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
