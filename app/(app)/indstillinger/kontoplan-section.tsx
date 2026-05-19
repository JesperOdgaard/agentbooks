'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { syncKontoplanFromEconomic } from './actions'

type Account = {
  id: string
  code: string
  name: string
  type: string
  is_active: boolean | null
}

const typeLabel: Record<string, string> = {
  drifts:   'Drift',
  balance:  'Balance',
  heading:  'Overskrift',
  total:    'Total',
  sum:      'Sum',
  revenue:  'Omsætning',
  expense:  'Udgift',
  asset:    'Aktiv',
  liability:'Passiv',
}

const typeColor: Record<string, string> = {
  drifts:   'bg-blue-50 text-blue-700',
  balance:  'bg-purple-50 text-purple-700',
  revenue:  'bg-emerald-50 text-emerald-700',
  expense:  'bg-orange-50 text-orange-700',
  asset:    'bg-cyan-50 text-cyan-700',
  liability:'bg-rose-50 text-rose-700',
  heading:  'bg-gray-100 text-gray-500',
  total:    'bg-gray-100 text-gray-600',
  sum:      'bg-gray-100 text-gray-600',
}

interface KontoplanSectionProps {
  accounts: Account[]
  hasEconomicIntegration: boolean
  isAdmin: boolean
}

export function KontoplanSection({ accounts: initialAccounts, hasEconomicIntegration, isAdmin }: KontoplanSectionProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [search, setSearch] = useState('')
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = accounts.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleSync() {
    startTransition(async () => {
      const res = await syncKontoplanFromEconomic()
      if (res.error) {
        setSyncMsg({ type: 'error', text: res.error })
      } else {
        setSyncMsg({ type: 'ok', text: `${res.count} konti hentet fra e-conomic` })
        // Refresh will happen via revalidatePath — page reload for simplicity
        window.location.reload()
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Kontoplan</h2>
          <p className="text-xs text-gray-400 mt-0.5">{accounts.length} konti</p>
        </div>
        <div className="flex items-center gap-2">
          {hasEconomicIntegration && isAdmin && (
            <button
              onClick={handleSync}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
              {isPending ? 'Synkroniserer…' : 'Synk fra e-conomic'}
            </button>
          )}
        </div>
      </div>

      {/* Sync feedback */}
      {syncMsg && (
        <div className={`px-6 py-2.5 flex items-center gap-2 text-sm ${syncMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {syncMsg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {syncMsg.text}
        </div>
      )}

      {/* No e-conomic banner */}
      {!hasEconomicIntegration && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-center gap-2">
          <AlertCircle size={13} />
          Tilslut e-conomic under <strong className="ml-1">Integrationer</strong> for at synkronisere kontoplan automatisk
        </div>
      )}

      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-100">
        <input
          type="text"
          placeholder="Søg på kontonr. eller navn…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-gray-400">
          {search ? 'Ingen konti matcher søgningen' : 'Ingen konti endnu'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Kontonr.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Navn</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Type</th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-2.5 font-mono text-xs font-medium text-gray-700">{account.code}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-900">{account.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[account.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {typeLabel[account.type] ?? account.type}
                    </span>
                  </td>
                  <td className="px-6 py-2.5">
                    <span className={`text-xs font-medium ${account.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {account.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
