'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional(),
  amount_excl_vat: z.coerce.number().min(0).optional(),
  vat_amount: z.coerce.number().min(0).optional(),
  amount_incl_vat: z.coerce.number().min(0),
  currency: z.string().default('DKK'),
  notes: z.string().optional(),
})

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

const STARTER_INVOICE_LIMIT = 50

async function checkStarterPlanLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<{ blocked: true; error: string } | { blocked: false }> {
  // Hent organisationens plan
  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single()

  if (!org || org.plan !== 'starter') return { blocked: false }

  // Tæl fakturaer oprettet denne måned
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('created_at', startOfMonth)

  if ((count ?? 0) >= STARTER_INVOICE_LIMIT) {
    return {
      blocked: true,
      error: `Din Starter-plan tillader maksimalt ${STARTER_INVOICE_LIMIT} fakturaer per måned. Opgrader til Professional for ubegrænset adgang.`,
    }
  }

  return { blocked: false }
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet.' }

  const planCheck = await checkStarterPlanLimit(supabase, orgId)
  if (planCheck.blocked) return { error: planCheck.error }

  const raw = {
    supplier_id: formData.get('supplier_id') as string,
    invoice_number: formData.get('invoice_number') as string,
    invoice_date: formData.get('invoice_date') as string,
    due_date: formData.get('due_date') as string,
    amount_excl_vat: formData.get('amount_excl_vat') as string,
    vat_amount: formData.get('vat_amount') as string,
    amount_incl_vat: formData.get('amount_incl_vat') as string,
    currency: (formData.get('currency') as string) || 'DKK',
    notes: formData.get('notes') as string,
  }

  const parsed = createInvoiceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { data } = parsed

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      organization_id: orgId,
      supplier_id: data.supplier_id || null,
      invoice_number: data.invoice_number || null,
      invoice_date: data.invoice_date || null,
      due_date: data.due_date || null,
      amount_excl_vat: data.amount_excl_vat ?? null,
      vat_amount: data.vat_amount ?? null,
      amount_incl_vat: data.amount_incl_vat,
      currency: data.currency,
      notes: data.notes || null,
      created_by: user.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !invoice) {
    return { error: 'Kunne ikke oprette faktura. Prøv igen.' }
  }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'create_invoice',
    resource_type: 'invoices',
    resource_id: invoice.id,
    new_data: { invoice_number: data.invoice_number, amount_incl_vat: data.amount_incl_vat },
  })

  revalidatePath('/fakturaer')
  redirect(`/fakturaer/${invoice.id}`)
}

export async function approveInvoice(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = await getOrgId(supabase, user.id)

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (error) return { error: 'Kunne ikke godkende faktura.' }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'approve_invoice',
    resource_type: 'invoices',
    resource_id: invoiceId,
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  revalidatePath('/fakturaer')
  return { success: true }
}

export async function rejectInvoice(invoiceId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = await getOrgId(supabase, user.id)

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'rejected',
      rejection_reason: reason,
    })
    .eq('id', invoiceId)

  if (error) return { error: 'Kunne ikke afvise faktura.' }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'reject_invoice',
    resource_type: 'invoices',
    resource_id: invoiceId,
    new_data: { reason },
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  revalidatePath('/fakturaer')
  return { success: true }
}

export async function createInvoiceFromUpload(
  filePath: string,
  fileName: string,
  fileType: string,
  fileSizeBytes: number,
): Promise<{ success?: boolean; invoiceId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  // orgId er første segment i stien: "{orgId}/{uuid}/faktura.ext"
  const orgId = filePath.split('/')[0]
  if (!orgId) return { error: 'Ugyldigt filsti' }

  const planCheck = await checkStarterPlanLimit(supabase, orgId)
  if (planCheck.blocked) return { error: planCheck.error }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      organization_id: orgId,
      status: 'pending',
      created_by: user.id,
      file_url: filePath,
      file_name: fileName,
      file_type: fileType,
      file_size_bytes: fileSizeBytes,
    })
    .select('id')
    .single()

  if (error || !invoice) return { error: `Kunne ikke oprette faktura: ${error?.message ?? 'ukendt fejl'}` }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'upload_invoice',
    resource_type: 'invoices',
    resource_id: invoice.id,
    new_data: { file_name: fileName, file_type: fileType },
  })

  revalidatePath('/fakturaer')
  return { success: true, invoiceId: invoice.id }
}

export async function updateInvoiceFile(
  invoiceId: string,
  filePath: string,
  fileName: string,
  fileType: string,
  fileSizeBytes: number,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autoriseret' }

  const { error } = await supabase
    .from('invoices')
    .update({
      file_url: filePath,
      file_name: fileName,
      file_type: fileType,
      file_size_bytes: fileSizeBytes,
    })
    .eq('id', invoiceId)

  if (error) return { error: 'Kunne ikke gemme filinformation' }

  await supabase.from('audit_log').insert({
    organization_id: user.user_metadata?.organization_id ?? '',
    user_id: user.id,
    action: 'upload_invoice_file',
    resource_type: 'invoices',
    resource_id: invoiceId,
    new_data: { file_name: fileName, file_type: fileType },
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  return { success: true }
}

export async function submitForApproval(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet.' }

  // Hent faktura for at matche regler
  const { data: invoice } = await supabase
    .from('invoices')
    .select('amount_incl_vat, department_id')
    .eq('id', invoiceId)
    .single()

  // Find matchende godkendelsesregel (højeste prioritet først)
  let assignedApproverId: string | null = null
  let matchedRuleId: string | null = null
  let matchedRuleName: string | null = null

  if (invoice) {
    const { data: rules } = await supabase
      .from('approval_rules')
      .select('id, name, amount_min, amount_max, approver_user_id, department_id, priority')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (rules) {
      const amount = Number(invoice.amount_incl_vat ?? 0)
      const deptId = invoice.department_id ?? null

      for (const rule of rules) {
        const amountMin = Number(rule.amount_min ?? 0)
        const amountMax = rule.amount_max != null ? Number(rule.amount_max) : null
        const inAmountRange = amount >= amountMin && (amountMax == null || amount <= amountMax)
        const deptMatch = rule.department_id == null || rule.department_id === deptId

        if (inAmountRange && deptMatch) {
          assignedApproverId = rule.approver_user_id ?? null
          matchedRuleId = rule.id
          matchedRuleName = rule.name
          break
        }
      }
    }
  }

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'awaiting_approval',
      assigned_approver_id: assignedApproverId,
      matched_rule_id: matchedRuleId,
      matched_rule_name: matchedRuleName,
    })
    .eq('id', invoiceId)

  if (error) return { error: 'Kunne ikke sende til godkendelse.' }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'submit_for_approval',
    resource_type: 'invoices',
    resource_id: invoiceId,
    new_data: {
      matched_rule: matchedRuleName,
      assigned_approver_id: assignedApproverId,
    },
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  revalidatePath('/fakturaer')
  return { success: true }
}

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Navn er påkrævet'),
  cvr: z.string().regex(/^\d{8}$/).optional().or(z.literal('')),
  email: z.string().email('Ugyldig e-mail').optional().or(z.literal('')),
  address: z.string().optional(),
  phone: z.string().optional(),
  payment_terms: z.coerce.number().int().min(0).optional(),
})

export async function createSupplierAndLink(
  invoiceId: string,
  formData: FormData,
): Promise<{ success?: boolean; supplierId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet.' }

  const raw = {
    name: formData.get('name') as string,
    cvr: (formData.get('cvr') as string) || '',
    email: (formData.get('email') as string) || '',
    address: (formData.get('address') as string) || '',
    phone: (formData.get('phone') as string) || '',
    payment_terms: formData.get('payment_terms') as string,
  }

  const parsed = createSupplierSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { data } = parsed

  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .insert({
      organization_id: orgId,
      name: data.name,
      cvr: data.cvr || null,
      email: data.email || null,
      address: data.address || null,
      phone: data.phone || null,
      payment_terms: data.payment_terms ?? 30,
      status: 'active',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (supplierError || !supplier) return { error: `Kunne ikke oprette leverandør: ${supplierError?.message}` }

  // Tilknyt leverandøren til fakturaen
  const { error: linkError } = await supabase
    .from('invoices')
    .update({ supplier_id: supplier.id })
    .eq('id', invoiceId)

  if (linkError) return { error: 'Leverandør oprettet, men tilknytning fejlede.' }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'create_supplier',
    resource_type: 'suppliers',
    resource_id: supplier.id,
    new_data: { name: data.name, cvr: data.cvr || null, linked_to_invoice: invoiceId },
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  revalidatePath('/leverandoerer')
  return { success: true, supplierId: supplier.id }
}

export async function acceptKontering(
  invoiceId: string,
  accountId: string,
  vatCodeId: string | null,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet.' }

  const { error } = await supabase
    .from('invoices')
    .update({
      account_id: accountId,
      vat_code_id: vatCodeId ?? null,
    })
    .eq('id', invoiceId)

  if (error) return { error: `Kunne ikke gemme kontering: ${error.message}` }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'accept_kontering',
    resource_type: 'invoices',
    resource_id: invoiceId,
    new_data: { account_id: accountId, vat_code_id: vatCodeId },
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  return { success: true }
}

const updateInvoiceSchema = z.object({
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional(),
  amount_excl_vat: z.coerce.number().min(0).optional().nullable(),
  vat_amount: z.coerce.number().min(0).optional().nullable(),
  amount_incl_vat: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().default('DKK'),
  account_id: z.string().uuid().optional().nullable().or(z.literal('')),
  vat_code_id: z.string().uuid().optional().nullable().or(z.literal('')),
  department_id: z.string().uuid().optional().nullable().or(z.literal('')),
  project_id: z.string().uuid().optional().nullable().or(z.literal('')),
  notes: z.string().optional(),
})

export async function updateInvoiceDetails(
  invoiceId: string,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet.' }

  const raw = {
    invoice_number: formData.get('invoice_number') as string,
    invoice_date: formData.get('invoice_date') as string,
    due_date: formData.get('due_date') as string,
    amount_excl_vat: (formData.get('amount_excl_vat') as string) || null,
    vat_amount: (formData.get('vat_amount') as string) || null,
    amount_incl_vat: (formData.get('amount_incl_vat') as string) || null,
    currency: (formData.get('currency') as string) || 'DKK',
    account_id: (formData.get('account_id') as string) || null,
    vat_code_id: (formData.get('vat_code_id') as string) || null,
    department_id: (formData.get('department_id') as string) || null,
    project_id: (formData.get('project_id') as string) || null,
    notes: formData.get('notes') as string,
  }

  const parsed = updateInvoiceSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const d = parsed.data

  const { error } = await supabase
    .from('invoices')
    .update({
      invoice_number: d.invoice_number || null,
      invoice_date: d.invoice_date || null,
      due_date: d.due_date || null,
      amount_excl_vat: d.amount_excl_vat ?? null,
      vat_amount: d.vat_amount ?? null,
      amount_incl_vat: d.amount_incl_vat ?? null,
      currency: d.currency,
      account_id: d.account_id || null,
      vat_code_id: d.vat_code_id || null,
      department_id: d.department_id || null,
      project_id: d.project_id || null,
      notes: d.notes || null,
    })
    .eq('id', invoiceId)

  if (error) return { error: `Kunne ikke gemme: ${error.message}` }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'update_invoice',
    resource_type: 'invoices',
    resource_id: invoiceId,
    new_data: { invoice_number: d.invoice_number, amount_incl_vat: d.amount_incl_vat },
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  return { success: true }
}

export async function registerPayment(
  invoiceId: string,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet.' }

  const amount      = parseFloat(formData.get('amount') as string)
  const paymentDate = formData.get('payment_date') as string
  const method      = (formData.get('payment_method') as string) || null
  const reference   = (formData.get('reference') as string) || null
  const notes       = (formData.get('notes') as string) || null

  if (!amount || isNaN(amount)) return { error: 'Ugyldigt beløb.' }
  if (!paymentDate)             return { error: 'Betalingsdato er påkrævet.' }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('status, currency, amount_incl_vat')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return { error: 'Faktura ikke fundet.' }
  if (invoice.status !== 'approved') return { error: 'Fakturaen skal godkendes først.' }

  const { error: payError } = await supabase.from('payments').insert({
    organization_id: orgId,
    invoice_id:      invoiceId,
    payment_date:    paymentDate,
    amount,
    currency:        invoice.currency ?? 'DKK',
    payment_method:  method,
    reference,
    notes,
    status:          'completed',
    created_by:      user.id,
  })

  if (payError) return { error: `Kunne ikke registrere betaling: ${payError.message}` }

  await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'register_payment',
    resource_type: 'invoices',
    resource_id: invoiceId,
    new_data: { amount, payment_date: paymentDate, reference },
  })

  revalidatePath(`/fakturaer/${invoiceId}`)
  revalidatePath('/fakturaer')
  revalidatePath('/betalinger')
  return { success: true }
}

const DELETABLE_STATUSES = ['pending', 'rejected', 'cancelled']

export async function deleteInvoice(invoiceId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation' }

  // Hent faktura og tjek status + ejerskab
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, file_url')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return { error: 'Faktura ikke fundet' }
  if (!DELETABLE_STATUSES.includes(invoice.status)) {
    return { error: 'Kun fakturaer med status afventer, afvist eller annulleret kan slettes' }
  }

  // Slet fil fra storage hvis den findes
  if (invoice.file_url) {
    await supabase.storage.from('invoices').remove([invoice.file_url])
  }

  // Slet linjelinier
  await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId)

  // Slet faktura
  const { error: delError } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (delError) return { error: `Kunne ikke slette faktura: ${delError.message}` }

  await supabase.from('audit_log').insert({
    organization_id: orgId,
    user_id: user.id,
    action: 'delete_invoice',
    resource_type: 'invoices',
    resource_id: invoiceId,
  })

  revalidatePath('/fakturaer')
  return { success: true }
}
