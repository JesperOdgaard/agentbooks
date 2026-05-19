import { createClient } from '@/lib/supabase/server'
import { Download } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { InvoiceUploadZone } from './invoice-upload-zone'

function formatDKK(amount: number, currency = 'DKK') {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
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

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  awaiting_approval: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const tabs = [
  { label: 'Alle', status: null },
  { label: 'Afventer', status: 'pending' },
  { label: 'Til godkendelse', status: 'awaiting_approval' },
  { label: 'Godkendt', status: 'approved' },
  { label: 'Betalt', status: 'paid' },
  { label: 'Forfaldne', status: 'overdue' },
]

export default async function FakturaerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams
  const supabase = await createClient()

  // Fakturaer (filtreret)
  let query = supabase
    .from('invoices')
    .select('id, invoice_number, status, invoice_date, due_date, amount_incl_vat, currency, suppliers!left(name)')
    .order('created_at', { ascending: false })

  if (filterStatus) query = query.eq('status', filterStatus)

  const { data: invoices } = await query

  // Tæl til tabs (ufiltreret)
  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('id, status')

  function tabCount(status: string | null) {
    if (!allInvoices) return 0
    if (!status) return allInvoices.length
    return allInvoices.filter((i) => i.status === status).length
  }

  const total = allInvoices?.length ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fakturaer</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} faktura{total !== 1 ? 'er' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/fakturaer/eksport"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors bg-white"
          >
            <Download size={14} />
            Eksporter
          </Link>
          <Link
            href="/fakturaer/ny"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Upload faktura
          </Link>
        </div>
      </div>

      {/* Upload-zone — henter sin egen orgId klient-side */}
      <Suspense>
        <InvoiceUploadZone />
      </Suspense>

      {/* Tabel-kort */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Statusfiltre */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const count = tabCount(tab.status)
            const isActive = (tab.status ?? '') === (filterStatus ?? '')
            return (
              <Link
                key={tab.label}
                href={tab.status ? `/fakturaer?status=${tab.status}` : '/fakturaer'}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                      isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-white text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {!invoices || invoices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">
              {filterStatus
                ? `Ingen fakturaer med status "${statusLabel[filterStatus] ?? filterStatus}"`
                : 'Ingen data'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left">Fakturanummer</th>
                  <th className="px-5 py-3 text-left">Leverandør</th>
                  <th className="px-5 py-3 text-left">Dato</th>
                  <th className="px-5 py-3 text-left">Forfaldsdato</th>
                  <th className="px-5 py-3 text-right">Beløb</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((invoice) => {
                  const supplier = invoice.suppliers as { name: string } | null
                  const isOverdue =
                    invoice.status === 'overdue' ||
                    (invoice.status === 'approved' &&
                      invoice.due_date &&
                      invoice.due_date < new Date().toISOString().slice(0, 10))
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-4 text-sm font-mono text-gray-500">
                        <Link href={`/fakturaer/${invoice.id}`} className="block group-hover:text-emerald-600">
                          {invoice.invoice_number ?? <span className="text-gray-300 italic">Intet nr.</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        <Link href={`/fakturaer/${invoice.id}`} className="block group-hover:text-emerald-600">
                          {supplier?.name ?? <span className="text-gray-400 font-normal italic">Ingen leverandør</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        <Link href={`/fakturaer/${invoice.id}`} className="block">
                          {invoice.invoice_date
                            ? new Date(invoice.invoice_date).toLocaleDateString('da-DK')
                            : '—'}
                        </Link>
                      </td>
                      <td className={`px-5 py-4 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        <Link href={`/fakturaer/${invoice.id}`} className="block">
                          {invoice.due_date
                            ? new Date(invoice.due_date).toLocaleDateString('da-DK')
                            : '—'}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 text-right tabular-nums">
                        <Link href={`/fakturaer/${invoice.id}`} className="block">
                          {invoice.amount_incl_vat != null
                            ? formatDKK(invoice.amount_incl_vat, invoice.currency ?? 'DKK')
                            : <span className="text-gray-300 font-normal">—</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/fakturaer/${invoice.id}`} className="block">
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              statusColor[invoice.status] ?? 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {statusLabel[invoice.status] ?? invoice.status}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
