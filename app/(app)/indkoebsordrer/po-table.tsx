'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

function formatDKK(amount: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
  }).format(amount)
}

interface PORow {
  id: string
  po_number: string | null
  status: string
  order_date: string | null
  expected_delivery: string | null
  total_amount: number | null
  suppliers: { name: string } | null
}

export function POTable({ orders }: { orders: PORow[] }) {
  const router = useRouter()

  return (
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
        {orders.map((order) => (
          <tr
            key={order.id}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => router.push(`/indkoebsordrer/${order.id}`)}
          >
            <td className="px-6 py-4 text-sm font-medium text-gray-900">
              <Link
                href={`/indkoebsordrer/${order.id}`}
                className="hover:text-emerald-600 transition-colors font-mono"
                onClick={(e) => e.stopPropagation()}
              >
                {order.po_number ?? '—'}
              </Link>
            </td>
            <td className="px-6 py-4 text-sm text-gray-500">
              {order.suppliers?.name ?? '—'}
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
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {statusLabel[order.status] ?? order.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
