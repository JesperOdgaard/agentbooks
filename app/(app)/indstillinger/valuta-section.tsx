'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { upsertCurrency, deleteCurrency } from './actions'

export interface OrgCurrency {
  id: string
  currency_code: string
  rate_to_dkk: number
  is_active: boolean
  updated_at: string | null
}

interface ValutaSectionProps {
  currencies: OrgCurrency[]
  isAdmin: boolean
}

const PRESET_CURRENCIES = ['EUR', 'SEK', 'NOK', 'USD', 'GBP', 'CHF']

export function ValutaSection({ currencies: initial, isAdmin }: ValutaSectionProps) {
  const [currencies, setCurrencies] = useState(initial)
  const [editRates, setEditRates] = useState<Record<string, string>>({})
  const [newCode, setNewCode] = useState('')
  const [newRate, setNewRate] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRateChange(code: string, val: string) {
    setEditRates((prev) => ({ ...prev, [code]: val }))
  }

  function handleSave(code: string, currentRate: number) {
    const raw = editRates[code]
    const rate = raw !== undefined ? parseFloat(raw.replace(',', '.')) : currentRate
    if (isNaN(rate) || rate <= 0) { setMsg({ type: 'error', text: 'Ugyldig kurs' }); return }
    startTransition(async () => {
      const res = await upsertCurrency(code, rate)
      if (res.error) {
        setMsg({ type: 'error', text: res.error })
      } else {
        setMsg({ type: 'ok', text: `${code} gemt` })
        setCurrencies((prev) =>
          prev.some((c) => c.currency_code === code)
            ? prev.map((c) => c.currency_code === code ? { ...c, rate_to_dkk: rate } : c)
            : [...prev, { id: res.id ?? '', currency_code: code, rate_to_dkk: rate, is_active: true, updated_at: new Date().toISOString() }]
        )
        setEditRates((prev) => { const n = { ...prev }; delete n[code]; return n })
      }
    })
  }

  function handleDelete(code: string) {
    startTransition(async () => {
      const res = await deleteCurrency(code)
      if (res.error) {
        setMsg({ type: 'error', text: res.error })
      } else {
        setCurrencies((prev) => prev.filter((c) => c.currency_code !== code))
        setMsg({ type: 'ok', text: `${code} fjernet` })
      }
    })
  }

  function handleAddPreset(code: string) {
    if (currencies.some((c) => c.currency_code === code)) return
    startTransition(async () => {
      const defaultRates: Record<string, number> = { EUR: 7.46, SEK: 0.69, NOK: 0.67, USD: 6.85, GBP: 8.72, CHF: 7.74 }
      const rate = defaultRates[code] ?? 1
      const res = await upsertCurrency(code, rate)
      if (res.error) { setMsg({ type: 'error', text: res.error }); return }
      setCurrencies((prev) => [...prev, { id: res.id ?? '', currency_code: code, rate_to_dkk: rate, is_active: true, updated_at: new Date().toISOString() }])
      setMsg({ type: 'ok', text: `${code} tilføjet` })
    })
  }

  function handleAddCustom() {
    const code = newCode.trim().toUpperCase()
    const rate = parseFloat(newRate.replace(',', '.'))
    if (code.length !== 3) { setMsg({ type: 'error', text: 'Valutakode skal være 3 bogstaver' }); return }
    if (isNaN(rate) || rate <= 0) { setMsg({ type: 'error', text: 'Ugyldig kurs' }); return }
    startTransition(async () => {
      const res = await upsertCurrency(code, rate)
      if (res.error) { setMsg({ type: 'error', text: res.error }); return }
      setCurrencies((prev) => [...prev, { id: res.id ?? '', currency_code: code, rate_to_dkk: rate, is_active: true, updated_at: new Date().toISOString() }])
      setMsg({ type: 'ok', text: `${code} tilføjet` })
      setNewCode(''); setNewRate('')
    })
  }

  const presetsMissing = PRESET_CURRENCIES.filter(
    (c) => !currencies.some((e) => e.currency_code === c)
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Valutakurser</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Kurser bruges til omregning til DKK. 1 fremmed valuta = X DKK.
        </p>
      </div>

      {msg && (
        <div className={`px-6 py-2.5 flex items-center gap-2 text-sm ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Aktive kurser */}
      {currencies.length > 0 && (
        <div className="divide-y divide-gray-50">
          {currencies.map((cur) => {
            const editing = editRates[cur.currency_code] !== undefined
            return (
              <div key={cur.currency_code} className="flex items-center gap-3 px-6 py-3">
                <div className="w-14">
                  <span className="text-sm font-bold text-gray-800 font-mono">{cur.currency_code}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-gray-400">1 {cur.currency_code} =</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={editRates[cur.currency_code] ?? cur.rate_to_dkk}
                    onChange={(e) => handleRateChange(cur.currency_code, e.target.value)}
                    disabled={!isAdmin || isPending}
                    className="w-28 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <span className="text-xs text-gray-400">DKK</span>
                </div>
                {cur.updated_at && (
                  <span className="text-[11px] text-gray-300 hidden sm:block">
                    {new Date(cur.updated_at).toLocaleDateString('da-DK')}
                  </span>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    {editing && (
                      <button
                        onClick={() => handleSave(cur.currency_code, cur.rate_to_dkk)}
                        disabled={isPending}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <Save size={11} /> Gem
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(cur.currency_code)}
                      disabled={isPending}
                      className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {currencies.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-gray-400">
          Ingen valutakurser konfigureret endnu
        </div>
      )}

      {isAdmin && (
        <div className="px-6 py-4 border-t border-gray-100 space-y-4">
          {/* Hurtig tilføjelse fra presets */}
          {presetsMissing.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Tilføj hurtig</p>
              <div className="flex flex-wrap gap-2">
                {presetsMissing.map((code) => (
                  <button
                    key={code}
                    onClick={() => handleAddPreset(code)}
                    disabled={isPending}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg hover:border-emerald-300 hover:text-emerald-600 transition-colors disabled:opacity-50"
                  >
                    <Plus size={11} /> {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brugerdefineret valuta */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Tilføj anden valuta</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="f.eks. PLN"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono uppercase"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Kurs til DKK"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-36 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={handleAddCustom}
                disabled={isPending || !newCode || !newRate}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                <Plus size={12} /> Tilføj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
