'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'

const STATUS_TABS = [
  { value: '', label: 'Alle' },
  { value: 'active', label: 'Aktive' },
  { value: 'inactive', label: 'Inaktive' },
]

export function LeverandoerFilter({
  query,
  status,
  total,
}: {
  query: string
  status: string
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset page on filter change
      if (key !== 'page') params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Søgefelt */}
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          defaultValue={query}
          placeholder="Søg leverandør…"
          onChange={(e) => updateParam('q', e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        />
      </div>

      {/* Status-tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateParam('status', tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-emerald-500 text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <span className="self-center text-sm text-gray-400 whitespace-nowrap">
        {total} leverandør{total !== 1 ? 'er' : ''}
      </span>
    </div>
  )
}
