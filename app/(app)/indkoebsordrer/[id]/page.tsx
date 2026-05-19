import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, Package } from 'lucide-react'
import { POActions, StatusFlowBar, POPdfButton } from './po-actions'

function formatDKK(amount: number | null, currency = 'DKK') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

const statusLabel: Record<string, string> = {
  draft: 'Kladde',
  open: 'Åben',
  partially_received: 'Delvist modtaget',
  received: 'Modtaget',
  cancelled: 'Annulleret',
}

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-blue-100 text-blue-700',
  partially_received: 'bg-yellow-100 text-yellow-700',
  received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function IndkoebsOrdrePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: po } = await supabase
    .from('purchase_orders')
    .select(`
      id, po_number, title, status, order_date, expected_delivery,
      currency, total_amount, notes, created_at,
      suppliers(id, name, email, phone)
    `)
    .eq('id', id)
    .single()

  if (!po) notFound()

  const { data: lines } = await supabase
    .from('purchase_order_lines')
    .select('id, description, quantity, unit_price, line_total, sort_order')
    .eq('purchase_order_id', id)
    .order('sort_order', { ascending: true })

  const supplier = po.suppliers as {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null

  // Beregn total fra linjerne (mere præcis end gemt total)
  const computedTotal = (lines ?? []).reduce((sum, l) => sum + (l.line_total ?? 0), 0)

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/indkoebsordrer"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Indkøbsordrer
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{po.po_number}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                statusColor[po.status] ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {statusLabel[po.status] ?? po.status}
            </span>
          </div>
          {po.title && (
            <p className="text-gray-500 text-sm mt-1">{po.title}</p>
          )}
        </div>
        <POPdfButton poId={po.id} />
      </div>

      {/* Statusflow */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Statusflow</p>
        <StatusFlowBar status={po.status} />
        <div className="mt-5 pt-4 border-t border-gray-100">
          <POActions poId={po.id} status={po.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Leverandør */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Leverandør</p>
          </div>
          {supplier ? (
            <div>
              <Link
                href={`/leverandoerer/${supplier.id}`}
                className="font-medium text-gray-900 hover:text-emerald-600 transition-colors"
              >
                {supplier.name}
              </Link>
              {supplier.email && (
                <p className="text-sm text-gray-500 mt-1">{supplier.email}</p>
              )}
              {supplier.phone && (
                <p className="text-sm text-gray-500">{supplier.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Ingen leverandør</p>
          )}
        </div>

        {/* Datoer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datoer</p>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400">Bestillingsdato</p>
              <p className="text-sm font-medium text-gray-900">
                {po.order_date
                  ? new Date(po.order_date).toLocaleDateString('da-DK')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Forventet levering</p>
              <p className="text-sm font-medium text-gray-900">
                {po.expected_delivery
                  ? new Date(po.expected_delivery).toLocaleDateString('da-DK')
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Beløb */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ordrebeløb</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatDKK(computedTotal, po.currency ?? 'DKK')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Ekskl. moms · {po.currency ?? 'DKK'}</p>
          {(lines?.length ?? 0) > 0 && (
            <p className="text-xs text-gray-400 mt-1">{lines!.length} linjepost{lines!.length !== 1 ? 'er' : ''}</p>
          )}
        </div>
      </div>

      {/* Linjeposter */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Linjeposter</h2>
        </div>
        {!lines || lines.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400 text-sm">Ingen linjeposter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-5 py-3 text-left">Beskrivelse</th>
                  <th className="px-5 py-3 text-right">Antal</th>
                  <th className="px-5 py-3 text-right">Enhedspris</th>
                  <th className="px-5 py-3 text-right">Linjetotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-900">{line.description}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 text-right tabular-nums">
                      {Number(line.quantity).toLocaleString('da-DK', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 3,
                      })}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 text-right tabular-nums">
                      {formatDKK(line.unit_price, po.currency ?? 'DKK')}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                      {formatDKK(line.line_total, po.currency ?? 'DKK')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700 text-right">
                    Total (ekskl. moms)
                  </td>
                  <td className="px-5 py-3 text-base font-bold text-gray-900 text-right tabular-nums">
                    {formatDKK(computedTotal, po.currency ?? 'DKK')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Bemærkninger */}
      {po.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bemærkninger</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}
    </div>
  )
}
