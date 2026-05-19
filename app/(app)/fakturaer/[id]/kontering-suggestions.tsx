'use client'

import { useState } from 'react'
import { acceptKontering } from '../actions'
import { Sparkles, CheckCircle, Loader2, ChevronRight, PencilLine } from 'lucide-react'

interface KonteringSuggestionsProps {
  invoiceId: string
  suggestedAccountCode: string | null
  suggestedAccountName: string | null
  suggestedAccountId: string | null
  suggestedVatCode: string | null
  suggestedVatCodeId: string | null
  confidence: number | null
  reasoning: string | null
  alreadyApplied: boolean
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : confidence >= 50
        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
        : 'bg-red-100 text-red-700 border-red-200'

  const label =
    confidence >= 80 ? 'Høj sikkerhed' : confidence >= 50 ? 'Middel sikkerhed' : 'Lav sikkerhed'

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}
    >
      {label} · {confidence}%
    </span>
  )
}

export function KonteringSuggestions({
  invoiceId,
  suggestedAccountCode,
  suggestedAccountName,
  suggestedAccountId,
  suggestedVatCode,
  suggestedVatCodeId,
  confidence,
  reasoning,
  alreadyApplied,
}: KonteringSuggestionsProps) {
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(alreadyApplied)
  const [error, setError] = useState<string | null>(null)

  if (!suggestedAccountId) return null

  async function handleAccept() {
    if (!suggestedAccountId) return
    setLoading(true)
    setError(null)
    const result = await acceptKontering(invoiceId, suggestedAccountId, suggestedVatCodeId)
    if (result.error) {
      setError(result.error)
    } else {
      setAccepted(true)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={15} className="text-emerald-500" />
        <h2 className="font-semibold text-gray-900">
          {accepted ? 'AI-kontering' : 'AI-konteringsforslag'}
        </h2>
        {confidence !== null && <ConfidenceBadge confidence={confidence} />}
      </div>

      <div className="space-y-3">
        {/* Konto */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-400 flex-shrink-0">Konto</div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-mono font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded">
              {suggestedAccountCode}
            </span>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-sm text-gray-700">{suggestedAccountName}</span>
          </div>
        </div>

        {/* Momskode */}
        {suggestedVatCode && (
          <div className="flex items-center gap-2">
            <div className="w-16 text-xs text-gray-400 flex-shrink-0">Moms</div>
            <span className="text-sm font-mono font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded">
              {suggestedVatCode}
            </span>
          </div>
        )}

        {/* Begrundelse */}
        {reasoning && (
          <div className="flex items-start gap-2">
            <div className="w-16 text-xs text-gray-400 flex-shrink-0 pt-0.5">Årsag</div>
            <p className="text-xs text-gray-500 italic">{reasoning}</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        {accepted ? (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <CheckCircle size={15} />
              Forudfyldt af AI
            </div>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <PencilLine size={12} />
              Anvend igen
            </button>
          </>
        ) : (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex items-center gap-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Gemmer...
              </>
            ) : (
              <>
                <CheckCircle size={13} />
                Anvend kontering
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
