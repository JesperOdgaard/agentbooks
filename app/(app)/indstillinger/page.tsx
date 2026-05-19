import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, Plug, CreditCard, User, Bell, CheckSquare } from 'lucide-react'
import { OrgSettingsForm } from './org-settings-form'
import { ProfileForm } from './profile-form'
import { ApprovalRules } from './approval-rules'
import { ErpIntegrations } from './erp-integrations'

const planLabel: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const planColor: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const planFeatures: Record<string, string[]> = {
  starter: ['Max 50 fakturaer/måned', '1 bruger', 'Ingen AI-scanning', 'Ingen ERP-integration'],
  professional: ['Ubegrænsede fakturaer', 'Op til 5 brugere', 'AI-fakturascanning', 'Billy + e-conomic'],
  enterprise: ['Ubegrænsede fakturaer', 'Ubegrænsede brugere', 'AI-fakturascanning', 'Alle ERP-integrationer'],
}

export default async function IndstillingerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Hent org via organization_members (ikke user_metadata — mere robust)
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  const orgId = member?.organization_id
  const isAdmin = member?.role === 'admin'

  const { data: org } = orgId
    ? await supabase
        .from('organizations')
        .select('id, name, cvr, email, phone, address, postal_code, city, country, base_currency, fiscal_year_start, plan, invoice_count_month')
        .eq('id', orgId)
        .single()
    : { data: null }

  // Hent brugerens profil (navn + e-mail)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const plan = org?.plan ?? 'starter'
  const invoiceCountMonth = org?.invoice_count_month ?? 0

  // Hent ERP-integrationer
  const { data: erpIntegrations } = orgId
    ? await supabase
        .from('integrations')
        .select('type, is_active, last_sync_at')
        .eq('organization_id', orgId)
    : { data: [] }

  // Hent godkendelsesregler
  const { data: approvalRules } = orgId
    ? await supabase
        .from('approval_rules')
        .select('id, name, amount_min, amount_max, approver_user_id, department_id, priority, is_active')
        .eq('organization_id', orgId)
        .order('priority', { ascending: false })
    : { data: [] }

  // Hent org-membres til godkender-dropdown
  const { data: membersRaw } = orgId
    ? await supabase
        .from('organization_members')
        .select('user_id, role, profiles(full_name)')
        .eq('organization_id', orgId)
    : { data: [] }

  // Hent bruger-emails fra auth (brug profiles + invitation_email fallback)
  const { data: profiles } = orgId
    ? await supabase
        .from('profiles')
        .select('id, full_name')
    : { data: [] }

  const members = (membersRaw ?? []).map((m) => {
    const p = (profiles ?? []).find((x) => x.id === m.user_id)
    return {
      user_id: m.user_id,
      full_name: p?.full_name ?? null,
      email: null as string | null,
      role: m.role,
    }
  })

  // Hent afdelinger
  const { data: departments } = orgId
    ? await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name')
    : { data: [] }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Indstillinger</h1>
        <p className="text-gray-500 text-sm mt-1">Administrér din virksomhed og integrationer</p>
      </div>

      <div className="space-y-6">
        {/* Min profil */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <User size={16} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Min profil</h2>
              <p className="text-xs text-gray-400">Opdatér dit navn og adgangskode</p>
            </div>
          </div>
          <ProfileForm
            fullName={profile?.full_name ?? null}
            email={user.email ?? ''}
          />
        </div>

        {/* Virksomhedsoplysninger */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Virksomhedsoplysninger</h2>
              <p className="text-xs text-gray-400">Bruges på fakturaer og i kommunikation</p>
            </div>
          </div>

          {org ? (
            <OrgSettingsForm
              org={{
                name: org.name,
                cvr: org.cvr ?? null,
                email: org.email ?? null,
                phone: org.phone ?? null,
                address: org.address ?? null,
                postal_code: org.postal_code ?? null,
                city: org.city ?? null,
                country: org.country ?? 'DK',
                base_currency: org.base_currency ?? 'DKK',
                fiscal_year_start: org.fiscal_year_start ?? '01-01',
              }}
              isAdmin={isAdmin}
            />
          ) : (
            <p className="text-sm text-gray-400">Kunne ikke hente virksomhedsdata.</p>
          )}
        </div>

        {/* Abonnement */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
              <CreditCard size={16} className="text-yellow-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Abonnement</h2>
              <p className="text-xs text-gray-400">Din nuværende plan og forbrug</p>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    planColor[plan] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {planLabel[plan] ?? plan}
                </span>
              </div>
              <ul className="space-y-1 mt-3">
                {(planFeatures[plan] ?? []).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500 font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {plan === 'starter' && (
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Fakturaer denne måned</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceCountMonth}<span className="text-sm text-gray-400 font-normal"> / 50</span></p>
                <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-2">
                  <div
                    className={`h-1.5 rounded-full ${invoiceCountMonth >= 45 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (invoiceCountMonth / 50) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {plan === 'starter' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">
                Opgradér til Professional for ubegrænsede fakturaer og AI-scanning.
              </p>
              <button
                disabled
                className="text-sm font-medium px-4 py-2 bg-blue-500 text-white rounded-lg opacity-50 cursor-not-allowed"
              >
                Opgradér plan (kommer snart)
              </button>
            </div>
          )}
        </div>

        {/* Notifikationer */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Bell size={16} className="text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Notifikationer</h2>
              <p className="text-xs text-gray-400">E-mails systemet sender automatisk</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Ny faktura til godkendelse', desc: 'Sendes til administratorer og bogholders når en faktura sendes til godkendelse' },
              { label: 'Faktura godkendt / afvist', desc: 'Sendes til den der uploadede fakturaen' },
              { label: 'Faktura forfalder snart', desc: 'Påmindelse 3 dage før forfaldsdato for ubetalte fakturaer' },
              { label: 'Ny brugerinvitation', desc: 'Invitationslink sendes når en admin inviterer en ny bruger' },
              { label: 'Rejseafregning til godkendelse', desc: 'Sendes til administratorer når en medarbejder indsender afregning' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
            Detaljerede notifikationsindstillinger pr. bruger kommer i en fremtidig opdatering.
          </p>
        </div>

        {/* Godkendelsesregler */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <CheckSquare size={16} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Godkendelsesregler</h2>
                <p className="text-xs text-gray-400">Auto-routing af fakturaer til den rette godkender</p>
              </div>
            </div>
            <ApprovalRules
              rules={approvalRules ?? []}
              members={members}
              departments={departments ?? []}
            />
          </div>
        )}

        {/* ERP-integrationer */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Plug size={16} className="text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">ERP-integrationer</h2>
              <p className="text-xs text-gray-400">Kræver Professional- eller Enterprise-abonnement</p>
            </div>
          </div>

          {plan === 'starter' ? (
            <div className="mt-4 bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-500">
              ERP-integrationer er ikke tilgængelige på Starter-planen. Opgradér for at koble til Billy eller e-conomic.
            </div>
          ) : (
            <ErpIntegrations
              integrations={erpIntegrations ?? []}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    </div>
  )
}
