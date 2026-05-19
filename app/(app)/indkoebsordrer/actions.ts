'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const poLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.001),
  unit_price: z.coerce.number().min(0),
  sort_order: z.coerce.number().default(0),
})

const createPOSchema = z.object({
  title: z.string().optional(),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  order_date: z.string().min(1),
  expected_delivery: z.string().optional(),
  currency: z.string().default('DKK'),
  notes: z.string().optional(),
  status: z.enum(['draft', 'open']).default('open'),
})

export async function createPurchaseOrder(formData: FormData) {
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

  const raw = {
    title: formData.get('title') as string,
    supplier_id: formData.get('supplier_id') as string,
    order_date: formData.get('order_date') as string,
    expected_delivery: formData.get('expected_delivery') as string,
    currency: (formData.get('currency') as string) || 'DKK',
    notes: formData.get('notes') as string,
    status: (formData.get('status') as 'draft' | 'open') || 'open',
  }

  const parsed = createPOSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { data } = parsed

  // Parse linjeposter fra formdata (lines[0][description], lines[0][quantity], osv.)
  const lines: Array<{ description: string; quantity: number; unit_price: number; sort_order: number }> = []
  let i = 0
  while (formData.get(`lines[${i}][description]`) !== null) {
    const lineRaw = {
      description: formData.get(`lines[${i}][description]`) as string,
      quantity: formData.get(`lines[${i}][quantity]`) as string,
      unit_price: formData.get(`lines[${i}][unit_price]`) as string,
      sort_order: i,
    }
    const lineParsed = poLineSchema.safeParse(lineRaw)
    if (lineParsed.success) {
      lines.push(lineParsed.data)
    }
    i++
  }

  if (lines.length === 0) {
    return { error: 'Tilføj mindst én linjepost' }
  }

  // Beregn total
  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)

  // Generer PO-nummer
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('purchase_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  const seq = String((count ?? 0) + 1).padStart(4, '0')
  const po_number = `PO-${year}-${seq}`

  // Opret indkøbsordre
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      organization_id: orgId,
      po_number,
      title: data.title || null,
      supplier_id: data.supplier_id || null,
      order_date: data.order_date,
      expected_delivery: data.expected_delivery || null,
      currency: data.currency,
      total_amount: totalAmount,
      status: data.status,
      notes: data.notes || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (poError || !po) {
    return { error: 'Kunne ikke oprette indkøbsordre' }
  }

  // Opret linjeposter
  const lineRows = lines.map((line) => ({
    purchase_order_id: po.id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    sort_order: line.sort_order,
  }))

  const { error: lineError } = await supabase
    .from('purchase_order_lines')
    .insert(lineRows)

  if (lineError) {
    // Slet PO hvis linjerne fejler
    await supabase.from('purchase_orders').delete().eq('id', po.id)
    return { error: 'Kunne ikke oprette linjeposter' }
  }

  // Audit log
  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'create_purchase_order',
    resource_type: 'purchase_orders',
    resource_id: po.id,
    new_data: { po_number, status: data.status, total_amount: totalAmount },
  })

  revalidatePath('/indkoebsordrer')
  redirect(`/indkoebsordrer/${po.id}`)
}

export async function updatePurchaseOrderStatus(poId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const validTransitions: Record<string, string[]> = {
    draft: ['open', 'cancelled'],
    open: ['partially_received', 'received', 'cancelled'],
    partially_received: ['received', 'cancelled'],
    received: [],
    cancelled: [],
  }

  // Hent nuværende status
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status, organization_id')
    .eq('id', poId)
    .single()

  if (!po) return { error: 'Indkøbsordre ikke fundet' }

  const allowed = validTransitions[po.status] ?? []
  if (!allowed.includes(status)) {
    return { error: `Kan ikke skifte fra "${po.status}" til "${status}"` }
  }

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('id', poId)

  if (error) return { error: 'Kunne ikke opdatere status' }

  await supabase.from('audit_log').insert({
    organization_id: po.organization_id,
    user_id: user.id,
    action: 'update_purchase_order_status',
    resource_type: 'purchase_orders',
    resource_id: poId,
    new_data: { status },
    old_data: { status: po.status },
  })

  revalidatePath(`/indkoebsordrer/${poId}`)
  revalidatePath('/indkoebsordrer')
  return { success: true }
}

export async function deletePurchaseOrder(poId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Kan kun slette kladder
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status, organization_id, po_number')
    .eq('id', poId)
    .single()

  if (!po) return { error: 'Indkøbsordre ikke fundet' }
  if (po.status !== 'draft') return { error: 'Kun kladder kan slettes' }

  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', poId)

  if (error) return { error: 'Kunne ikke slette indkøbsordre' }

  await supabase.from('audit_log').insert({
    organization_id: po.organization_id,
    user_id: user.id,
    action: 'delete_purchase_order',
    resource_type: 'purchase_orders',
    resource_id: poId,
    new_data: { deleted: true, po_number: po.po_number },
  })

  revalidatePath('/indkoebsordrer')
  redirect('/indkoebsordrer')
}
