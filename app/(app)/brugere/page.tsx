import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { InviteUserForm } from './invite-form'
import { MemberActions } from './member-actions'

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  accountant: 'Bogholder',
  employee: 'Medarbejder',
  auditor: 'Revisor',
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  accountant: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
  auditor: 'bg-yellow-100 text-yellow-700',
}

export default async function BrugerePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Hent aktiv organisation + brugerens rolle
  const { data: myMembership } = await supabase
    .from('organization_members')
    .select('id, organization_id, role, organizations(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!myMembership) redirect('/login')

  const orgId = myMembership.organization_id
  const myRole = myMembership.role
  const org = myMembership.organizations as { id: string; name: string } | null
  const isAdmin = myRole === 'admin'

  // Hent alle medlemmer med profil
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, role, user_id, joined_at, invited_email, profiles(full_name, avatar_url)')
    .eq('organization_id', orgId)
    .order('joined_at', { ascending: true })

  // Hent udestående invitationer
  const { data: pendingInvitations } = await supabase
    .from('invitations')
    .select('id, email, role, created_at, expires_at')
    .eq('organization_id', orgId)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Brugere</h1>
        <p className="text-gray-500 text-sm mt-1">
          Administrér adgang til {org?.name ?? 'organisationen'}
        </p>
      </div>

      {/* Inviter ny bruger (kun admin) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Invitér ny bruger</h2>
          <p className="text-sm text-gray-500 mb-4">
            Brugeren modtager et invitationslink der er gyldigt i 7 dage.
          </p>
          <InviteUserForm
            organizationId={orgId}
            pendingInvitations={pendingInvitations ?? []}
          />
        </div>
      )}

      {/* Aktive brugere */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">
            Aktive brugere ({members?.length ?? 0})
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {!members || members.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-gray-400 text-sm">Ingen brugere fundet</p>
            </div>
          ) : (
            members.map((member) => {
              const profile = member.profiles as { full_name: string | null; avatar_url: string | null } | null
              const isMe = member.user_id === user.id
              const displayName = profile?.full_name ?? 'Ukendt bruger'
              const initials = displayName.charAt(0).toUpperCase()
              const email = (member as { invited_email?: string | null }).invited_email

              return (
                <div key={member.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 text-sm font-semibold">{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {displayName}
                        {isMe && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">(dig)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {email && <span className="mr-2">{email}</span>}
                        Tilsluttet {new Date(member.joined_at).toLocaleDateString('da-DK')}
                      </p>
                    </div>
                  </div>

                  {/* Admin ser rolle-dropdown + fjern-knap for alle undtagen sig selv */}
                  {isAdmin && !isMe ? (
                    <MemberActions memberId={member.id} currentRole={member.role} />
                  ) : (
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        roleColors[member.role] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {roleLabels[member.role] ?? member.role}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Rolle-forklaring */}
      <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rollebeskrivelser</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {[
            { role: 'admin', desc: 'Fuld adgang — kan administrere alle funktioner og brugere' },
            { role: 'accountant', desc: 'Fakturaer, betalinger, leverandører og afstemning' },
            { role: 'employee', desc: 'Kan uploade fakturaer og oprette rejseafregninger' },
            { role: 'auditor', desc: 'Læseadgang til alt — ingen skrivning' },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-start gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${roleColors[role]}`}>
                {roleLabels[role]}
              </span>
              <span className="text-xs text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
