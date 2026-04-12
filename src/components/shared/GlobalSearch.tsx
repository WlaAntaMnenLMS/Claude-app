import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, CalendarDays, FileText, Award, BookOpen, MessageSquare, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_META: Record<string, { icon: any; label: string; color: string }> = {
  instructor:          { icon: Users,          label: 'Instructor',      color: 'text-blue-400' },
  demo:                { icon: CalendarDays,   label: 'Demo',            color: 'text-purple-400' },
  proposal:            { icon: FileText,       label: 'Proposal',        color: 'text-yellow-400' },
  proposal_template:   { icon: FileText,       label: 'Proposal Template', color: 'text-yellow-300' },
  certificate:         { icon: Award,          label: 'Certificate',     color: 'text-green-400' },
  cert_template:       { icon: Award,          label: 'Cert Template',   color: 'text-green-300' },
  transcript_template: { icon: BookOpen,       label: 'Transcript Tmpl', color: 'text-orange-400' },
  learner:             { icon: User,           label: 'Learner',         color: 'text-cyan-400' },
  comm_template:       { icon: MessageSquare,  label: 'Comm Template',   color: 'text-pink-400' },
}

interface SearchResult {
  id: number; title: string; subtitle: string
  type: string; status: string; route: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await (window as any).api.search.global(q)
      setResults(res)
      setSelected(0)
    } finally { setLoading(false) }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 250)
  }

  function handleSelect(r: SearchResult) {
    navigate(r.route)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && results[selected]) { handleSelect(results[selected]) }
    else if (e.key === 'Escape') { onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search instructors, proposals, certificates, templates…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="py-2 max-h-80 overflow-y-auto">
            {results.map((r, i) => {
              const meta = TYPE_META[r.type] || { icon: Search, label: r.type, color: 'text-muted-foreground' }
              const Icon = meta.icon
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors',
                    i === selected && 'bg-accent'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', meta.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status && <span className="text-xs text-muted-foreground">{r.status}</span>}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{meta.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
