'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function markInvoicesAsPaid(invoiceIds: string[]) {
  if (!invoiceIds.length) return { error: 'Ingen fakturaer valgt' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Hent organisation
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const orgId = member?.organization_id
  if (!orgId) return { error: 'Ingen organisation fundet' }

  const today = new Date().toISOString().slice(0, 10)

  // Hent fakturaer for at få beløb til payments-tabellen
  const { data: invoices, error: fetchError } = await supabase
    .from('invoices')
    .select('id, amount_incl_vat, currency, invoice_number')
    .in('id', invoiceIds)
    .eq('status', 'approved')

  if (fetchError || !invoices?.length) {
    return { error: 'Kunne ikke hente fakturaer' }
  }

  // Opret betalingsposter
  const paymentRows = invoices.map((inv) => ({
    organization_id: orgId,
    invoice_id: inv.id,
    payment_date: today,
    amount: inv.amount_incl_vat ?? 0,
    currency: inv.currency ?? 'DKK',
    payment_method: 'bank_transfer',
    reference: inv.invoice_number ?? null,
    status: 'completed',
    created_by: user.id,
  }))

  const { error: payError } = await supabase.from('payments').insert(paymentRows)
  if (payError) return { error: 'Kunne ikke oprette betalingsposter' }

  // Opdater fakturaer til betalt
  const { error: updError } = await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .in('id', invoiceIds)

  if (updError) return { error: 'Kunne ikke opdatere fakturastatus' }

  // Audit log
  for (const inv of invoices) {
    await supabase.from('audit_log').insert({
      organization_id: orgId,
      user_id: user.id,
      action: 'mark_invoice_paid',
      resource_type: 'invoices',
      resource_id: inv.id,
      new_data: { status: 'paid', payment_date: today },
    })
  }

  revalidatePath('/betalinger')
  revalidatePath('/fakturaer')
  return { success: true, count: invoices.length }
}
