'use client'

import { useState } from 'react'
import { Download, FileText, CheckCircle2 } from 'lucide-react'
import type { InvoiceExportRow } from './page'

interface ExportFormProps {
  invoices: InvoiceExportRow[]
}

const statusLabel: Record<string, string> = {
  pending: 'Afventer',
  awaiting_approval: 'Til godkendelse',
  approved: 'Godkendt',
  rejected: 'Afvist',
  paid: 'Betalt',
  overdue: 'Forfalden',
  cancelled: 'Annulleret',
}

const ALL_STATUSES = Object.keys(statusLabel)

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('da-DK')
}

function formatAmount(amount: number | null) {
  if (amount == null) return ''
  return amount.toFixed(2).replace('.', ',')
}

export function ExportForm({ invoices }: ExportFormProps) {
  const today = new Date()
  const firstOfYear = `${today.getFullYear()}-01-01`
  const todayStr = today.toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(firstOfYear)
  const [dateTo, setDateTo] = useState(todayStr)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(ALL_STATUSES)
  const [exported, setExported] = useState(false)

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  function toggleAll() {
    if (selectedStatuses.length === ALL_STATUSES.length) {
      setSelectedStatuses([])
    } else {
      setSelectedStatuses(ALL_STATUSES)
    }
  }

  const filtered = invoices.filter((inv) => {
    const date = inv.invoice_date ?? inv.due_date ?? ''
    const inRange = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)
    const inStatus = selectedStatuses.includes(inv.status ?? '')
    return inRange && inStatus
  })

  function handleExport() {
    if (filtered.length === 0) return

    const headers = [
      'Fakturanummer',
      'Leverandør',
      'Status',
      'Fakturadato',
      'Forfaldsdato',
      'Beløb ekskl. moms',
      'Moms',
      'Beløb inkl. moms',
      'Valuta',
      'Bemærkninger',
    ]

    const rows = filtered.map((inv) => [
      inv.invoice_number ?? '',
      inv.supplier_name ?? '',
      statusLabel[inv.status ?? ''] ?? inv.status ?? '',
      formatDate(inv.invoice_date),
      formatDate(inv.due_date),
      formatAmount(inv.amount_excl_vat),
      formatAmount(inv.vat_amount),
      formatAmount(inv.amount_incl_vat),
      inv.currency ?? 'DKK',
      (inv.notes ?? '').replace(/"/g, '""'),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(';'))
      .join('\n')

    const bom = '﻿' // UTF-8 BOM for Excel
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fakturaer_${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Datointerval */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Datointerval</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Fra dato</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Til dato</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Statusfilter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Statusfilter</h2>
          <button
            onClick={toggleAll}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {selectedStatuses.length === ALL_STATUSES.length ? 'Fravælg alle' : 'Vælg alle'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((status) => {
            const active = selectedStatuses.includes(status)
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {statusLabel[status]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Forhåndsvisning + eksport */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Forhåndsvisning</h2>

        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Ingen fakturaer matcher de valgte filtre</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto mb-5 rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Fakturanummer</th>
                    <th className="px-4 py-2.5 text-left">Leverandør</th>
                    <th className="px-4 py-2.5 text-left">Dato</th>
                    <th className="px-4 py-2.5 text-right">Beløb inkl. moms</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.slice(0, 5).map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-4 py-2.5 font-mono text-gray-500 text-xs">
                        {inv.invoice_number ?? <span className="italic text-gray-300">Intet nr.</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 font-medium">
                        {inv.supplier_name ?? <span className="text-gray-400 font-normal italic">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                        {inv.amount_incl_vat != null
                          ? new Intl.NumberFormat('da-DK', {
                              style: 'currency',
                              currency: inv.currency ?? 'DKK',
                              minimumFractionDigits: 2,
                            }).format(inv.amount_incl_vat)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">
                          {statusLabel[inv.status ?? ''] ?? inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 5 && (
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                  … og {filtered.length - 5} flere fakturaer
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{filtered.length}</span> faktura{filtered.length !== 1 ? 'er' : ''} klar til eksport
              </p>
              <button
                onClick={handleExport}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  exported
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {exported ? (
                  <>
                    <CheckCircle2 size={15} />
                    Eksporteret!
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
      