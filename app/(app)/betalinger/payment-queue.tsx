'use client'

import { useState, useMemo } from 'react'
import { markInvoicesAsPaid } from './actions'

interface PendingInvoice {
  id: string
  invoice_number: string | null
  due_date: string | null
  amount_incl_vat: number | null
  currency: string
  supplier_name: string | null
  supplier_iban: string | null
  supplier_bank_reg: string | null
  supplier_bank_account: string | null
}

interface Props {
  invoices: PendingInvoice[]
}

function formatDKK(amount: number | null, currency = 'DKK') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDecimal(n: number) {
  return n.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getBankInfo(inv: PendingInvoice): string {
  if (inv.supplier_iban) return inv.supplier_iban
  if (inv.supplier_bank_reg && inv.supplier_bank_account) {
    return `${inv.supplier_bank_reg}-${inv.supplier_bank_account}`
  }
  return ''
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return dueDate < todayStr()
}

export function PaymentQueue({ invoices }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fraForfald, setFraForfald] = useState('')
  const [tilForfald, setTilForfald] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [exportedIds, setExportedIds] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (!fraForfald && !tilForfald) return true
      const d = inv.due_date
      if (!d) return true
      if (fraForfald && d < fraForfald) return false
      if (tilForfald && d > tilForfald) return false
      return true
    })
  }, [invoices, fraForfald, tilForfald])

  const selectedTotal = useMemo(() => {
    return filtered
      .filter((inv) => selectedIds.has(inv.id))
      .reduce((sum, inv) => sum + (inv.amount_incl_vat ?? 0), 0)
  }, [filtered, selectedIds])

  const allSelected = filtered.length > 0 && filtered.every((inv) => selectedIds.has(inv.id))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((inv) => inv.id)))
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function generateCSV() {
    const selected = filtered.filter((inv) => selectedIds.has(inv.id))
    if (!selected.length) return

    const escape = (s: string) => (s.includes(';') ? `"${s}"` : s)
    const header = 'Type;Leverandørnavn;Kontonr/IBAN;Beløb;Valuta;Fakturanr'
    const rows = selected.map((inv) => {
      const konto = getBankInfo(inv)
      const belob = formatDecimal(inv.amount_incl_vat ?? 0)
      const valuta = inv.currency ?? 'DKK'
      const fakturanr = inv.invoice_number ?? inv.id
      return [
        'Faktura',
        escape(inv.supplier_name ?? ''),
        escape(konto),
        belob,
        valuta,
        escape(fakturanr),
      ].join(';')
    })

    const csv = '﻿' + [header, ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `betalinger_${todayStr()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setExportedIds(selected.map((inv) => inv.id))
    setExportDone(true)
  }

  async function handleMarkAsPaid() {
    setLoading(true)
    setError(null)
    const result = await markInvoicesAsPaid(exportedIds)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccessMsg(`${result.count} faktura${result.count !== 1 ? 'er' : ''} markeret som betalt.`)
      setSelectedIds(new Set())
      setExportDone(false)
      setExportedIds([])
    }
    setLoading(false)
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm font-medium">Ingen godkendte fakturaer afventer betaling</p>
        <p className="text-gray-400 text-xs mt-1">Fakturaer der er godkendt men ikke betalt vises her</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 ml-4">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Datofiltrer */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Forfaldsdato fra</label>
          <input
            type="date"
            value={fraForfald}
            onChange={(e) => setFraForfald(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Forfaldsdato til</label>
          <input
            type="date"
            value={tilForfald}
            onChange={(e) => setTilForfald(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {(fraForfald || tilForfald) && (
          <button
            onClick={() => { setFraForfald(''); setTilForfald('') }}
            className="text-sm text-gray-500 hover:text-gray-700 underline pb-1"
          >
            Nulstil filter
          </button>
        )}
        <div className="ml-auto text-sm text-gray-500">
          Viser {filtered.length} af {invoices.length} fakturaer
        </div>
      </div>

      {/* Valgt total + eksport */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-900">
              {selectedIds.size} faktura{selectedIds.size !== 1 ? 'er' : ''} valgt
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Samlet beløb: {formatDKK(selectedTotal)}
            </p>
          </div>
          <button
            onClick={generateCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Generer betalingsfil (.csv)
          </button>
        </div>
      )}

      {/* Eksport bekræftelse */}
      {exportDone && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Betalingsfil downloadet ({exportedIds.length} betalinger)
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Vil du markere de valgte fakturaer som betalt i systemet?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAsPaid}
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Gemmer...' : 'Markér som betalt'}
            </button>
            <button
              onClick={() => { setExportDone(false); setExportedIds([]) }}
              className="px-4 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Nej tak
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="pl-4 pr-2 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Leverandør</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fakturanr.</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Forfaldsdato</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Beløb</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Konto / IBAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => {
                const overdue = isOverdue(inv.due_date)
                const konto = getBankInfo(inv)
                const checked = selectedIds.has(inv.id)
                return (
                  <tr
                    key={inv.id}
                    className={`transition-colors ${checked ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(inv.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">{inv.supplier_name ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600 font-mono">{inv.invoice_number ?? '—'}</td>
                    <td className={`px-3 py-3 ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString('da-DK')
                        : '—'}
                      {overdue && (
                        <span className="ml-2 text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Forfalden
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-gray-900">
                      {formatDKK(inv.amount_incl_vat, inv.currency)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-600">
                      {konto || (
                        <span className="text-amber-600 font-medium">Mangler bankinfo</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
