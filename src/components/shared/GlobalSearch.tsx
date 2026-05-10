import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { globalSearch, type SearchResult } from '@/lib/api'

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const r = await globalSearch(q)
      setResults(r)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  const go = (r: SearchResult) => {
    navigate(r.route)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search instructors, clients, learners, proposals…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          )}
          <kbd className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {loading && (
          <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
        )}

        {!loading && results.length > 0 && (
          <ul className="max-h-72 overflow-y-auto divide-y divide-gray-800">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => go(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition text-left"
                >
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full shrink-0">
                    {r.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{r.label}</p>
                    {r.sublabel && <p className="text-xs text-gray-500 truncate">{r.sublabel}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && query && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">No results for "{query}"</div>
        )}

        {!query && (
          <div className="px-4 py-4 text-xs text-gray-600 flex gap-4">
            <span>↵ to navigate</span>
            <span>Esc to close</span>
            <span className="ml-auto">Ctrl+K to toggle</span>
          </div>
        )}
      </div>
    </div>
  )
}
