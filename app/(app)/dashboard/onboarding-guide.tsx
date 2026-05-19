import Link from 'next/link'
import {
  Upload, Users, Building2, CheckCircle2, ArrowRight, Sparkles,
} from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Building2,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: 'Tilføj din første leverandør',
    desc: 'Opret dine faste leverandører, så de automatisk matches ved fakturaupload.',
    href: '/leverandoerer/ny',
    cta: 'Opret leverandør',
  },
  {
    number: 2,
    icon: Upload,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    title: 'Upload din første faktura',
    desc: 'Træk en PDF eller et billede ind — AI scanner og udfylder felterne automatisk.',
    href: '/fakturaer/ny',
    cta: 'Upload faktura',
  },
  {
    number: 3,
    icon: Users,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-50',
    title: 'Invitér dit team',
    desc: 'Tilføj bogholdere, godkendere og medarbejdere med de rette rettigheder.',
    href: '/brugere',
    cta: 'Invitér brugere',
  },
]

interface OnboardingGuideProps {
  orgName: string
}

export function OnboardingGuide({ orgName }: OnboardingGuideProps) {
  return (
    <div className="mb-8 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-emerald-100 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={15} className="text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Kom i gang</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Velkommen til AgentBooks, {orgName}! 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Følg disse tre trin for at sætte dit fakturaflow op.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-emerald-100">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.number} className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${step.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={17} className={step.iconColor} />
                </div>
                <span className="text-xs font-semibold text-gray-400">Trin {step.number}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">{step.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
              <Link
                href={step.href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors group"
              >
                {step.cta}
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )
        })}
      </div>

      {/* Footer tip */}
      <div className="px-6 py-3 bg-emerald-50/50 border-t border-emerald-100 flex items-center gap-2">
        <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
        <p className="text-xs text-gray-400">
          Kontoplan og momskoder er allerede klar til brug — AI-scanning bruger dem til automatisk kontering.
        </p>
      </div>
    </div>
  )
}
