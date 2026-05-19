'use server'

import { createClient } from '@/lib/supabase/server'

export interface SearchResult {
  type: 'faktura' | 'leverandoer' | 'indkoebsordre'
  id: string
  title: string
  subtitle: string
  href: string
  status?: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim() || query.trim().length < 2) return []

  const supabase = await createClient()
  const q = query.trim()

  const [invoices, suppliers, orders] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, amount_incl_vat, suppliers(name)')
      .or(`invoice_number.ilike.%${q}%,suppliers.name.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('suppliers')
      .select('id, name, cvr, city, status')
      .or(`name.ilike.%${q}%,cvr.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('purchase_orders')
      .select('id, po_number, status, total_amount, title, suppliers(name)')
      .or(`po_number.ilike.%${q}%,title.ilike.%${q}%`)
      .limit(5),
  ])

  const results: SearchResult[] = []

  for (const inv of invoices.data ?? []) {
    const supplier = inv.suppliers as { name: string } | null
    const amount = inv.amount_incl_vat
      ? new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 0 }).format(inv.amount_incl_vat)
      : null
    results.push({
      type: 'faktura',
      id: inv.id,
      title: inv.invoice_number ?? 'Uden nummer',
      subtitle: [supplier?.name, amount].filter(Boolean).join(' · '),
      href: `/fakturaer/${inv.id}`,
      status: inv.status,
    })
  }

  for (const sup of suppliers.data ?? []) {
    results.push({
      type: 'leverandoer',
      id: sup.id,
      title: sup.name,
      subtitle: [sup.cvr ? `CVR ${sup.cvr}` : null, sup.city].filter(Boolean).join(' · '),
      href: `/leverandoerer/${sup.id}`,
      status: sup.status,
    })
  }

  for (const po of orders.data ?? []) {
    const supplier = po.suppliers as { name: string } | null
    const amount = po.total_amount
      ? new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 0 }).format(po.total_amount)
      : null
    results.push({
      type: 'indkoebsordre',
      id: po.id,
      title: po.po_number,
      subtitle: [po.title ?? supplier?.name, amount].filter(Boolean).join(' · '),
      href: `/indkoebsordrer/${po.id}`,
      status: po.status,
    })
  }

  return results
}
