'use client'

import { useState, useRef, useEffect } from 'react'
import { createSupplierAndLink } from '../actions'
import { Building2, X, Loader2, Sparkles } from 'lucide-react'

interface AiData {
  supplier_name?: string | null
  supplier_cvr?: string | null
  supplier_email?: string | null
  supplier_address?: string | null
}

interface CreateSupplierModalProps {
  invoiceId: string
  aiData: AiData | null
  /** Åbn modal direkte (bruges når AI har forslag) */
  autoOpen?: boolean
}

export function CreateSupplierModal({ invoiceId, aiData, autoOpen = false }: CreateSupplierModalProps) {
  const [open, setOpen] = useState(autoOpen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await createSupplierAndLink(invoiceId, formData)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
    }
  }

  const hasAiSuggestion = !!(aiData?.supplier_name)

  return (
    <>
      {hasAiSuggestion ? (
        /* ── Foreslået leverandør fra AI ── */
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Ny leverandør registreret</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{aiData!.supplier_name}</p>
            {aiData!.supplier_cvr && <p className="text-xs text-gray-500">CVR {aiData!.supplier_cvr}</p>}
            {aiData!.supplier_email && <p className="text-xs text-gray-400">{aiData!.supplier_email}</p>}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Building2 size={12} />
            Bekræft og opret leverandør
          </button>
        </div>
      ) : (
        /* ── Ingen AI-forslag ── */
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <Building2 size={13} />
          Opret leverandør
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {hasAiSuggestion ? 'Bekræft ny leverandør' : 'Opret leverandør'}
                </h2>
                {hasAiSuggestion && (
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                    <Sparkles size={11} /> Forudfyldt fra AI-scanning — tjek og tilret
                  </p>
                )}
              </div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Leverandørnavn <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  defaultValue={aiData?.supplier_name ?? ''}
                  placeholder="f.eks. Acme ApS"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CVR-nummer</label>
                <input
                  name="cvr"
                  defaultValue={aiData?.supplier_cvr ?? ''}
                  placeholder="12345678"
                  maxLength={8}
                  pattern="\d{8}"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={aiData?.supplier_email ?? ''}
                  placeholder="faktura@leverandoer.dk"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  name="address"
                  defaultValue={aiData?.supplier_address ?? ''}
                  placeholder="Eksempelvej 1, 1234 By"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Betalingsbetingelse (dage)</label>
                <input
                  name="payment_terms"
                  type="number"
                  defaultValue={30}
                  min={0}
                  max={365}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  disabled={loading}
                  className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Opretter...</>
                  ) : (
                    hasAiSuggestion ? 'Bekræft og opret' : 'Opret leverandør'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
