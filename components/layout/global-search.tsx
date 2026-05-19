'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Building2, ShoppingCart, X, Loader2 } from 'lucide-react'
import { globalSearch, type SearchResult } from '@/app/(app)/search-action'

const typeLabel: Record<SearchResult['type'], string> = {
  faktura: 'Faktura',
  leverandoer: 'Leverandør',
  indkoebsordre: 'Indkøbsordre',
}

const typeIcon: Record<SearchResult['type'], React.ReactNode> = {
  faktura: <FileText size={13} className="text-blue-400" />,
  leverandoer: <Building2 size={13} className="text-emerald-400" />,
  indkoebsordre: <ShoppingCart size={13} className="text-violet-400" />,
}

const statusColors: Record<string, string> = {
  pending:           'bg-amber-50 text-amber-600',
  awaiting_approval: 'bg-blue-50 text-blue-600',
  approved:          'bg-emerald-50 text-emerald-700',
  paid:              'bg-gray-100 text-gray-500',
  overdue:           'bg-red-50 text-red-600',
  cancelled:         'bg-gray-100 text-gray-400',
  rejected:          'bg-red-50 text-red-500',
  active:            'bg-emerald-50 text-emerald-700',
  inactive:          'bg-gray-100 text-gray-400',
  open:              'bg-blue-50 text-blue-600',
  received:          'bg-emerald-50 text-emerald-700',
  draft:             'bg-gray-50 text-gray-500',
}

const statusLabel: Record<string, string> = {
  pending: 'Afventer', awaiting_approval: 'Til godkendelse', approved: 'Godkendt',
  paid: 'Betalt', overdue: 'Forfalden', cancelled: 'Annulleret', rejected: 'Afvist',
  active: 'Aktiv', inactive: 'Inaktiv', open: 'Åben', received: 'Modtaget', draft: 'Kladde',
}

export function GlobalSearch() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Cmd+K / Ctrl+K åbner søgning
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Fokusér input når dialog åbnes
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  // Søg med debounce
  const search = useCallback((q: string) => {
    startTransition(async () => {
      const res = await globalSearch(q)
      setResults(res)
      setSelected(0)
    })
  }, [])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => search(query), 250)
    return () => clearTimeout(timer)
  }, [query, search])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  // Keyboard navigation i resultater
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected].href)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          {isPending
            ? <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />
            : <Search size={16} className="text-gray-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Søg i fakturaer, leverandører, indkøbsordrer…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex text-[10px] font-medium text-gray-300 border border-gray-200 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Resultater */}
        {results.length > 0 && (
          <ul className="py-1.5 max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="flex-shrink-0 w-5 flex justify-center">
                    {typeIcon[r.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.status && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300">{typeLabel[r.type]}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Tom tilstand */}
        {query.trim().length >= 2 && results.length === 0 && !isPending && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">Ingen resultater for <span className="font-medium text-gray-600">"{query}"</span></p>
          </div>
        )}

        {/* Hint når ingen søgning endnu */}
        {query.trim().length < 2 && (
          <div className="px-4 py-4 flex items-center gap-4 text-[11px] text-gray-300">
            <span className="flex items-center gap-1"><FileText size={11} /> Fakturaer</span>
            <span className="flex items-center gap-1"><Building2 size={11} /> Leverandører</span>
            <span className="flex items-center gap-1"><ShoppingCart size={11} /> Indkøbsordrer</span>
          </div>
        )}
      </div>
    </div>
  )
}
