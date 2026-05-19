import { createClient } from '@/lib/supabase/server'
import { createInvoice } from '../actions'
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react'
import Link from 'next/link'

const STARTER_LIMIT = 50

export default async function NyFakturaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const suppliers = user
    ? (await supabase.from('suppliers').select('id, name').eq('status', 'active').order('name')).data
    : null

  // Tjek Starter-plan grænse
  let planBanner: { type: 'warning' | 'blocked'; message: string } | null = null
  if (user) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(plan)')
      .eq('user_id', user.id)
      .maybeSingle()

    const org = member?.organizations as { plan: string } | null
    if (org?.plan === 'starter') {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', member!.organization_id)
        .gte('created_at', startOfMonth)

      const used = count ?? 0
      const remaining = STARTER_LIMIT - used
      if (remaining <= 0) {
        planBanner = {
          type: 'blocked',
          message: `Du har brugt alle ${STARTER_LIMIT} fakturaer på din Starter-plan denne måned. Opgrader til Professional for ubegrænset adgang.`,
        }
      } else if (remaining <= 5) {
        planBanner = {
          type: 'warning',
          message: `Du har ${remaining} faktura${remaining !== 1 ? 'er' : ''} tilbage på din Starter-plan denne måned (${used}/${STARTER_LIMIT} brugt).`,
        }
      }
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/fakturaer" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} />
          Tilbage til fakturaer
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Ny faktura</h1>
        <p className="text-gray-500 text-sm mt-1">Registrér en indkommende faktura manuelt</p>
      </div>

      {planBanner && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border mb-5 ${
          planBanner.type === 'blocked'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {planBanner.type === 'blocked'
            ? <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
            : <Info size={15} className="flex-shrink-0 mt-0.5" />}
          <div>
            <p className="text-xs font-medium">{planBanner.message}</p>
            {planBanner.type === 'blocked' && (
              <Link href="/indstillinger" className="text-xs underline mt-1 inline-block">
                Gå til abonnement →
              </Link>
            )}
          </div>
        </div>
      )}

      <form action={createInvoice} className="space-y-6">
        {/* Leverandør */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Leverandør</h2>
          <div>
            <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">
              Leverandør
            </label>
            <select
              id="supplier_id"
              name="supplier_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">— Vælg leverandør —</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
              Fakturanummer
            </label>
            <input
              id="invoice_number"
              name="invoice_number"
              type="text"
              placeholder="F-2024-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Datoer */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Datoer</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fakturadato
              </label>
              <input
                id="invoice_date"
                name="invoice_date"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                Forfaldsdato
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Beløb */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Beløb</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="amount_excl_vat" className="block text-sm font-medium text-gray-700 mb-1">
                Beløb ex. moms
              </label>
              <input
                id="amount_excl_vat"
                name="amount_excl_vat"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="vat_amount" className="block text-sm font-medium text-gray-700 mb-1">
                Momsbeløb
              </label>
              <input
                id="vat_amount"
                name="vat_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="amount_incl_vat" className="block text-sm font-medium text-gray-700 mb-1">
                Beløb inkl. moms <span className="text-red-500">*</span>
              </label>
              <input
                id="amount_incl_vat"
                name="amount_incl_vat"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Valuta
            </label>
            <select
              id="currency"
              name="currency"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="DKK">DKK — Danske kroner</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — Amerikanske dollar</option>
              <option value="GBP">GBP — Britiske pund</option>
              <option value="SEK">SEK — Svenske kroner</option>
              <option value="NOK">NOK — Norske kroner</option>
            </select>
          </div>
        </div>

        {/* Noter */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Interne noter
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Tilføj interne noter til fakturaen..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={planBanner?.type === 'blocked'}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
          >
            Opret faktura
          </button>
          <Link
            href="/fakturaer"
            className="py-2.5 px-6 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuller
          </Link>
        </div>
      </form>
    </div>
  )
}
