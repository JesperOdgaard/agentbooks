'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { encryptKey, decryptKey } from '@/lib/crypto'
import { fetchAllAccounts, fetchAllSuppliers } from '@/lib/economic'

// ── Organisation ───────────────────────────────────────────────────────────────

const orgSchema = z.object({
  name: z.string().min(1, 'Virksomhedsnavn er påkrævet'),
  cvr: z.string().optional(),
  email: z.string().email('Ugyldig e-mail').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('DK'),
  base_currency: z.string().default('DKK'),
  fiscal_year_start: z.string().regex(/^\d{2}-\d{2}$/).default('01-01'),
})

export async function updateOrganization(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }
  if (member.role !== 'admin') return { error: 'Kun administratorer kan ændre indstillinger' }

  const raw = {
    name: formData.get('name') as string,
    cvr: formData.get('cvr') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    address: formData.get('address') as string,
    postal_code: formData.get('postal_code') as string,
    city: formData.get('city') as string,
    country: (formData.get('country') as string) || 'DK',
    base_currency: (formData.get('base_currency') as string) || 'DKK',
    fiscal_year_start: (formData.get('fiscal_year_start') as string) || '01-01',
  }

  const parsed = orgSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { data } = parsed

  const { error } = await supabase
    .from('organizations')
    .update({
      name: data.name,
      cvr: data.cvr || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      postal_code: data.postal_code || null,
      city: data.city || null,
      country: data.country,
      base_currency: data.base_currency,
      fiscal_year_start: data.fiscal_year_start,
    })
    .eq('id', member.organization_id)

  if (error) return { error: 'Kunne ikke gemme ændringer' }

  await supabase.from('audit_log').insert({
    organization_id: member.organization_id,
    user_id: user.id,
    action: 'update_organization',
    resource_type: 'organizations',
    resource_id: member.organization_id,
    new_data: { name: data.name },
  })

  revalidatePath('/indstillinger')
  return { success: true }
}

// ── ERP-integrationer ──────────────────────────────────────────────────────────

type IntegrationType = 'billy' | 'economic'

const saveIntegrationSchema = z.object({
  type: z.enum(['billy', 'economic', 'dinero', 'uniconta']),
  api_key: z.string().min(1, 'API-nøgle er påkrævet'),
  api_key_2: z.string().optional(),
})

export async function saveIntegration(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }
  if (member.role !== 'admin') return { error: 'Kun administratorer kan tilslutte integrationer' }

  const raw = {
    type: formData.get('type') as string,
    api_key: (formData.get('api_key') as string)?.trim(),
    api_key_2: (formData.get('api_key_2') as string)?.trim() || undefined,
  }

  const parsed = saveIntegrationSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { data } = parsed

  const { error } = await supabase.from('integrations').upsert(
    {
      organization_id: member.organization_id,
      type: data.type,
      api_key: encryptKey(data.api_key),
      api_key_2: data.api_key_2 ? encryptKey(data.api_key_2) : null,
      is_active: true,
    },
    { onConflict: 'organization_id,type' }
  )

  if (error) return { error: 'Kunne ikke gemme integration: ' + error.message }

  await supabase.from('audit_log').insert({
    organization_id: member.organization_id,
    user_id: user.id,
    action: 'save_integration',
    resource_type: 'integrations',
    resource_id: member.organization_id,
    new_data: { type: data.type, is_active: true },
  })

  revalidatePath('/indstillinger')
  return { success: true }
}

export async function removeIntegration(
  type: IntegrationType
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }
  if (member.role !== 'admin') return { error: 'Kun administratorer kan fjerne integrationer' }

  const { error } = await supabase
    .from('integrations')
    .update({ is_active: false, api_key: null, api_key_2: null })
    .eq('organization_id', member.organization_id)
    .eq('type', type)

  if (error) return { error: 'Kunne ikke fjerne integration' }

  await supabase.from('audit_log').insert({
    organization_id: member.organization_id,
    user_id: user.id,
    action: 'remove_integration',
    resource_type: 'integrations',
    resource_id: member.organization_id,
    new_data: { type, is_active: false },
  })

  revalidatePath('/indstillinger')
  return { success: true }
}

export async function testIntegration(
  type: IntegrationType
): Promise<{ success?: boolean; message?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }

  const { data: integration } = await supabase
    .from('integrations')
    .select('api_key, api_key_2, is_active')
    .eq('organization_id', member.organization_id)
    .eq('type', type)
    .maybeSingle()

  if (!integration?.api_key) return { error: 'Ingen API-nøgle gemt' }

  try {
    const apiKey = decryptKey(integration.api_key)

    if (type === 'billy') {
      const res = await fetch('https://api.billysbilling.com/v2/me', {
        headers: { 'X-Access-Token': apiKey },
      })
      if (!res.ok) return { error: `Billy returnerede fejl ${res.status}` }
      const json = await res.json() as { user?: { name?: string } }
      const name = json?.user?.name ?? 'ukendt'
      await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('organization_id', member.organization_id)
        .eq('type', type)
      revalidatePath('/indstillinger')
      return { success: true, message: `Forbundet som ${name}` }
    }

    if (type === 'economic') {
      const apiKey2 = integration.api_key_2 ? decryptKey(integration.api_key_2) : ''
      if (!apiKey2) return { error: 'Agreement Grant Token mangler' }
      const res = await fetch('https://restapi.e-conomic.com/self', {
        headers: {
          'X-AppSecretToken': apiKey,
          'X-AgreementGrantToken': apiKey2,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) return { error: `e-conomic returnerede fejl ${res.status}` }
      const json = await res.json() as { company?: { name?: string } }
      const name = json?.company?.name ?? 'ukendt'
      await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('organization_id', member.organization_id)
        .eq('type', type)
      revalidatePath('/indstillinger')
      return { success: true, message: `Forbundet til ${name}` }
    }

    return { error: 'Ukendt integrationstype' }
  } catch {
    return { error: 'Netværksfejl — kunne ikke nå API' }
  }
}

// ── Kontoplan sync fra e-conomic ───────────────────────────────────────────────

function mapAccountType(economicType: string): string {
  switch (economicType) {
    case 'profitAndLoss': return 'drifts'
    case 'balance': return 'balance'
    case 'totalFrom':
    case 'totalTo': return 'total'
    case 'heading':
    case 'headingStart':
    case 'headingEnd': return 'heading'
    case 'sumInterval':
    case 'sumIntervalsOnly': return 'sum'
    default: return economicType
  }
}

export async function syncKontoplanFromEconomic(): Promise<{
  success?: boolean
  count?: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }
  if (member.role !== 'admin') return { error: 'Kun administratorer kan synkronisere kontoplan' }

  const { data: integration } = await supabase
    .from('integrations')
    .select('api_key, api_key_2, is_active')
    .eq('organization_id', member.organization_id)
    .eq('type', 'economic')
    .maybeSingle()

  if (!integration?.is_active || !integration.api_key) {
    return { error: 'e-conomic integration er ikke tilsluttet' }
  }

  try {
    const appSecret = decryptKey(integration.api_key)
    const agreementGrant = integration.api_key_2 ? decryptKey(integration.api_key_2) : ''
    if (!agreementGrant) return { error: 'Agreement Grant Token mangler' }

    const economicAccounts = await fetchAllAccounts(appSecret, agreementGrant)

    // Upsert into accounts table (match on code + organization_id)
    const rows = economicAccounts.map((a) => ({
      organization_id: member.organization_id,
      code: String(a.accountNumber),
      name: a.name,
      type: mapAccountType(a.accountType),
      is_active: true,
    }))

    // Delete existing org accounts first, then insert fresh
    await supabase
      .from('accounts')
      .delete()
      .eq('organization_id', member.organization_id)

    const { error } = await supabase.from('accounts').insert(rows)
    if (error) return { error: 'Fejl ved gemning af kontoplan: ' + error.message }

    await supabase.from('audit_log').insert({
      organization_id: member.organization_id,
      user_id: user.id,
      action: 'sync_kontoplan',
      resource_type: 'accounts',
      resource_id: member.organization_id,
      new_data: { source: 'economic', count: rows.length },
    })

    // Update last_sync_at on integration
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('organization_id', member.organization_id)
      .eq('type', 'economic')

    revalidatePath('/indstillinger')
    return { success: true, count: rows.length }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ukendt fejl' }
  }
}

// ── Leverandør sync fra e-conomic ──────────────────────────────────────────────

export async function syncLeverandoererFromEconomic(): Promise<{
  success?: boolean
  created?: number
  updated?: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }
  if (member.role !== 'admin') return { error: 'Kun administratorer kan synkronisere leverandører' }

  const { data: integration } = await supabase
    .from('integrations')
    .select('api_key, api_key_2, is_active')
    .eq('organization_id', member.organization_id)
    .eq('type', 'economic')
    .maybeSingle()

  if (!integration?.is_active || !integration.api_key) {
    return { error: 'e-conomic integration er ikke tilsluttet' }
  }

  try {
    const appSecret = decryptKey(integration.api_key)
    const agreementGrant = integration.api_key_2 ? decryptKey(integration.api_key_2) : ''
    if (!agreementGrant) return { error: 'Agreement Grant Token mangler' }

    const economicSuppliers = await fetchAllSuppliers(appSecret, agreementGrant)

    // Hent eksisterende leverandører for org
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, economic_id, cvr, name')
      .eq('organization_id', member.organization_id)

    const byEconomicId = new Map<number, string>()
    const byCvr = new Map<string, string>()
    const byName = new Map<string, string>()

    for (const s of existing ?? []) {
      if (s.economic_id) byEconomicId.set(s.economic_id, s.id)
      if (s.cvr) byCvr.set(s.cvr, s.id)
      byName.set(s.name.toLowerCase(), s.id)
    }

    let created = 0
    let updated = 0

    for (const es of economicSuppliers) {
      const cvr = es.vatNumber?.replace(/\D/g, '') || null
      const row = {
        name: es.name,
        email: es.email ?? null,
        address: es.address ?? null,
        city: es.city ?? null,
        postal_code: es.zip ?? null,
        country: es.country ?? null,
        phone: es.phone ?? null,
        cvr: cvr && cvr.length === 8 ? cvr : null,
        economic_id: es.supplierNumber,
        bank_account_no: es.bankAccount?.bankAccountNumber ?? null,
        bank_reg_no: es.bankAccount?.bankCode ?? null,
        payment_terms: es.paymentTerms?.paymentTermsNumber ?? null,
        status: 'active' as const,
        updated_at: new Date().toISOString(),
      }

      // Match: economic_id > CVR > navn
      const existingId =
        byEconomicId.get(es.supplierNumber) ??
        (cvr ? byCvr.get(cvr) : undefined) ??
        byName.get(es.name.toLowerCase())

      if (existingId) {
        await supabase.from('suppliers').update(row).eq('id', existingId)
        updated++
      } else {
        await supabase.from('suppliers').insert({
          ...row,
          organization_id: member.organization_id,
          created_by: user.id,
        })
        created++
      }
    }

    await supabase.from('audit_log').insert({
      organization_id: member.organization_id,
      user_id: user.id,
      action: 'sync_leverandoerer',
      resource_type: 'suppliers',
      resource_id: member.organization_id,
      new_data: { source: 'economic', created, updated },
    })

    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('organization_id', member.organization_id)
      .eq('type', 'economic')

    revalidatePath('/leverandoerer')
    revalidatePath('/indstillinger')
    return { success: true, created, updated }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ukendt fejl' }
  }
}

// ── Valutakurser ───────────────────────────────────────────────────────────────

export async function upsertCurrency(
  currencyCode: string,
  rateToDkk: number,
): Promise<{ success?: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }
  if (member.role !== 'admin') return { error: 'Kun administratorer kan ændre valutakurser' }

  const code = currencyCode.trim().toUpperCase()
  if (code.length !== 3) return { error: 'Valutakode skal være 3 bogstaver' }
  if (isNaN(rateToDkk) || rateToDkk <= 0) return { error: 'Ugyldig kurs' }

  const { data, error } = await supabase
    .from('organization_currencies')
    .upsert(
      {
        organization_id: member.organization_id,
        currency_code: code,
        rate_to_dkk: rateToDkk,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,currency_code' },
    )
    .select('id')
    .single()

  if (error) return { error: 'Kunne ikke gemme valutakurs: ' + error.message }

  revalidatePath('/indstillinger')
  return { success: true, id: data?.id }
}

export async function deleteCurrency(
  currencyCode: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Ingen organisation fundet' }
  if (member.role !== 'admin') return { error: 'Kun administratorer kan fjerne valutakurser' }

  const { error } = await supabase
    .from('organization_currencies')
    .delete()
    .eq('organization_id', member.organization_id)
    .eq('currency_code', currencyCode.toUpperCase())

  if (error) return { error: 'Kunne ikke fjerne valuta: ' + error.message }

  revalidatePath('/indstillinger')
  return { success: true }
}
