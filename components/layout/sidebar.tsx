'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  ShoppingCart,
  CreditCard,
  Receipt,
  Settings,
  UserCog,
  LogOut,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { GlobalSearch } from './global-search'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fakturaer', label: 'Fakturaer', icon: FileText },
  { href: '/leverandoerer', label: 'Leverandører', icon: Users },
  { href: '/indkoebsordrer', label: 'Indkøbsordrer', icon: ShoppingCart },
  { href: '/betalinger', label: 'Betalinger', icon: CreditCard },
  { href: '/rejseafregning', label: 'Rejseafregning', icon: Receipt },
]

const bottomNavItems = [
  { href: '/indstillinger', label: 'Indstillinger', icon: Settings },
  { href: '/brugere', label: 'Brugere', icon: UserCog },
]

interface SidebarProps {
  orgName: string
  userFullName: string | null
  userEmail: string
}

export function Sidebar({ orgName, userFullName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: '#0F1629' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative" style={{ backgroundColor: '#1B2966' }}>
          <span className="text-white font-bold text-sm leading-none">A</span>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F5A623' }} />
        </div>
        <div className="overflow-hidden">
          <p className="text-white font-semibold text-sm truncate">{orgName}</p>
          <p className="text-white/40 text-xs">Alvio.AI</p>
        </div>
      </div>

      {/* Global søgning */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white/70 text-xs"
        >
          <Search size={13} />
          <span className="flex-1 text-left">Søg…</span>
          <kbd className="text-[10px] border border-white/20 rounded px-1">⌘K</kbd>
        </button>
      </div>
      <GlobalSearch />

      {/* Hoved-navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? 'text-white' : 'text-white/55 hover:text-white hover:bg-white/8'
              }`}
              style={active ? { backgroundColor: 'rgba(255,255,255,0.10)' } : undefined}
            >
              {active
                ? <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#F5A623' }} />
                : <span className="w-1 flex-shrink-0" />
              }
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bund-navigation */}
      <div className="px-3 pb-2 space-y-0.5 border-t border-white/10 pt-2">
        {bottomNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? 'text-white' : 'text-white/55 hover:text-white hover:bg-white/8'
              }`}
              style={active ? { backgroundColor: 'rgba(255,255,255,0.10)' } : undefined}
            >
              {active
                ? <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#F5A623' }} />
                : <span className="w-1 flex-shrink-0" />
              }
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Bruger-sektion */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(27,41,102,0.3)' }}>
            <span className="text-xs font-semibold" style={{ color: '#7A91C8' }}>
              {(userFullName ?? userEmail).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-white text-xs font-medium truncate">
              {userFullName ?? 'Bruger'}
            </p>
            <p className="text-white/40 text-xs truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} />
          Log ud
        </button>
      </div>
    </aside>
  )
}
