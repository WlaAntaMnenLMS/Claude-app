import { useEffect, useState } from 'react'
import { X, Mail, Phone, Linkedin, Star, Edit } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'

interface Props {
  id: number
  onClose: () => void
  onEdit: (inst: any) => void
}

export default function InstructorProfile({ id, onClose, onEdit }: Props) {
  const [data, setData] = useState<{ instructor: any; demos: any[] } | null>(null)

  useEffect(() => {
    api.instructor.get(id).then(setData)
  }, [id])

  if (!data) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="text-muted-foreground text-sm">Loading…</div>
    </div>
  )

  const { instructor: inst, demos } = data

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {inst.full_name[0]}
            </div>
            <div>
              <h2 className="font-semibold">{inst.full_name}</h2>
              <p className="text-xs text-muted-foreground">{inst.specialization || 'No specialization'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(inst)} className="p-1.5 hover:bg-accent rounded-lg">
              <Edit className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-4 flex-wrap">
            <StatusBadge status={inst.status} />
            {inst.rating && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                {inst.rating.toFixed(1)} / 5
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {inst.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span>{inst.email}</span>
              </div>
            )}
            {inst.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{inst.phone}</span>
              </div>
            )}
            {inst.linkedin_url && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Linkedin className="w-3.5 h-3.5" />
                <span className="truncate">{inst.linkedin_url}</span>
              </div>
            )}
          </div>

          {inst.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-secondary rounded-lg p-3">{inst.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-2">Demo Sessions ({demos.length})</p>
            {demos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No demos scheduled</p>
            ) : (
              <div className="space-y-2">
                {demos.map(d => (
                  <div key={d.id} className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{d.topic || 'Demo Session'}</p>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(d.scheduled_at)}</p>
                    {d.feedback && <p className="text-xs mt-1 text-muted-foreground">"{d.feedback}"</p>}
                    {d.score && <p className="text-xs mt-1">Score: {d.score}/10</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
