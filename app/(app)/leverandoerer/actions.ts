'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const supplierSchema = z.object({
  name: z.string().min(1, 'Navn er påkrævet'),
  cvr: z.string().optional(),
  email: z.string().email('Ugyldig e-mail').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  payment_terms: z.coerce.number().min(0).max(365).default(30),
  iban: z.string().optional(),
  bank_reg_no: z.string().optional(),
  bank_account_no: z.string().optional(),
  notes: z.string().optional(),
})

export async function createSupplier(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Hent organisation
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member?.organization_id) return { error: 'Ingen organisation fundet.' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = supplierSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const d = parsed.data

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      organization_id: member.organization_id,
      name: d.name,
      cvr: d.cvr || null,
      email: d.email || null,
      phone: d.phone || null,
      address: d.address || null,
      postal_code: d.postal_code || null,
      city: d.city || null,
      payment_terms: d.payment_terms,
      iban: d.iban || null,
      bank_reg_no: d.bank_reg_no || null,
      bank_account_no: d.bank_account_no || null,
      notes: d.notes || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !supplier) {
    return { error: 'Kunne ikke oprette leverandør. Prøv igen.' }
  }

  revalidatePath('/leverandoerer')
  redirect(`/leverandoerer/${supplier.id}`)
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const raw = Object.fromEntries(formData.entries())
  const parsed = supplierSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const d = parsed.data

  const { error } = await supabase
    .from('suppliers')
    .update({
      name: d.name,
      cvr: d.cvr || null,
      email: d.email || null,
      phone: d.phone || null,
      address: d.address || null,
      postal_code: d.postal_code || null,
      city: d.city || null,
      payment_terms: d.payment_terms,
      iban: d.iban || null,
      bank_reg_no: d.bank_reg_no || null,
      bank_account_no: d.bank_account_no || null,
      notes: d.notes || null,
    })
    .eq('id', supplierId)

  if (error) return { error: 'Kunne ikke opdatere leverandør.' }

  revalidatePath(`/leverandoerer/${supplierId}`)
  revalidatePath('/leverandoerer')
  return { success: true }
}
