'use client'

import { useState } from 'react'
import { CreditCard, X, Check, Loader2 } from 'lucide-react'
import { registerPayment } from '../actions'

interface Props {
  invoiceId: string
  amountInclVat: number | null
  currency: string | null
}

const METHODS = ['Bankoverførsel', 'Betalingskort', 'MobilePay', 'Check', 'Andet']

export function RegisterPaymentModal({ invoiceId, amountInclVat, currency }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const r = await registerPayment(invoiceId, new FormData(e.currentTarget))
    if (r.error) { setError(r.error); setLoading(false) }
    // On success page revalidates — modal stays open briefly then page reloads
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        <CreditCard size={13} /> Registrér betaling
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-gray-900">Registrér betaling</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Beløb ({currency ?? 'DKK'})</label>
                <div className="relative">
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={amountInclVat ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pr-10"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400">{currency ?? 'DKK'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Betalingsdato</label>
                <input
                  name="payment_date"
                  type="date"
                  required
                  defaultValue={today}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Betalingsmetode</label>
                <select
                  name="payment_method"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                >
                  <option value="">— Vælg —</option>
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Reference / bilagsnr. (valgfrit)</label>
                <input
                  name="reference"
                  type="text"
                  placeholder="f.eks. 20240528-001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Note (valgfrit)</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Intern note om betalingen..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {loading ? 'Registrerer...' : 'Bekræft betaling'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Annuller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
