'use client'

import { useState, useTransition } from 'react'
import { updateOrganization } from './actions'

interface OrgData {
  name: string
  cvr: string | null
  email: string | null
  phone: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  base_currency: string | null
  fiscal_year_start: string | null
}

const currencies = ['DKK', 'EUR', 'USD', 'SEK', 'NOK', 'GBP']

const fiscalMonths = [
  { value: '01-01', label: 'Januar (01-01)' },
  { value: '02-01', label: 'Februar (02-01)' },
  { value: '03-01', label: 'Marts (03-01)' },
  { value: '04-01', label: 'April (04-01)' },
  { value: '05-01', label: 'Maj (05-01)' },
  { value: '06-01', label: 'Juni (06-01)' },
  { value: '07-01', label: 'Juli (07-01)' },
  { value: '08-01', label: 'August (08-01)' },
  { value: '09-01', label: 'September (09-01)' },
  { value: '10-01', label: 'Oktober (10-01)' },
  { value: '11-01', label: 'November (11-01)' },
  { value: '12-01', label: 'December (12-01)' },
]

export function OrgSettingsForm({ org, isAdmin }: { org: OrgData; isAdmin: boolean }) {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateOrganization(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
          Indstillinger gemt.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Virksomhedsnavn <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={org.name}
            disabled={!isAdmin}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CVR-nummer</label>
          <input
            type="text"
            name="cvr"
            defaultValue={org.cvr ?? ''}
            disabled={!isAdmin}
            placeholder="12345678"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
          <input
            type="email"
            name="email"
            defaultValue={org.email ?? ''}
            disabled={!isAdmin}
            placeholder="kontakt@virksomhed.dk"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
          <input
            type="text"
            name="phone"
            defaultValue={org.phone ?? ''}
            disabled={!isAdmin}
            placeholder="+45 12 34 56 78"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Basisvaluta</label>
          <select
            name="base_currency"
            defaultValue={org.base_currency ?? 'DKK'}
            disabled={!isAdmin}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500 bg-white"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Regnskabsår starter</label>
          <select
            name="fiscal_year_start"
            defaultValue={org.fiscal_year_start ?? '01-01'}
            disabled={!isAdmin}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500 bg-white"
          >
            {fiscalMonths.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Første dag i regnskabsåret — bruges til periodevisning</p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
          <input
            type="text"
            name="address"
            defaultValue={org.address ?? ''}
            disabled={!isAdmin}
            placeholder="Gadenavn 1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Postnummer</label>
          <input
            type="text"
            name="postal_code"
            defaultValue={org.postal_code ?? ''}
            disabled={!isAdmin}
            placeholder="1234"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">By</label>
          <input
            type="text"
            name="city"
            defaultValue={org.city ?? ''}
            disabled={!isAdmin}
            placeholder="København"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Land</label>
          <select
            name="country"
            defaultValue={org.country ?? 'DK'}
            disabled={!isAdmin}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-500 bg-white"
          >
            <option value="DK">Danmark</option>
            <option value="SE">Sverige</option>
            <option value="NO">Norge</option>
            <option value="FI">Finland</option>
            <option value="DE">Tyskland</option>
            <option value="GB">Storbritannien</option>
          </select>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Gemmer...' : 'Gem ændringer'}
          </button>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs text-gray-400">Kun administratorer kan redigere disse indstillinger.</p>
      )}
    </form>
  )
}
