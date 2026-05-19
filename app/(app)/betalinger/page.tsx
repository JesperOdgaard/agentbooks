import { createClient } from '@/lib/supabase/server'
import { CreditCard, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { PaymentQueue } from './payment-queue'

function formatDKK(amount: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
  }).format(amount)
}

const methodLabel: Record<string, string> = {
  bank_transfer: 'Bankoverførsel',
  card: 'Kort',
  cash: 'Kontant',
  other: 'Andet',
}

export default async function BetalingerPage() {
  const supabase = await createClient()

  // Godkendte fakturaer der afventer betaling
  const { data: approvedInvoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, due_date, amount_incl_vat, currency,
      suppliers(name, iban, bank_reg_no, bank_account_no)
    `)
    .eq('status', 'approved')
    .order('due_date', { ascending: true })

  // Betalingshistorik
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, currency, payment_date, payment_method, reference, invoices(invoice_number, suppliers(name))')
    .order('payment_date', { ascending: false })
    .limit(50)

  // Statistik
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const todayStr = now.toISOString().slice(0, 10)

  const thisMonth = payments?.filter((p) => p.payment_date >= startOfMonth) ?? []
  const thisMonthTotal = thisMonth.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const pendingTotal = approvedInvoices?.reduce((sum, inv) => sum + (inv.amount_incl_vat ?? 0), 0) ?? 0
  const overdueCount = approvedInvoices?.filter((inv) => inv.due_date && inv.due_date < todayStr).length ?? 0

  // Map til props-format (supplier er nested object)
  const pendingInvoices = (approvedInvoices ?? []).map((inv) => {
    const supplier = inv.suppliers as {
      name: string
      iban: string | null
      bank_reg_no: string | null
      bank_account_no: string | null
    } | null
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      due_date: inv.due_date,
      amount_incl_vat: inv.amount_incl_vat,
      currency: inv.currency ?? 'DKK',
      supplier_name: supplier?.name ?? null,
      supplier_iban: supplier?.iban ?? null,
      supplier_bank_reg: supplier?.bank_reg_no ?? null,
      supplier_bank_account: supplier?.bank_account_no ?? null,
    }
  })

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Betalinger</h1>
        <p className="text-gray-500 text-sm mt-1">Administrer leverandørbetalinger og eksporter betalingsfiler</p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Afventer betaling</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingInvoices.length}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDKK(pendingTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Forfaldne</span>
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Betalt denne måned</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDKK(thisMonthTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Betalinger i alt</span>
            <CreditCard size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{payments?.length ?? 0}</p>
        </div>
      </div>

      {/* Klar til betaling */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Klar til betaling</h2>
            <p className="text-xs text-gray-500 mt-0.5">Godkendte fakturaer der ikke er betalt endnu</p>
          </div>
          <Link
            href="/fakturaer?status=approved"
            className="text-sm text-emerald-600 hover:underline"
          >
            Se alle godkendte →
          </Link>
        </div>
        <PaymentQueue invoices={pendingInvoices} />
      </div>

      {/* Betalingshistorik */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Betalingshistorik</h2>
        <div className="bg-white rounded-xl border border-gray-200">
          {!payments || payments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CreditCard size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Ingen betalinger registreret endnu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left">Faktura</th>
                    <th className="px-5 py-3 text-left">Leverandør</th>
                    <th className="px-5 py-3 text-left">Dato</th>
                    <th className="px-5 py-3 text-right">Beløb</th>
                    <th className="px-5 py-3 text-left">Metode</th>
                    <th className="px-5 py-3 text-left">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((payment) => {
                    const invoice = payment.invoices as { invoice_number: string | null; suppliers: { name: string } | null } | null
                    const supplier = invoice?.suppliers
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">
                          {invoice?.invoice_number ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{supplier?.name ?? '—'}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {payment.payment_date
                            ? new Date(payment.payment_date).toLocaleDateString('da-DK')
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                          {new Intl.NumberFormat('da-DK', {
                            style: 'currency',
                            currency: payment.currency ?? 'DKK',
                            minimumFractionDigits: 2,
                          }).format(payment.amount ?? 0)}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {methodLabel[payment.payment_method] ?? payment.payment_method ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400">{payment.reference ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
