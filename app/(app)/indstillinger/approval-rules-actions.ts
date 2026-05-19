'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getOrgAndRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .maybeSingle()
  return { orgId: data?.organization_id ?? null, role: data?.role ?? null }
}

const ruleSchema = z.object({
  name: z.string().min(1, 'Navn er påkrævet'),
  amount_min: z.coerce.number().min(0).default(0),
  amount_max: z.coerce.number().min(0).optional().nullable(),
  approver_user_id: z.string().uuid().optional().nullable().or(z.literal('')),
  department_id: z.string().uuid().optional().nullable().or(z.literal('')),
  priority: z.coerce.number().int().min(0).default(0),
})

export async function createApprovalRule(
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { orgId, role } = await getOrgAndRole(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet' }
  if (role !== 'admin') return { error: 'Kun admins kan administrere regler' }

  const raw = {
    name: formData.get('name') as string,
    amount_min: formData.get('amount_min') as string,
    amount_max: formData.get('amount_max') as string || null,
    approver_user_id: (formData.get('approver_user_id') as string) || null,
    department_id: (formData.get('department_id') as string) || null,
    priority: formData.get('priority') as string,
  }

  const parsed = ruleSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const d = parsed.data

  const { error } = await supabase.from('approval_rules').insert({
    organization_id: orgId,
    name: d.name,
    amount_min: d.amount_min,
    amount_max: d.amount_max ?? null,
    approver_user_id: d.approver_user_id || null,
    department_id: d.department_id || null,
    priority: d.priority,
    is_active: true,
  })

  if (error) return { error: `Kunne ikke oprette regel: ${error.message}` }

  revalidatePath('/indstillinger')
  return { success: true }
}

export async function updateApprovalRule(
  ruleId: string,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { orgId, role } = await getOrgAndRole(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet' }
  if (role !== 'admin') return { error: 'Kun admins kan administrere regler' }

  const raw = {
    name: formData.get('name') as string,
    amount_min: formData.get('amount_min') as string,
    amount_max: formData.get('amount_max') as string || null,
    approver_user_id: (formData.get('approver_user_id') as string) || null,
    department_id: (formData.get('department_id') as string) || null,
    priority: formData.get('priority') as string,
  }

  const parsed = ruleSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const d = parsed.data

  const { error } = await supabase
    .from('approval_rules')
    .update({
      name: d.name,
      amount_min: d.amount_min,
      amount_max: d.amount_max ?? null,
      approver_user_id: d.approver_user_id || null,
      department_id: d.department_id || null,
      priority: d.priority,
    })
    .eq('id', ruleId)
    .eq('organization_id', orgId)

  if (error) return { error: `Kunne ikke opdatere regel: ${error.message}` }

  revalidatePath('/indstillinger')
  return { success: true }
}

export async function toggleApprovalRule(
  ruleId: string,
  isActive: boolean,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { orgId, role } = await getOrgAndRole(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet' }
  if (role !== 'admin') return { error: 'Kun admins kan administrere regler' }

  const { error } = await supabase
    .from('approval_rules')
    .update({ is_active: isActive })
    .eq('id', ruleId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/indstillinger')
  return { success: true }
}

export async function deleteApprovalRule(
  ruleId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  const { orgId, role } = await getOrgAndRole(supabase, user.id)
  if (!orgId) return { error: 'Ingen organisation fundet' }
  if (role !== 'admin') return { error: 'Kun admins kan administrere regler' }

  const { error } = await supabase
    .from('approval_rules')
    .delete()
    .eq('id', ruleId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/indstillinger')
  return { success: true }
}
