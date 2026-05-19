'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createPurchaseOrder } from '../actions'

interface Supplier {
  id: string
  name: string
}

interface LineItem {
  description: string
  quantity: string
  unit_price: string
}

function formatDKK(n: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
  }).format(n)
}

function parseNum(s: string) {
  // Accepterer både komma og punktum som decimaltegn
  return parseFloat(s.replace(',', '.')) || 0
}

export function POCreateForm({ suppliers }: { suppliers: Supplier[] }) {
  const [lines, setLines] = useState<LineItem[]>([
    { description: '', quantity: '1', unit_price: '' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const total = lines.reduce((sum, l) => {
    return sum + parseNum(l.quantity) * parseNum(l.unit_price)
  }, 0)

  function addLine() {
    setLines((prev) => [...prev, { description: '', quantity: '1', unit_price: '' }])
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Tilføj linjeposter til formdata
    lines.forEach((line, i) => {
      formData.set(`lines[${i}][description]`, line.description)
      formData.set(`lines[${i}][quantity]`, line.quantity)
      formData.set(`lines[${i}][unit_price]`, line.unit_price.replace(',', '.'))
    })

    startTransition(async () => {
      const result = await createPurchaseOrder(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stamoplysninger */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Stamoplysninger</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Titel</label>
            <input
              type="text"
              name="title"
              placeholder="F.eks. Kontorartikler Q3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Leverandør</label>
            <select
              name="supplier_id"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">— Ingen leverandør —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bestillingsdato <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="order_date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Forventet levering</label>
            <input
              type="date"
              name="expected_delivery"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valuta</label>
            <select
              name="currency"
              defaultValue="DKK"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="DKK">DKK</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="SEK">SEK</option>
              <option value="NOK">NOK</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opret som</label>
            <select
              name="status"
              defaultValue="open"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="open">Åben (send til leverandør)</option>
              <option value="draft">Kladde</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Bemærkninger</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            placeholder="Interne noter..."
          />
        </div>
      </div>

      {/* Linjeposter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Linjeposter</h2>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Plus size={14} />
            Tilføj linje
          </button>
        </div>

        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_130px_32px] gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            <span>Beskrivelse</span>
            <span className="text-right">Antal</span>
            <span className="text-right">Enhedspris</span>
            <span />
          </div>

          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_100px_130px_32px] gap-3 items-center">
              <input
                type="text"
                value={line.description}
                onChange={(e) => updateLine(idx, 'description', e.target.value)}
                placeholder="Varebeskrivelse"
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input
                type="text"
                value={line.quantity}
                onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                placeholder="1"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input
                type="text"
                value={line.unit_price}
                onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                placeholder="0,00"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={() => removeLine(idx)}
                disabled={lines.length === 1}
                className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Total (ekskl. moms)</p>
            <p className="text-xl font-bold text-gray-900">{formatDKK(total)}</p>
          </div>
        </div>
      </div>

      {/* Handlinger */}
      <div className="flex justify-end gap-3">
        <a
          href="/indkoebsordrer"
          className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuller
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? 'Opretter...' : 'Opret indkøbsordre'}
        </button>
      </div>
    </form>
  )
}
