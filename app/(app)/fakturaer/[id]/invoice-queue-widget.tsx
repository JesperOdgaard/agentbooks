'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, AlertCircle } from 'lucide-react'

interface QueueInvoice {
  id: string
  invoice_number: string | null
  supplier_name: string | null
  amount_incl_vat: number | null
  currency: string | null
  status: string
  due_date: string | null
}

interface InvoiceQueueWidgetProps {
  currentId: string
  invoices: QueueInvoice[]
}

const statusLabel: Record<string, string> = {
  pending:          'Afventer',
  awaiting_approval: 'Til godkendelse',
}

const statusColor: Record<string, string> = {
  pending:           'bg-amber-50 text-amber-700',
  awaiting_approval: 'bg-blue-50 text-blue-700',
}

function fmtAmount(v: number | null, currency: string | null) {
  if (v == null) return '—'
  const num = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
  return currency === 'DKK' || !currency ? `${num} kr.` : `${num} ${currency}`
}

export function InvoiceQueueWidget({ currentId, invoices }: InvoiceQueueWidgetProps) {
  const router = useRouter()

  const others = invoices.filter((inv) => inv.id !== currentId)
  const currentIdx = invoices.findIndex((inv) => inv.id === currentId)
  const nextInvoice = invoices[currentIdx + 1] ?? invoices.find((inv) => inv.id !== currentId) ?? null

  if (others.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Til behandling</span>
        <span className="text-[11px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{others.length}</span>
      </div>

      {/* Næste knap */}
      {nextInvoice && (
        <div className="px-4 py-3 border-b border-gray-50">
          <button
            onClick={() => router.push(`/fakturaer/${nextInvoice.id}`)}
            className="w-full flex items-center justify-between gap-2 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <span>Gå til næste faktura</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Liste */}
      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
        {others.slice(0, 8).map((inv) => {
          const isOverdue = inv.due_date && new Date(inv.due_date) < new Date()
          return (
            <button
              key={inv.id}
              onClick={() => router.push(`/fakturaer/${inv.id}`)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {inv.supplier_name ?? 'Ukendt leverandør'}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {inv.invoice_number ? `#${inv.invoice_number}` : 'Intet fakturanr.'}
                  {inv.due_date && ` · forfald ${new Date(inv.due_date).toLocaleDateString('da-DK')}`}
                </p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs font-semibold text-gray-700">{fmtAmount(inv.amount_incl_vat, inv.currency)}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 ${isOverdue ? 'bg-red-50 text-red-600' : statusColor[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {isOverdue && <AlertCircle size={9} />}
                  {isOverdue ? 'Forfalden' : (statusLabel[inv.status] ?? inv.status)}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {others.length > 8 && (
        <div className="px-4 py-2 text-center">
          <button onClick={() => router.push('/fakturaer')} className="text-xs text-gray-400 hover:text-gray-600">
            Se alle {others.length} fakturaer →
          </button>
        </div>
      )}
    </div>
  )
}
