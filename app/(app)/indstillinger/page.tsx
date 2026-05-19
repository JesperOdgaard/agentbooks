import { createClient } from '@/lib/supabase/server'
import { SettingsTabs } from './settings-tabs'
import { ErpIntegrations } from './erp-integrations'
import { KontoplanSection } from './kontoplan-section'

const planLabel: Record<string, string> = {
  starter:      'Starter',
  professional: 'Professional',
  enterprise:   'Enterprise',
}

const planColor: Record<string, string> = {
  starter:      'bg-gray-100 text-gray-600',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-purple-100 text-purple-700',
}

type Tab = 'generelt' | 'integrationer' | 'finans'

export default async function IndstillingerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const activeTab: Tab =
    tabParam === 'integrationer' ? 'integrationer'
    : tabParam === 'finans'       ? 'finans'
    : 'generelt'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Hent org via organization_members
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user?.id ?? '')
    .maybeSingle()

  const isAdmin = member?.role === 'admin'

  const { data: org } = member?.organization_id
    ? await supabase
        .from('organizations')
        .select('*')
        .eq('id', member.organization_id)
        .single()
    : { data: null }

  // ERP-integrationer
  const { data: integrationsRaw } = member?.organization_id
    ? await supabase
        .from('integrations')
        .select('type, is_active, last_sync_at')
        .eq('organization_id', member.organization_id)
    : { data: [] }

  const integrations = integrationsRaw ?? []
  const hasEconomicIntegration = integrations.some(
    (i) => i.type === 'economic' && i.is_active
  )

  // Kontoplan
  const { data: accountsRaw } = member?.organization_id
    ? await supabase
        .from('accounts')
        .select('id, code, name, type, is_active')
        .eq('organization_id', member.organization_id)
        .order('code', { ascending: true })
    : { data: [] }

  const accounts = accountsRaw ?? []

  const plan = (org as { plan?: string } | null)?.plan
    ?? (org as { subscription_plan?: string } | null)?.subscription_plan
    ?? 'starter'

  return (
    <div className="p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Indstillinger</h1>
        <p className="text-gray-500 text-sm mt-1">Administrer din virksomhed og integrationer</p>
      </div>

      {/* Tab navigation */}
      <SettingsTabs activeTab={activeTab} />

      {/* GENERELT */}
      {activeTab === 'generelt' && (
        <div className="space-y-6">
          {/* Virksomhedsinfo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Virksomhed</h2>
            {!org ? (
              <p className="text-sm text-gray-500">Ingen virksomhedsdata fundet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Navn</p>
                  <p className="text-sm text-gray-900 font-medium">{org.name}</p>
                </div>
                {org.cvr && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">CVR-nummer</p>
                    <p className="text-sm text-gray-900">{org.cvr}</p>
                  </div>
                )}
                {org.email && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">E-mail</p>
                    <p className="text-sm text-gray-900">{org.email}</p>
                  </div>
                )}
                {org.phone && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Telefon</p>
                    <p className="text-sm text-gray-900">{org.phone}</p>
                  </div>
                )}
                {org.address && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Adresse</p>
                    <p className="text-sm text-gray-900">
                      {org.address}
                      {(org.postal_code || org.city)
                        ? `, ${org.postal_code ?? ''} ${org.city ?? ''}`.trim()
                        : ''}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Abonnement</p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${planColor[plan] ?? 'bg-gray-100 text-gray-600'}`}>
                    {planLabel[plan] ?? plan}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INTEGRATIONER */}
      {activeTab === 'integrationer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">ERP-integrationer</h2>
              <p className="text-xs text-gray-400 mt-1">
                Kræver Professional- eller Enterprise-abonnement
              </p>
            </div>
            <ErpIntegrations integrations={integrations} isAdmin={isAdmin} />
          </div>
        </div>
      )}

      {/* FINANS */}
      {activeTab === 'finans' && (
        <div className="space-y-6">
          <KontoplanSection
            accounts={accounts}
            hasEconomicIntegration={hasEconomicIntegration}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  )
}
