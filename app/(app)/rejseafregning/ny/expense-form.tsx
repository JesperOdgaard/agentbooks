'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createExpenseReport } from '../actions'

interface ExpenseItem {
  description: string
  date: string
  amount: string
  category: string
  vat_amount: string
}

const categoryLabel: Record<string, string> = {
  transport: 'Transport',
  hotel: 'Hotel',
  meals: 'Forplejning',
  other: 'Andet',
}

function parseNum(s: string) {
  return parseFloat(s.replace(',', '.')) || 0
}

function formatDKK(n: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
  }).format(n)
}

export function ExpenseCreateForm() {
  const today = new Date().toISOString().slice(0, 10)
  const [items, setItems] = useState<ExpenseItem[]>([
    { description: '', date: today, amount: '', category: 'other', vat_amount: '' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const total = items.reduce((sum, item) => sum + parseNum(item.amount), 0)

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: '', date: today, amount: '', category: 'other', vat_amount: '' },
    ])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof ExpenseItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    items.forEach((item, i) => {
      formData.set(`items[${i}][description]`, item.description)
      formData.set(`items[${i}][date]`, item.date)
      formData.set(`items[${i}][amount]`, item.amount.replace(',', '.'))
      formData.set(`items[${i}][category]`, item.category)
      if (item.vat_amount) {
        formData.set(`items[${i}][vat_amount]`, item.vat_amount.replace(',', '.'))
      }
    })

    startTransition(async () => {
      const result = await createExpenseReport(formData)
      if (result?.error) setError(result.error)
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
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="F.eks. Kundebesøg i Aarhus"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rejsenavn / projekt</label>
            <input
              type="text"
              name="trip_name"
              placeholder="F.eks. Q2 Salgsturné"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Afregningsdato <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="report_date"
              required
              defaultValue={today}
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
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Bemærkninger</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            placeholder="Evt. yderligere forklaring..."
          />
        </div>
      </div>

      {/* Udgiftsposter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Udgiftsposter</h2>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Plus size={14} />
            Tilføj udgift
          </button>
        </div>

        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_110px_130px_90px_32px] gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            <span>Beskrivelse</span>
            <span>Dato</span>
            <span>Kategori</span>
            <span className="text-right">Beløb</span>
            <span className="text-right">Heraf moms</span>
            <span />
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_120px_110px_130px_90px_32px] gap-2 items-center">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                placeholder="Beskrivelse"
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input
                type="date"
                value={item.date}
                onChange={(e) => updateItem(idx, 'date', e.target.value)}
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <select
                value={item.category}
                onChange={(e) => updateItem(idx, 'category', e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              >
                {Object.entries(categoryLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                type="text"
                value={item.amount}
                onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                placeholder="0,00"
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input
                type="text"
                value={item.vat_amount}
                onChange={(e) => updateItem(idx, 'vat_amount', e.target.value)}
                placeholder="0,00"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
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
            <p className="text-xs text-gray-400 mb-0.5">Samlet beløb</p>
            <p className="text-xl font-bold text-gray-900">{formatDKK(total)}</p>
          </div>
        </div>
      </div>

      {/* Handlinger */}
      <div className="flex justify-end gap-3">
        <a
          href="/rejseafregning"
          className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuller
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? 'Gemmer...' : 'Gem som kladde'}
        </button>
      </div>
    </form>
  )
}
