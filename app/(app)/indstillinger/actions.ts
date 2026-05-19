'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { encryptKey, decryptKey } from '@/lib/crypto'

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

type EconomicAccount = {
  accountNumber: number
  name: string
  accountType: string
}

type EconomicAccountsResponse = {
  collection: EconomicAccount[]
  pagination?: { nextPage?: string }
}

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

async function fetchAllEconomicAccounts(
  appSecret: string,
  agreementGrant: string
): Promise<EconomicAccount[]> {
  const accounts: EconomicAccount[] = []
  let url: string | undefined = 'https://restapi.e-conomic.com/accounts?pageSize=1000'

  while (url) {
    const res = await fetch(url, {
      headers: {
        'X-AppSecretToken': appSecret,
        'X-AgreementGrantToken': agreementGrant,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`e-conomic returnerede fejl ${res.status}`)
    const json = await res.json() as EconomicAccountsResponse
    accounts.push(...json.collection)
    url = json.pagination?.nextPage
  }

  return accounts
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

    const economicAccounts = await fetchAllEconomicAccounts(appSecret, agreementGrant)

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
