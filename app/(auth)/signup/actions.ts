'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const signupSchema = z.object({
  fullName: z.string().min(2, 'Navn skal være mindst 2 tegn'),
  email: z.string().email('Ugyldig e-mail'),
  password: z.string().min(8, 'Adgangskode skal være mindst 8 tegn'),
  orgName: z.string().min(2, 'Virksomhedsnavn skal være mindst 2 tegn'),
  cvr: z.string().regex(/^\d{8}$/, 'CVR-nummer skal være præcis 8 cifre'),
})

export async function signupAction(input: {
  fullName: string
  email: string
  password: string
  orgName: string
  cvr: string
}): Promise<{ success: boolean; message: string }> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message }
  }

  const { fullName, email, password, orgName, cvr } = parsed.data
  const admin = createAdminClient()

  // 1. Tjek om CVR allerede er registreret
  const { data: existingOrg } = await admin
    .from('organizations')
    .select('id')
    .eq('cvr', cvr)
    .maybeSingle()

  if (existingOrg) {
    return {
      success: false,
      message: 'Dette CVR-nummer er allerede registreret. Kontakt din virksomheds administrator for at blive inviteret.',
    }
  }

  // 2. Opret bruger via admin (bypasser email-bekræftelse)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName },
    email_confirm: true, // Marker som bekræftet med det samme
  })

  if (authError || !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return { success: false, message: 'Denne e-mail er allerede registreret.' }
    }
    return { success: false, message: authError?.message ?? 'Kunne ikke oprette bruger.' }
  }

  const userId = authData.user.id

  // 3. Opret organisation
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, cvr })
    .select()
    .single()

  if (orgError || !org) {
    // Slet brugeren igen hvis org-oprettelse fejler
    await admin.auth.admin.deleteUser(userId)
    return { success: false, message: 'Kunne ikke oprette organisation. Prøv igen.' }
  }

  // 4. Tilknyt bruger som admin
  const { error: memberError } = await admin
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: 'admin',
    })

  if (memberError) {
    await admin.from('organizations').delete().eq('id', org.id)
    await admin.auth.admin.deleteUser(userId)
    return { success: false, message: 'Kunne ikke tilknytte administrator-rolle. Prøv igen.' }
  }

  // 5. Gem organization_id i user metadata — hurtig adgang uden DB-query
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: fullName,
      organization_id: org.id,
      role: 'admin',
    },
  })

  // 6. Seed standard dansk kontoplan
  await admin.from('accounts').insert(
    [
      // Omsætning
      { code: '1000', name: 'Varesalg',             type: 'revenue' },
      { code: '1010', name: 'Serviceydelser',        type: 'revenue' },
      { code: '1020', name: 'Andre indtægter',       type: 'revenue' },
      // Vareforbrug
      { code: '3000', name: 'Varekøb',               type: 'expense' },
      // Personaleomkostninger
      { code: '4000', name: 'Lønninger',             type: 'expense' },
      { code: '4010', name: 'Lønsumsafgift',         type: 'expense' },
      { code: '4020', name: 'Pension',               type: 'expense' },
      // Lokaleomkostninger
      { code: '5000', name: 'Husleje',               type: 'expense' },
      { code: '5010', name: 'El, vand og varme',     type: 'expense' },
      { code: '5020', name: 'Forsikringer',          type: 'expense' },
      // Administrationsomkostninger
      { code: '6000', name: 'Kontorartikler',        type: 'expense' },
      { code: '6010', name: 'Porto og fragt',        type: 'expense' },
      { code: '6020', name: 'Telefon og internet',   type: 'expense' },
      { code: '6030', name: 'Markedsføring',         type: 'expense' },
      { code: '6040', name: 'Repræsentation',        type: 'expense' },
      { code: '6050', name: 'Rejse og transport',    type: 'expense' },
      { code: '6060', name: 'IT og software',        type: 'expense' },
      { code: '6070', name: 'Revisor og advokat',    type: 'expense' },
      { code: '6080', name: 'Bankgebyrer',           type: 'expense' },
      { code: '6090', name: 'Diverse driftsomk.',    type: 'expense' },
      { code: '6100', name: 'Afskrivninger',         type: 'expense' },
      // Omsætningsaktiver
      { code: '7000', name: 'Debitorer',             type: 'asset' },
      { code: '7010', name: 'Andre tilgodehavender', type: 'asset' },
      { code: '7020', name: 'Forudbetalte udgifter', type: 'asset' },
      { code: '8000', name: 'Bank',                  type: 'asset' },
      { code: '8010', name: 'Kasse',                 type: 'asset' },
      // Kortfristet gæld
      { code: '9000', name: 'Kreditorer',            type: 'liability' },
      { code: '9010', name: 'Skyldig moms',          type: 'liability' },
      { code: '9020', name: 'Indgående moms',        type: 'liability' },
      { code: '9030', name: 'A-skat og AM-bidrag',   type: 'liability' },
      { code: '9040', name: 'Skyldige omkostninger', type: 'liability' },
      // Egenkapital
      { code: '9900', name: 'Egenkapital',           type: 'equity' },
    ].map((a) => ({ ...a, organization_id: org.id }))
  )

  return { success: true, message: 'Konto oprettet' }
}
