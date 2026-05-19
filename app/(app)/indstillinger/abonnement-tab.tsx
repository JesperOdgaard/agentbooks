import { Check, X, Zap, Building2, Mail } from 'lucide-react'

interface Props {
  plan: string
  isAdmin: boolean
}

const planOrder = ['starter', 'professional', 'enterprise']

const features: { label: string; starter: boolean | string; professional: boolean | string; enterprise: boolean | string }[] = [
  { label: 'Fakturaer per måned',  starter: 'Op til 50',  professional: 'Ubegrænset',  enterprise: 'Ubegrænset'  },
  { label: 'Brugere',              starter: '1 bruger',   professional: 'Op til 5',    enterprise: 'Ubegrænset'  },
  { label: 'AI-scanning',          starter: false,        professional: true,           enterprise: true          },
  { label: 'ERP-integration',      starter: false,        professional: true,           enterprise: true          },
  { label: 'Leverandoerstyring',   starter: true,         professional: true,           enterprise: true          },
  { label: 'Indkoebsordrer',       starter: true,         professional: true,           enterprise: true          },
  { label: 'Rejseafregning',       starter: true,         professional: true,           enterprise: true          },
  { label: 'Godkendelsesregler',   starter: false,        professional: true,           enterprise: true          },
  { label: 'Revisionslog',         starter: false,        professional: true,           enterprise: true          },
  { label: 'Dedikeret support',    starter: false,        professional: false,          enterprise: true          },
  { label: 'SLA-garanti',          starter: false,        professional: false,          enterprise: true          },
]

const plans = [
  {
    key: 'starter',
    label: 'Starter',
    price: '0 kr',
    period: '/md',
    desc: 'Til enkeltpersoner og mikrovirksomheder',
    ringColor: 'border-gray-200',
    badge: null as string | null,
  },
  {
    key: 'professional',
    label: 'Professional',
    price: '299 kr',
    period: '/md',
    desc: 'Til voksende virksomheder med team',
    ringColor: 'border-emerald-400',
    badge: 'Mest populaer' as string | null,
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 'Kontakt os',
    period: '',
    desc: 'Til stoerre organisationer med saerlige behov',
    ringColor: 'border-purple-300',
    badge: null as string | null,
  },
]

function FeatureVal({ val }: { val: boolean | string }) {
  if (val === true)  return <Check size={14} className="text-emerald-500 mx-auto" />
  if (val === false) return <X size={14} className="text-gray-300 mx-auto" />
  return <span className="text-xs text-gray-600">{val}</span>
}

export function AbonnementTab({ plan, isAdmin }: Props) {
  const currentIdx  = planOrder.indexOf(plan)
  const currentName = ['Starter', 'Professional', 'Enterprise'][currentIdx] ?? plan

  return (
    <div className="space-y-6">

      {/* ── Aktiv plan banner ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Zap size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Aktiv plan</p>
            <p className="text-sm font-semibold text-gray-900">{currentName}</p>
          </div>
        </div>
        {plan !== 'enterprise' && isAdmin && (
          <a
            href="mailto:salg@agentbooks.dk?subject=Opgradering af abonnement"
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Mail size={14} />
            Kontakt os for opgradering
          </a>
        )}
      </div>

      {/* ── Plan-kort ── */}
      <div className="grid grid-cols-3 gap-4">
        {plans.map((p, idx) => {
          const isCurrent = p.key === plan
          const isUpgrade  = idx > currentIdx
          const isDowngrade = idx < currentIdx
          return (
            <div
              key={p.key}
              className={`relative rounded-xl border-2 p-5 flex flex-col gap-4 ${
                isCurrent
                  ? p.ringColor + " bg-emerald-50/40"
                  : "border-gray-200 bg-white"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-emerald-500 text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                  {p.badge}
                </span>
              )}

              <div>
                <p className="text-sm font-bold text-gray-900">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                <div className="flex items-baseline gap-0.5 mt-3">
                  <span className="text-2xl font-bold text-gray-900">{p.price}</span>
                  {p.period && <span className="text-sm text-gray-400">{p.period}</span>}
                </div>
              </div>

              {isCurrent ? (
                <span className="text-center text-xs font-semibold text-emerald-600 bg-emerald-100 rounded-lg py-2">
                  Aktiv plan ✓
                </span>
              ) : isUpgrade && isAdmin ? (
                <a
                  href={`mailto:salg@agentbooks.dk?subject=Opgradering til ${p.label}`}
                  className={`text-center text-xs font-semibold rounded-lg py-2 transition-colors ${
                    p.key === "enterprise"
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {p.key === "enterprise" ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Building2 size={13} />
                      Kontakt salg
                    </span>
                  ) : (
                    "Opgrader →"
                  )}
                </a>
              ) : isDowngrade ? (
                <span className="text-center text-xs text-gray-300 bg-gray-50 rounded-lg py-2">
                  Nedgrader
                </span>
              ) : (
                <span className="text-center text-xs text-gray-300 bg-gray-50 rounded-lg py-2">
                  —
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Funktionssammenligning ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Funktionssammenligning</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Funktion</th>
              {plans.map((p) => (
                <th
                  key={p.key}
                  className={`px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${
                    p.key === plan ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {features.map((f) => (
              <tr key={f.label} className="hover:bg-gray-50/50">
                <td className="px-5 py-2.5 text-sm text-gray-700">{f.label}</td>
                <td className="px-5 py-2.5 text-center"><FeatureVal val={f.starter} /></td>
                <td className="px-5 py-2.5 text-center"><FeatureVal val={f.professional} /></td>
                <td className="px-5 py-2.5 text-center"><FeatureVal val={f.enterprise} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Kontakt-boks ── */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Sporgsmal om dit abonnement?</p>
          <p className="text-xs text-gray-500 mt-0.5">Vores team hjaelper dig med opgradering, fakturering og saerlige aftaler.</p>
        </div>
        <a
          href="mailto:salg@agentbooks.dk"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 whitespace-nowrap"
        >
          <Mail size={13} />
          Skriv til os
        </a>
      </div>

    </div>
  )
}
