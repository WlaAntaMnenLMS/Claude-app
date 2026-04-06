import StatusBadge from '@/components/shared/StatusBadge'

const COLUMNS = [
  { key: 'applied',        label: 'Applied',        color: 'border-blue-500/30' },
  { key: 'demo_scheduled', label: 'Demo Scheduled', color: 'border-yellow-500/30' },
  { key: 'demo_done',      label: 'Demo Done',      color: 'border-purple-500/30' },
  { key: 'hired',          label: 'Hired',          color: 'border-green-500/30' },
  { key: 'rejected',       label: 'Rejected',       color: 'border-red-500/30' },
]

interface Props {
  instructors: any[]
  onStatusChange: (id: number, status: string) => void
  onOpen: (id: number) => void
}

export default function HiringKanban({ instructors, onStatusChange, onOpen }: Props) {
  const byStatus = (status: string) => instructors.filter(i => i.status === status)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(col => (
        <div key={col.key} className={`flex-shrink-0 w-56 bg-card border ${col.color} rounded-xl`}>
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold">{col.label}</span>
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
              {byStatus(col.key).length}
            </span>
          </div>
          <div className="p-2 space-y-2 min-h-32">
            {byStatus(col.key).map(inst => (
              <div
                key={inst.id}
                className="bg-secondary rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onOpen(inst.id)}
              >
                <p className="text-sm font-medium truncate">{inst.full_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {inst.specialization || 'No specialization'}
                </p>
                {inst.rating && (
                  <p className="text-xs text-yellow-400 mt-1">⭐ {inst.rating.toFixed(1)}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {COLUMNS.filter(c => c.key !== col.key).map(c => (
                    <button
                      key={c.key}
                      onClick={e => { e.stopPropagation(); onStatusChange(inst.id, c.key) }}
                      className="text-[10px] text-muted-foreground hover:text-foreground bg-background px-1.5 py-0.5 rounded border border-border"
                    >
                      → {c.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
