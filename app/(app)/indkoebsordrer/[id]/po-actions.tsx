'use client'

import { useState, useTransition } from 'react'
import { FileDown } from 'lucide-react'
import { updatePurchaseOrderStatus, deletePurchaseOrder } from '../actions'

interface POActionsProps {
  poId: string
  status: string
}

const statusLabel: Record<string, string> = {
  draft: 'Kladde',
  open: 'Åben',
  partially_received: 'Delvist modtaget',
  received: 'Modtaget',
  cancelled: 'Annulleret',
}

const nextActions: Record<string, Array<{ status: string; label: string; style: string }>> = {
  draft: [
    { status: 'open', label: 'Send til leverandør', style: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { status: 'cancelled', label: 'Annuller', style: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
  ],
  open: [
    { status: 'partially_received', label: 'Markér delvist modtaget', style: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
    { status: 'received', label: 'Markér fuldt modtaget', style: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { status: 'cancelled', label: 'Annuller', style: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
  ],
  partially_received: [
    { status: 'received', label: 'Markér fuldt modtaget', style: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { status: 'cancelled', label: 'Annuller', style: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
  ],
  received: [],
  cancelled: [],
}

export function POActions({ poId, status }: POActionsProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const actions = nextActions[status] ?? []

  async function handleStatusChange(newStatus: string) {
    setError(null)
    startTransition(async () => {
      const result = await updatePurchaseOrderStatus(poId, newStatus)
      if (result?.error) setError(result.error)
    })
  }

  async function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deletePurchaseOrder(poId)
      if (result?.error) setError(result.error)
    })
  }

  if (actions.length === 0 && status !== 'draft') {
    return null
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => handleStatusChange(action.status)}
            disabled={isPending}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${action.style}`}
          >
            {isPending ? '...' : action.label}
          </button>
        ))}

        {status === 'draft' && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Slet kladde
          </button>
        )}

        {confirmDelete && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <span className="text-sm text-red-700">Er du sikker?</span>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? '...' : 'Ja, slet'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 border border-gray-300 text-xs text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Annuller
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function POPdfButton({ poId }: { poId: string }) {
  function handlePrint() {
    window.open(`/indkoebsordrer/${poId}/print`, '_blank')
  }
  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <FileDown size={14} />
      Hent PDF
    </button>
  )
}

export function StatusFlowBar({ status }: { status: string }) {
  const steps = [
    { key: 'draft', label: 'Kladde' },
    { key: 'open', label: 'Åben' },
    { key: 'partially_received', label: 'Delvist modtaget' },
    { key: 'received', label: 'Modtaget' },
  ]

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
          Annulleret
        </span>
      </div>
    )
  }

  const currentIdx = steps.findIndex((s) => s.key === status)

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isUpcoming = idx > currentIdx

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-white border-emerald-500 text-emerald-600'
                    : 'bg-white border-gray-200 text-gray-300'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
                  isCurrent ? 'text-emerald-600' : isDone ? 'text-emerald-500' : 'text-gray-300'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-1 mb-4 rounded ${
                  isDone ? 'bg-emerald-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
