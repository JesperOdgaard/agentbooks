import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExportForm } from './export-form'
import type { Database } from '@/lib/types'

type InvoiceRow = Database['public']['Tables']['invoices']['Row']
type SupplierRow = Database['public']['Tables']['suppliers']['Row']

export interface InvoiceExportRow {
  id: string
  invoice_number: string | null
  status: string | null
  invoice_date: string | null
  due_date: string | null
  amount_excl_vat: number | null
  vat_amount: number | null
  amount_incl_vat: number | null
  currency: string | null
  notes: string | null
  supplier_name: string | null
}

export default async function FakturaerEksportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invoicesData } = await supabase
    .from('invoices')
    .select('*')
    .order('invoice_date', { ascending: false })

  const { data: suppliersData } = await supabase
    .from('suppliers')
    .select('id, name')

  const invoiceRows = (invoicesData ?? []) as InvoiceRow[]
  const supplierRows = (suppliersData ?? []) as Pick<SupplierRow, 'id' | 'name'>[]
  const supplierMap = new Map(supplierRows.map((s) => [s.id, s.name]))

  const invoices: InvoiceExportRow[] = invoiceRows.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    status: inv.status,
    invoice_date: inv.invoice_date,
    due_date: inv.due_date,
    amount_excl_vat: inv.amount_excl_vat,
    vat_amount: null,
    amount_incl_vat: inv.amount_incl_vat,
    currency: inv.currency,
    notes: inv.notes,
    supplier_name: inv.supplier_id ? (supplierMap.get(inv.supplier_id) ?? null) : null,
  }))

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/fakturaer"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Fakturaer
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Eksporter fakturaer</h1>
        <p className="text-gray-500 text-sm mt-1">
          Filtrer og download fakturaer som CSV-fil
        </p>
      </div>

      <ExportForm invoices={invoices} />
    </div>
  )
}
