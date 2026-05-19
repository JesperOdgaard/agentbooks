'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Building2, Plug, BookOpen } from 'lucide-react'

const TABS = [
  { id: 'generelt',      label: 'Generelt',      icon: Building2 },
  { id: 'integrationer', label: 'Integrationer', icon: Plug },
  { id: 'finans',        label: 'Finans',         icon: BookOpen },
]

interface SettingsTabsProps {
  activeTab: string
}

export function SettingsTabs({ activeTab }: SettingsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`${pathname}?tab=${tab.id}`)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
