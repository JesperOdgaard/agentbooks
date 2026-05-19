'use client'

import { useState } from 'react'
import { updateSupplier } from '../actions'

interface SupplierRow {
  id: string
  name: string
  cvr: string | null
  email: string | null
  phone: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  payment_terms: number | null
  iban: string | null
  bank_reg_no: string | null
  bank_account_no: string | null
  notes: string | null
  status: string
}

const TABS = ['Stamdata', 'Kontakt', 'Bank'] as const
type Tab = typeof TABS[number]

const field = 'w-full px-2 py-1.5 text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 transition-colors placeholder-gray-300'
const mono  = `${field} font-mono`
const lbl   = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5'

export function SupplierEditForm({ supplier }: { supplier: SupplierRow }) {
  const [tab, setTab]       = useState<Tab>('Stamdata')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setSaved(false)
    setError(null)
    const result = await updateSupplier(supplier.id, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <form action={handleSubmit}>

      {/* Tab-navigation */}
      <div className="flex border-b border-gray-100 mb-4 -mx-4 px-4">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`text-[11px] font-semibold pb-2 mr-4 border-b-2 transition-colors ${
              tab === t
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stamdata */}
      <div className={tab === 'Stamdata' ? 'space-y-3' : 'hidden'}>
        <div>
          <label htmlFor="name" className={lbl}>Navn *</label>
          <input id="name" name="name" type="text" required defaultValue={supplier.name} className={field} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="cvr" className={lbl}>CVR</label>
            <input id="cvr" name="cvr" type="text" maxLength={8} defaultValue={supplier.cvr ?? ''} placeholder="12345678" className={mono} />
          </div>
          <div>
            <label htmlFor="payment_terms" className={lbl}>Net (dage)</label>
            <input id="payment_terms" name="payment_terms" type="number" min="0" max="365" defaultValue={supplier.payment_terms ?? 30} className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="status" className={lbl}>Status</label>
          <select id="status" name="status" defaultValue={supplier.status} className={field}>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>
      </div>

      {/* Kontakt */}
      <div className={tab === 'Kontakt' ? 'space-y-3' : 'hidden'}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="email" className={lbl}>E-mail</label>
            <input id="email" name="email" type="email" defaultValue={supplier.email ?? ''} placeholder="kontakt@firma.dk" className={field} />
          </div>
          <div>
            <label htmlFor="phone" className={lbl}>Telefon</label>
            <input id="phone" name="phone" type="tel" defaultValue={supplier.phone ?? ''} placeholder="+45 12 34 56 78" className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="address" className={lbl}>Adresse</label>
          <input id="address" name="address" type="text" defaultValue={supplier.address ?? ''} placeholder="Gadenavn 1" className={field} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="postal_code" className={lbl}>Postnr.</label>
            <input id="postal_code" name="postal_code" type="text" defaultValue={supplier.postal_code ?? ''} placeholder="1234" className={field} />
          </div>
          <div>
            <label htmlFor="city" className={lbl}>By</label>
            <input id="city" name="city" type="text" defaultValue={supplier.city ?? ''} placeholder="København" className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className={lbl}>Interne noter</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={supplier.notes ?? ''} placeholder="Interne noter..." className={`${field} resize-none`} />
        </div>
      </div>

      {/* Bank */}
      <div className={tab === 'Bank' ? 'space-y-3' : 'hidden'}>
        <div>
          <label htmlFor="iban" className={lbl}>IBAN</label>
          <input id="iban" name="iban" type="text" defaultValue={supplier.iban ?? ''} placeholder="DK5000400440116243" className={mono} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="bank_reg_no" className={lbl}>Reg.nr.</label>
            <input id="bank_reg_no" name="bank_reg_no" type="text" maxLength={4} defaultValue={supplier.bank_reg_no ?? ''} placeholder="0040" className={mono} />
          </div>
          <div>
            <label htmlFor="bank_account_no" className={lbl}>Kontonr.</label>
            <input id="bank_account_no" name="bank_account_no" type="text" defaultValue={supplier.bank_account_no ?? ''} placeholder="0440116243" className={mono} />
          </div>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="mt-3 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">{error}</p>
      )}
      {saved && (
        <p className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">✓ Gemt</p>
      )}

      {/* Gem-knap */}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-md transition-colors"
      >
        {saving ? 'Gemmer…' : 'Gem ændringer'}
      </button>
    </form>
  )
}
