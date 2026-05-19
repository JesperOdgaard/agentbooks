import { createClient } from '@/lib/supabase/server'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { POTable } from './po-table'

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
            <POTable orders={(orders ?? []).map((o) => ({
              ...o,
              suppliers: Array.isArray(o.suppliers) ? (o.suppliers[0] ?? null) : (o.suppliers as { name: string } | null),
            }))} />
          </div>
        )}
      </div>
    </div>
  )
}
