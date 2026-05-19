'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  Building2, BarChart2, Percent, FileText,
  Users, CreditCard, KeyRound, FlaskConical,
} from 'lucide-react'

export const TABS = [
  { id: 'virksomhed',     label: 'Virksomhed',    icon: Building2    },
  { id: 'regnskab',       label: 'Regnskab',       icon: BarChart2    },
  { id: 'momssatser',     label: 'Momssatser',     icon: Percent      },
  { id: 'faktura',        label: 'Faktura',        icon: FileText     },
  { id: 'brugere',        label: 'Brugere',        icon: Users        },
  { id: 'abonnement',     label: 'Abonnement',     icon: CreditCard   },
  { id: 'adgangsnoegler', label: 'Adgangsnøgler',  icon: KeyRound     },
  { id: 'betas',          label: 'Betas',          icon: FlaskConical },
]

interface SettingsTabsProps {
  activeTab: string
}

export function SettingsTabs({ activeTab }: SettingsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="border-b border-gray-200 mb-6 overflow-x-auto">
      <nav className="-mb-px flex gap-0.5 min-w-max">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`${pathname}?tab=${tab.id}`)}
              className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
