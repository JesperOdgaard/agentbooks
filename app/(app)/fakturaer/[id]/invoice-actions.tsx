'use client'

import { useState } from 'react'
import { approveInvoice, rejectInvoice, submitForApproval } from '../actions'
import { scanInvoiceWithAI } from '../scan-action'
import { CheckCircle, XCircle, Send, Sparkles, Loader2, X } from 'lucide-react'

interface InvoiceActionsProps {
  invoiceId: string
  status: string
  aiScanned: boolean
}

export function InvoiceActions({ invoiceId, status, aiScanned }: InvoiceActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanDone, setScanDone] = useState(false)

  async function handleApprove() {
    setLoading(true); setError(null)
    const r = await approveInvoice(invoiceId)
    if (r?.error) setError(r.error)
    setLoading(false)
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError('Angiv en årsag til afvisning.'); return }
    setLoading(true); setError(null)
    const r = await rejectInvoice(invoiceId, rejectReason)
    if (r?.error) setError(r.error)
    setLoading(false); setShowRejectForm(false)
  }

  async function handleSubmit() {
    setLoading(true); setError(null)
    const r = await submitForApproval(invoiceId)
    if (r?.error) setError(r.error)
    setLoading(false)
  }

  async function handleScan() {
    setScanning(true); setError(null)
    const r = await scanInvoiceWithAI(invoiceId)
    if (r?.error) setError(r.error)
    else setScanDone(true)
    setScanning(false)
  }

  return (
    <div className="space-y-1.5">
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">
          <X size={12} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {status === 'pending' && (
        <button onClick={handleSubmit} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          <Send size={13} /> Send til godkendelse
        </button>
      )}

      {status === 'awaiting_approval' && (
        <>
          <button onClick={handleApprove} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            <CheckCircle size={13} /> Godkend
          </button>
          <button onClick={() => setShowRejectForm(!showRejectForm)} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors">
            <XCircle size={13} /> Afvis
          </button>
        </>
      )}

      {(status === 'approved' || status === 'paid' || status === 'cancelled') && (
        <p className="text-xs text-center text-gray-400 py-1">Ingen handlinger tilgængelige</p>
      )}

      {/* Scan-knap — altid synlig */}
      <button onClick={handleScan} disabled={scanning || loading}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 text-xs font-medium rounded-lg transition-colors">
        {scanning
          ? <><Loader2 size={12} className="animate-spin" /> Scanner...</>
          : <><Sparkles size={12} className={scanDone || aiScanned ? 'text-emerald-500' : ''} />
              {scanDone || aiScanned ? 'Scan igen med AI' : 'Scan med AI'}</>
        }
      </button>

      {showRejectForm && (
        <div className="mt-2 pt-3 border-t border-gray-100 space-y-2">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            placeholder="Årsag til afvisning..."
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
          <button onClick={handleReject} disabled={loading}
            className="w-full py-1.5 px-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            Bekræft afvisning
          </button>
        </div>
      )}
    </div>
  )
}
