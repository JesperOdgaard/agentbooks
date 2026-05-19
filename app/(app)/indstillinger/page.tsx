import { createClient } from '@/lib/supabase/server'
import { SettingsTabs } from './settings-tabs'
import { ErpIntegrations } from './erp-integrations'
import { KontoplanSection } from './kontoplan-section'
import { LeverandoerSyncSection } from './leverandoer-sync-section'
import { ValutaSection } from './valuta-section'
import type { OrgCurrency } from './valuta-section'

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

const VALID_TABS = [
  'virksomhed','regnskab','momssatser','faktura',
  'brugere','abonnement','adgangsnoegler','betas',
]

export default async function IndstillingerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const activeTab = VALID_TABS.includes(tabParam ?? '') ? (tabParam ?? 'virksomhed') : 'virksomhed'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user?.id ?? '')
    .maybeSingle()

  const isAdmin = member?.role === 'admin'
  const orgId = member?.organization_id ?? null

  const { data: org } = orgId
    ? await supabase.from('organizations').select('*').eq('id', orgId).single()
    : { data: null }

  const plan = (org as Record<string, unknown> | null)?.plan as string ?? 'starter'

  // Integrationer
  const { data: integrations } = orgId
    ? await supabase.from('integrations').select('type, is_active, last_sync_at').eq('organization_id', orgId)
    : { data: [] }
  const hasEconomicIntegration = (integrations ?? []).some((i) => i.type === 'economic' && i.is_active)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Indstillinger</h1>
        <p className="text-gray-500 text-sm mt-1">Administrer din virksomhed, valuta, integrationer og mere</p>
      </div>

      <SettingsTabs activeTab={activeTab} />

      {/* ── VIRKSOMHED ── */}
      {activeTab === 'virksomhed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Virksomhedsoplysninger</h2>
            {!org ? (
              <p className="text-sm text-gray-500">Ingen data fundet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Navn',         value: (org as Record<string,unknown>).name as string },
                  { label: 'CVR',          value: (org as Record<string,unknown>).cvr as string | null },
                  { label: 'E-mail',       value: (org as Record<string,unknown>).email as string | null },
                  { label: 'Telefon',      value: (org as Record<string,unknown>).phone as string | null },
                  { label: 'Adresse',      value: (org as Record<string,unknown>).address as string | null },
                  { label: 'By',           value: [(org as Record<string,unknown>).postal_code, (org as Record<string,unknown>).city].filter(Boolean).join(' ') || null },
                  { label: 'Land',         value: (org as Record<string,unknown>).country as string | null },
                  { label: 'Basisvaluta',  value: (org as Record<string,unknown>).base_currency as string | null },
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label}>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{row.label}</p>
                    <p className="text-sm text-gray-900">{row.value}</p>
                  </div>
                ))}
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

      {/* ── REGNSKAB ── */}
      {activeTab === 'regnskab' && (
        <RegnskabTab orgId={orgId} isAdmin={isAdmin} hasEconomicIntegration={hasEconomicIntegration} supabase={supabase} />
      )}

      {/* ── MOMSSATSER ── */}
      {activeTab === 'momssatser' && (
        <MomssatserTab orgId={orgId} supabase={supabase} />
      )}

      {/* ── FAKTURA ── */}
      {activeTab === 'faktura' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Faktura-indstillinger</h2>
          <p className="text-sm text-gray-400">Faktura-skabeloner og nummerering kommer snart.</p>
        </div>
      )}

      {/* ── BRUGERE ── */}
      {activeTab === 'brugere' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Brugerstyring</h2>
          <p className="text-sm text-gray-500 mb-3">Administrer brugere og invitationer fra brugersiden.</p>
          <a href="/brugere" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            Gå til Brugere →
          </a>
        </div>
      )}

      {/* ── ABONNEMENT ── */}
      {activeTab === 'abonnement' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Abonnement</h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${planColor[plan] ?? 'bg-gray-100 text-gray-600'}`}>
              {planLabel[plan] ?? plan}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { plan: 'starter',      price: '0 kr/md',    invoices: 'Op til 50/md', users: '1 bruger',   ai: false, erp: false },
              { plan: 'professional', price: '299 kr/md',  invoices: 'Ubegrænset',   users: 'Op til 5',   ai: true,  erp: true  },
              { plan: 'enterprise',   price: 'Kontakt os', invoices: 'Ubegrænset',   users: 'Ubegrænset', ai: true,  erp: true  },
            ].map((p) => (
              <div key={p.plan} className={`rounded-xl border p-4 ${plan === p.plan ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'}`}>
                <p className="text-sm font-bold text-gray-900 capitalize">{planLabel[p.plan]}</p>
                <p className="text-lg font-bold text-gray-800 mt-1">{p.price}</p>
                <ul className="text-xs text-gray-500 mt-3 space-y-1">
                  <li>{p.invoices}</li>
                  <li>{p.users}</li>
                  <li>{p.ai ? 'AI-scanning' : 'Ingen AI'}</li>
                  <li>{p.erp ? 'ERP-integration' : 'Ingen ERP'}</li>
                </ul>
                {plan === p.plan && <p className="text-xs font-semibold text-emerald-600 mt-3">Aktiv plan</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADGANGSNØGLER (Integrationer) ── */}
      {activeTab === 'adgangsnoegler' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">ERP-integrationer</h2>
              <p className="text-xs text-gray-400 mt-1">Kræver Professional- eller Enterprise-abonnement</p>
            </div>
            <ErpIntegrations integrations={integrations ?? []} isAdmin={isAdmin} />
          </div>
        </div>
      )}

      {/* ── BETAS ── */}
      {activeTab === 'betas' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Beta-funktioner</h2>
          <p className="text-sm text-gray-400">Ingen aktive beta-funktioner på nuværende tidspunkt.</p>
        </div>
      )}
    </div>
  )
}

// ── Server-sub-komponenter ─────────────────────────────────────────────────────

async function RegnskabTab({
  orgId, isAdmin, hasEconomicIntegration, supabase,
}: {
  orgId: string | null
  isAdmin: boolean
  hasEconomicIntegration: boolean
  supabase: Awaited<ReturnType<typeof createClient>>
}) {
  const [
    { data: accountsRaw },
    { data: currenciesRaw },
    { count: supplierCount },
  ] = await Promise.all([
    orgId
      ? supabase.from('accounts').select('id,code,name,type,is_active').eq('organization_id', orgId).order('code')
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase.from('organization_currencies').select('id,currency_code,rate_to_dkk,is_active,updated_at').eq('organization_id', orgId).order('currency_code')
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
      : Promise.resolve({ count: 0 }),
  ])

  const currencies: OrgCurrency[] = (currenciesRaw ?? []).map((c) => ({
    id: c.id,
    currency_code: c.currency_code,
    rate_to_dkk: Number(c.rate_to_dkk),
    is_active: c.is_active,
    updated_at: c.updated_at,
  }))

  return (
    <div className="space-y-6">
      <ValutaSection currencies={currencies} isAdmin={isAdmin} />
      <LeverandoerSyncSection
        hasEconomicIntegration={hasEconomicIntegration}
        isAdmin={isAdmin}
        supplierCount={supplierCount ?? 0}
      />
      <KontoplanSection
        accounts={accountsRaw ?? []}
        hasEconomicIntegration={hasEconomicIntegration}
        isAdmin={isAdmin}
      />
    </div>
  )
}

async function MomssatserTab({
  orgId, supabase,
}: {
  orgId: string | null
  supabase: Awaited<ReturnType<typeof createClient>>
}) {
  const { data: vatCodes } = await supabase
    .from('vat_codes')
    .select('id,code,name,rate')
    .order('code')

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Momssatser</h2>
        <p className="text-xs text-gray-400 mt-0.5">{vatCodes?.length ?? 0} momskoder</p>
      </div>
      {!vatCodes || vatCodes.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">Ingen momskoder fundet</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Kode</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Navn</th>
              <th className="px-6 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Sats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vatCodes.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-2.5 font-mono text-xs font-medium text-gray-700">{v.code}</td>
                <td className="px-4 py-2.5 text-sm text-gray-900">{v.name}</td>
                <td className="px-6 py-2.5 text-right">
                  <span className="text-xs font-semibold text-gray-700">{v.rate != null ? `${v.rate}%` : '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
