'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const expenseItemSchema = z.object({
  description: z.string().min(1),
  date: z.string().min(1),
  amount: z.coerce.number().min(0),
  currency: z.string().default('DKK'),
  category: z.enum(['transport', 'hotel', 'meals', 'other']).default('other'),
  vat_amount: z.coerce.number().min(0).optional(),
})

const createReportSchema = z.object({
  title: z.string().min(1, 'Titel er påkrævet'),
  trip_name: z.string().optional(),
  report_date: z.string().min(1),
  currency: z.string().default('DKK'),
  notes: z.string().optional(),
})

export async function createExpenseReport(formData: FormData) {
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
    trip_name: formData.get('trip_name') as string,
    report_date: formData.get('report_date') as string,
    currency: (formData.get('currency') as string) || 'DKK',
    notes: formData.get('notes') as string,
  }

  const parsed = createReportSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { data } = parsed

  // Parse udgiftsposter
  const items: Array<{
    description: string
    date: string
    amount: number
    currency: string
    category: 'transport' | 'hotel' | 'meals' | 'other'
    vat_amount: number | undefined
    sort_order: number
  }> = []

  let i = 0
  while (formData.get(`items[${i}][description]`) !== null) {
    const itemRaw = {
      description: formData.get(`items[${i}][description]`) as string,
      date: formData.get(`items[${i}][date]`) as string,
      amount: formData.get(`items[${i}][amount]`) as string,
      currency: (formData.get(`items[${i}][currency]`) as string) || data.currency,
      category: formData.get(`items[${i}][category]`) as string,
      vat_amount: formData.get(`items[${i}][vat_amount]`) as string,
    }
    const itemParsed = expenseItemSchema.safeParse(itemRaw)
    if (itemParsed.success) {
      items.push({ ...itemParsed.data, sort_order: i })
    }
    i++
  }

  if (items.length === 0) {
    return { error: 'Tilføj mindst ét udgiftspunkt' }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  // Opret rapport
  const { data: report, error: reportError } = await supabase
    .from('expense_reports')
    .insert({
      organization_id: orgId,
      user_id: user.id,
      title: data.title,
      trip_name: data.trip_name || null,
      report_date: data.report_date,
      currency: data.currency,
      total_amount: totalAmount,
      status: 'draft',
      notes: data.notes || null,
    })
    .select('id')
    .single()

  if (reportError || !report) {
    return { error: 'Kunne ikke oprette rejseafregning' }
  }

  // Opret udgiftsposter
  const itemRows = items.map((item) => ({
    expense_report_id: report.id,
    description: item.description,
    date: item.date,
    amount: item.amount,
    currency: item.currency,
    category: item.category,
    vat_amount: item.vat_amount ?? null,
    sort_order: item.sort_order,
  }))

  const { error: itemError } = await supabase.from('expense_items').insert(itemRows)

  if (itemError) {
    await supabase.from('expense_reports').delete().eq('id', report.id)
    return { error: 'Kunne ikke oprette udgiftsposter' }
  }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'create_expense_report',
    resource_type: 'expense_reports',
    resource_id: report.id,
    new_data: { title: data.title, total_amount: totalAmount, status: 'draft' },
  })

  revalidatePath('/rejseafregning')
  redirect(`/rejseafregning/${report.id}`)
}

export async function submitExpenseReport(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('expense_reports')
    .select('status, organization_id, title')
    .eq('id', reportId)
    .single()

  if (!report) return { error: 'Afregning ikke fundet' }
  if (report.status !== 'draft') return { error: 'Kun kladder kan indsendes' }

  const { error } = await supabase
    .from('expense_reports')
    .update({ status: 'submitted' })
    .eq('id', reportId)

  if (error) return { error: 'Kunne ikke indsende afregning' }

  await supabase.from('audit_log').insert({
    organization_id: report.organization_id,
    user_id: user.id,
    action: 'submit_expense_report',
    resource_type: 'expense_reports',
    resource_id: reportId,
    new_data: { status: 'submitted' },
  })

  revalidatePath(`/rejseafregning/${reportId}`)
  revalidatePath('/rejseafregning')
  return { success: true }
}

export async function approveExpenseReport(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('expense_reports')
    .select('status, organization_id')
    .eq('id', reportId)
    .single()

  if (!report) return { error: 'Afregning ikke fundet' }
  if (report.status !== 'submitted') return { error: 'Kun indsendte afregninger kan godkendes' }

  const { error } = await supabase
    .from('expense_reports')
    .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { error: 'Kunne ikke godkende afregning' }

  await supabase.from('audit_log').insert({
    organization_id: report.organization_id,
    user_id: user.id,
    action: 'approve_expense_report',
    resource_type: 'expense_reports',
    resource_id: reportId,
    new_data: { status: 'approved' },
  })

  revalidatePath(`/rejseafregning/${reportId}`)
  revalidatePath('/rejseafregning')
  return { success: true }
}

export async function rejectExpenseReport(reportId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('expense_reports')
    .select('status, organization_id')
    .eq('id', reportId)
    .single()

  if (!report) return { error: 'Afregning ikke fundet' }
  if (report.status !== 'submitted') return { error: 'Kun indsendte afregninger kan afvises' }

  const { error } = await supabase
    .from('expense_reports')
    .update({ status: 'rejected', rejection_reason: reason || null })
    .eq('id', reportId)

  if (error) return { error: 'Kunne ikke afvise afregning' }

  await supabase.from('audit_log').insert({
    organization_id: report.organization_id,
    user_id: user.id,
    action: 'reject_expense_report',
    resource_type: 'expense_reports',
    resource_id: reportId,
    new_data: { status: 'rejected', rejection_reason: reason },
  })

  revalidatePath(`/rejseafregning/${reportId}`)
  revalidatePath('/rejseafregning')
  return { success: true }
}

export async function markExpenseReportPaid(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('expense_reports')
    .select('status, organization_id, total_amount, currency, title, user_id')
    .eq('id', reportId)
    .single()

  if (!report) return { error: 'Afregning ikke fundet' }
  if (report.status !== 'approved') return { error: 'Kun godkendte afregninger kan markeres som udbetalt' }

  const { error } = await supabase
    .from('expense_reports')
    .update({ status: 'paid' })
    .eq('id', reportId)

  if (error) return { error: 'Kunne ikke opdatere status' }

  await supabase.from('audit_log').insert({
    organization_id: report.organization_id,
    user_id: user.id,
    action: 'mark_expense_report_paid',
    resource_type: 'expense_reports',
    resource_id: reportId,
    new_data: { status: 'paid' },
  })

  revalidatePath(`/rejseafregning/${reportId}`)
  revalidatePath('/rejseafregning')
  return { success: true }
}
