'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Ugyldig e-mail'),
  role: z.enum(['admin', 'accountant', 'employee', 'auditor']),
  organizationId: z.string().uuid(),
})

export async function inviteUser(input: {
  email: string
  role: string
  organizationId: string
}): Promise<{ success: boolean; message: string; inviteUrl?: string }> {
  const supabase = await createClient()

  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message }
  }

  const { email, role, organizationId } = parsed.data

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Ikke logget ind.' }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    return { success: false, message: 'Du har ikke tilladelse til at invitere brugere.' }
  }

  const admin = createAdminClient()

  const { data: invitation, error } = await admin
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
    })
    .select('token')
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        message: 'Der er allerede sendt en aktiv invitation til denne e-mail.',
      }
    }
    return { success: false, message: 'Kunne ikke oprette invitation. Prøv igen.' }
  }

  await supabase.from('audit_log').insert({
    organization_id: organizationId,
    user_id: user.id,
    action: 'invite_user',
    resource_type: 'invitations',
    resource_id: invitation.token,
    new_data: { email, role },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invitation?token=${invitation.token}`

  // Send invitations-mail via Supabase Auth
  // Supabase sender e-mailen — brugeren klikker link og lander på vores /invitation side
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteUrl,
  })

  if (mailError) {
    // Mail fejlede — slet invitationen og returner fejl
    // (undtag hvis brugeren allerede eksisterer i auth — så er det OK, vi viser blot linket)
    if (!mailError.message?.toLowerCase().includes('already registered')) {
      await admin.from('invitations').delete().eq('token', invitation.token)
      return { success: false, message: `Invitation oprettet, men e-mail kunne ikke sendes: ${mailError.message}` }
    }
  }

  return {
    success: true,
    message: `Invitationsmail sendt til ${email}.`,
    inviteUrl,
  }
}

export async function updateMemberRole(
  memberId: string,
  newRole: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  // Hent målmedlem
  const { data: targetMember } = await supabase
    .from('organization_members')
    .select('organization_id, user_id, role')
    .eq('id', memberId)
    .single()

  if (!targetMember) return { error: 'Bruger ikke fundet' }

  // Tjek at den aktuelle bruger er admin i samme org
  const { data: myMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', targetMember.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || myMembership.role !== 'admin') {
    return { error: 'Kun administratorer kan ændre roller' }
  }

  if (targetMember.user_id === user.id) {
    return { error: 'Du kan ikke ændre din egen rolle' }
  }

  const validRoles = ['admin', 'accountant', 'employee', 'auditor']
  if (!validRoles.includes(newRole)) {
    return { error: 'Ugyldig rolle' }
  }

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) return { error: 'Kunne ikke opdatere rolle' }

  await supabase.from('audit_log').insert({
    organization_id: targetMember.organization_id,
    user_id: user.id,
    action: 'update_member_role',
    resource_type: 'organization_members',
    resource_id: memberId,
    new_data: { role: newRole },
    old_data: { role: targetMember.role },
  })

  revalidatePath('/brugere')
  return { success: true }
}

export async function removeMember(
  memberId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: targetMember } = await supabase
    .from('organization_members')
    .select('organization_id, user_id, role')
    .eq('id', memberId)
    .single()

  if (!targetMember) return { error: 'Bruger ikke fundet' }

  if (targetMember.user_id === user.id) {
    return { error: 'Du kan ikke fjerne dig selv' }
  }

  const { data: myMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', targetMember.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || myMembership.role !== 'admin') {
    return { error: 'Kun administratorer kan fjerne brugere' }
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: 'Kunne ikke fjerne bruger' }

  await supabase.from('audit_log').insert({
    organization_id: targetMember.organization_id,
    user_id: user.id,
    action: 'remove_member',
    resource_type: 'organization_members',
    resource_id: memberId,
    new_data: { removed: true },
  })

  revalidatePath('/brugere')
  return { success: true }
}

export async function resendInvitation(
  invitationId: string
): Promise<{ success?: boolean; error?: string; inviteUrl?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: inv } = await supabase
    .from('invitations')
    .select('organization_id, token, email')
    .eq('id', invitationId)
    .single()

  if (!inv) return { error: 'Invitation ikke fundet' }

  const { data: myMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', inv.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || myMembership.role !== 'admin') {
    return { error: 'Kun administratorer kan genopsende invitationer' }
  }

  // Forlæng udløbsdato med 7 dage
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('invitations')
    .update({ expires_at: newExpiry })
    .eq('id', invitationId)

  if (error) return { error: 'Kunne ikke forny invitation' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invitation?token=${inv.token}`

  // Send mail igen via Supabase Auth
  const admin = createAdminClient()
  await admin.auth.admin.inviteUserByEmail(inv.email, { redirectTo: inviteUrl })

  revalidatePath('/brugere')
  return { success: true, inviteUrl }
}

export async function cancelInvitation(
  invitationId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { data: inv } = await supabase
    .from('invitations')
    .select('organization_id')
    .eq('id', invitationId)
    .single()

  if (!inv) return { error: 'Invitation ikke fundet' }

  const { data: myMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', inv.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || myMembership.role !== 'admin') {
    return { error: 'Kun administratorer kan annullere invitationer' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('invitations').delete().eq('id', invitationId)

  if (error) return { error: 'Kunne ikke annullere invitation' }

  revalidatePath('/brugere')
  return { success: true }
}
