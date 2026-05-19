'use client'

import { useState, useTransition } from 'react'
import {
  submitExpenseReport,
  approveExpenseReport,
  rejectExpenseReport,
  markExpenseReportPaid,
} from '../actions'

interface ExpenseActionsProps {
  reportId: string
  status: string
  isOwner: boolean
  isApprover: boolean
}

export function ExpenseActions({ reportId, status, isOwner, isApprover }: ExpenseActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function handle(action: () => Promise<{ success?: boolean; error?: string } | undefined>) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Medarbejder: indsend kladde */}
        {status === 'draft' && isOwner && (
          <button
            onClick={() => handle(() => submitExpenseReport(reportId))}
            disabled={isPending}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? '...' : 'Indsend til godkendelse'}
          </button>
        )}

        {/* Admin/bogholder: godkend */}
        {status === 'submitted' && isApprover && (
          <>
            <button
              onClick={() => handle(() => approveExpenseReport(reportId))}
              disabled={isPending}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? '...' : 'Godkend'}
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={isPending}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Afvis
            </button>
          </>
        )}

        {/* Admin/bogholder: markér udbetalt */}
        {status === 'approved' && isApprover && (
          <button
            onClick={() => handle(() => markExpenseReportPaid(reportId))}
            disabled={isPending}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? '...' : 'Markér som udbetalt'}
          </button>
        )}
      </div>

      {/* Afvis-dialog */}
      {showReject && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">Angiv årsag til afvisning</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            placeholder="Beskriv årsagen til afvisningen..."
            className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handle(() => rejectExpenseReport(reportId, rejectReason))}
              disabled={isPending}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {isPending ? '...' : 'Bekræft afvisning'}
            </button>
            <button
              onClick={() => { setShowReject(false); setRejectReason('') }}
              className="px-4 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuller
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
