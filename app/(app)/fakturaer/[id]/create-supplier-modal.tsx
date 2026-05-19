'use client'

import { useState, useRef } from 'react'
import { createSupplierAndLink } from '../actions'
import { Building2, X, Loader2 } from 'lucide-react'

interface AiData {
  supplier_name?: string | null
  supplier_cvr?: string | null
  supplier_email?: string | null
  supplier_address?: string | null
}

interface CreateSupplierModalProps {
  invoiceId: string
  aiData: AiData | null
}

export function CreateSupplierModal({ invoiceId, aiData }: CreateSupplierModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

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
      // Siden revalideres automatisk via revalidatePath i server action
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
      >
        <Building2 size={13} />
        Opret leverandør
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Opret leverandør</h2>
                {aiData?.supplier_name && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Forudfyldt fra AI-scanning
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
              {/* Navn */}
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

              {/* CVR */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  CVR-nummer
                </label>
                <input
                  name="cvr"
                  defaultValue={aiData?.supplier_cvr ?? ''}
                  placeholder="12345678"
                  maxLength={8}
                  pattern="\d{8}"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={aiData?.supplier_email ?? ''}
                  placeholder="faktura@leverandoer.dk"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  name="address"
                  defaultValue={aiData?.supplier_address ?? ''}
                  placeholder="Eksempelvej 1, 1234 By"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Betalingsbetingelse */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Betalingsbetingelse (dage)
                </label>
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
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
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
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Opretter...
                    </>
                  ) : (
                    'Opret leverandør'
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
