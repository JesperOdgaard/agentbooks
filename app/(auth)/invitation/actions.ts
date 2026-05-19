'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  accountant: 'Bogholder',
  employee: 'Medarbejder',
  auditor: 'Revisor',
}

// Hent invitation-data via token (til server-side rendering)
export async function getInvitationByToken(token: string) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('invitations')
    .select('id, email, role, organization_id, expires_at, accepted_at, organizations(name)')
    .eq('token', token)
    .single()

  if (error || !data) return null
  if (data.accepted_at) return null
  if (new Date(data.expires_at) < new Date()) return null

  const org = data.organizations as { name: string } | null
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    roleLabel: roleLabels[data.role] ?? data.role,
    organization_id: data.organization_id,
    orgName: org?.name ?? 'din virksomhed',
    expires_at: data.expires_at,
  }
}

const signupSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(2, 'Navn skal være mindst 2 tegn'),
  password: z.string().min(8, 'Adgangskode skal være mindst 8 tegn'),
})

// Ny bruger: opret konto + tilslut org + acceptér invitation
export async function signupAndAcceptInvitation(formData: FormData): Promise<{
  success?: boolean
  error?: string
}> {
  const raw = {
    token: formData.get('token') as string,
    fullName: formData.get('fullName') as string,
    password: formData.get('password') as string,
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const { token, fullName, password } = parsed.data

  const admin = createAdminClient()

  // Valider token
  const { data: inv, error: invError } = await admin
    .from('invitations')
    .select('id, email, role, organization_id, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (invError || !inv) return { error: 'Invitation ikke fundet' }
  if (inv.accepted_at) return { error: 'Denne invitation er allerede brugt' }
  if (new Date(inv.expires_at) < new Date()) return { error: 'Invitationen er udløbet' }

  // Tjek om e-mail allerede eksisterer
  const { data: existing } = await admin.auth.admin.listUsers()
  const alreadyExists = existing.users.some(
    (u) => u.email?.toLowerCase() === inv.email.toLowerCase()
  )
  if (alreadyExists) {
    return { error: 'Denne e-mail er allerede registreret. Brug "Jeg har en konto" i stedet.' }
  }

  // Opret bruger via admin (bekræftet e-mail med det samme)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: inv.email,
    password,
    user_metadata: { full_name: fullName },
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Kunne ikke oprette konto' }
  }

  const userId = authData.user.id

  // Tilknyt til organisation via admin (bypasser RLS)
  const { error: memberError } = await admin
    .from('organization_members')
    .insert({
      organization_id: inv.organization_id,
      user_id: userId,
      role: inv.role,
      invited_email: inv.email,
    })

  if (memberError) {
    // Ryd op — slet den nyoprettede bruger
    await admin.auth.admin.deleteUser(userId)
    return { error: 'Kunne ikke tilknytte til organisation' }
  }

  // Markér invitation som accepteret
  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id)

  // Opdater user metadata med org og rolle
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: fullName,
      organization_id: inv.organization_id,
      role: inv.role,
    },
  })

  // Log ind automatisk med den nye konto (sætter session-cookies)
  const supabase = await createClient()
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: inv.email,
    password,
  })

  if (loginError) {
    // Konto er oprettet men login fejlede — send til login-side
    return { error: 'Konto oprettet. Log ind manuelt på login-siden.' }
  }

  return { success: true }
}

const loginSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1, 'Angiv adgangskode'),
})

// Eksisterende bruger: log ind + tilslut org + acceptér invitation
export async function loginAndAcceptInvitation(formData: FormData): Promise<{
  success?: boolean
  error?: string
}> {
  const raw = {
    token: formData.get('token') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const { token, password } = parsed.data

  const admin = createAdminClient()

  // Valider token
  const { data: inv, error: invError } = await admin
    .from('invitations')
    .select('id, email, role, organization_id, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (invError || !inv) return { error: 'Invitation ikke fundet' }
  if (inv.accepted_at) return { error: 'Denne invitation er allerede brugt' }
  if (new Date(inv.expires_at) < new Date()) return { error: 'Invitationen er udløbet' }

  // Log ind (sætter session-cookies via server-klient)
  const supabase = await createClient()
  const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
    email: inv.email,
    password,
  })

  if (loginError || !authData.user) {
    return { error: 'Forkert adgangskode. Prøv igen.' }
  }

  const userId = authData.user.id

  // Tjek om brugeren allerede er medlem
  const { data: existingMember } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', inv.organization_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existingMember) {
    // Tilknyt via admin (bypasser RLS)
    const { error: memberError } = await admin
      .from('organization_members')
      .insert({
        organization_id: inv.organization_id,
        user_id: userId,
        role: inv.role,
        invited_email: inv.email,
      })

    if (memberError) {
      return { error: 'Kunne ikke tilknytte til organisation' }
    }
  }

  // Markér invitation som accepteret
  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id)

  return { success: true }
}
