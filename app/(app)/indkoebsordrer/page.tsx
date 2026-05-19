import { createClient } from '@/lib/supabase/server'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'

function formatDKK(amount: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
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

export default async function IndkoebsordrerPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select('id, po_number, status, order_date, expected_delivery, total_amount, suppliers(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indkøbsordrer</h1>
          <p className="text-gray-500 text-sm mt-1">Administrér indkøbsordrer og leverancer</p>
        </div>
        <Link
          href="/indkoebsordrer/ny"
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Ny indkøbsordre
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {!orders || orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingCart size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Ingen indkøbsordrer endnu</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">Opret din første indkøbsordre</p>
            <Link
              href="/indkoebsordrer/ny"
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Ny indkøbsordre
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 text-left">PO-nummer</th>
                  <th className="px-6 py-3 text-left">Leverandør</th>
                  <th className="px-6 py-3 text-left">Dato</th>
                  <th className="px-6 py-3 text-left">Forv. levering</th>
                  <th className="px-6 py-3 text-right">Beløb</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => {
                  const supplier = order.suppliers as { name: string } | null
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/indkoebsordrer/${order.id}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <Link href={`/indkoebsordrer/${order.id}`} className="hover:text-emerald-600 transition-colors font-mono">
                          {order.po_number ?? '—'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {supplier?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.order_date
                          ? new Date(order.order_date).toLocaleDateString('da-DK')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.expected_delivery
                          ? new Date(order.expected_delivery).toLocaleDateString('da-DK')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right tabular-nums">
                        {formatDKK(order.total_amount ?? 0)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            statusColor[order.status] ?? 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {statusLabel[order.status] ?? order.status}
                        </span>
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
