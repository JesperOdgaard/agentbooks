'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signupAction } from './actions'

function validateCvr(cvr: string): string | null {
  const cleaned = cvr.replace(/\s/g, '')
  if (!/^\d{8}$/.test(cleaned)) return 'CVR-nummer skal være præcis 8 cifre'
  return null
}

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [cvr, setCvr] = useState('')
  const [cvrError, setCvrError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function handleCvrChange(value: string) {
    const filtered = value.replace(/[^\d]/g, '').slice(0, 8)
    setCvr(filtered)
    setCvrError(filtered.length > 0 ? validateCvr(filtered) : null)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cvrValidation = validateCvr(cvr)
    if (cvrValidation) { setCvrError(cvrValidation); return }

    setLoading(true)

    // Server Action opretter bruger + org med admin-klient (bypasser RLS)
    const result = await signupAction({ fullName, email, password, orgName, cvr })

    if (!result.success) {
      setError(result.message)
      setLoading(false)
      return
    }

    // Log brugeren ind automatisk
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError('Konto oprettet — gå til login.')
      setLoading(false)
      router.push('/login')
      return
    }

    // Fuld reload for at sikre session-cookies er klar på serveren
    window.location.href = '/dashboard'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Opret virksomhed</h1>
      <p className="text-gray-500 text-sm mb-6">
        Har du allerede en konto?{' '}
        <Link href="/login" className="text-emerald-600 hover:underline font-medium">
          Log ind
        </Link>
      </p>

      <form onSubmit={handleSignup} className="space-y-4">
        {/* Virksomhed */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Virksomhed</p>
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
              Virksomhedsnavn
            </label>
            <input
              id="orgName" type="text" value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              placeholder="Acme ApS"
            />
          </div>
          <div>
            <label htmlFor="cvr" className="block text-sm font-medium text-gray-700 mb-1">
              CVR-nummer
            </label>
            <input
              id="cvr" type="text" inputMode="numeric"
              value={cvr} onChange={(e) => handleCvrChange(e.target.value)}
              required maxLength={8}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white ${cvrError ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="12345678"
            />
            {cvrError && <p className="text-red-500 text-xs mt-1">{cvrError}</p>}
          </div>
        </div>

        {/* Bruger */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Din konto</p>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Fulde navn
            </label>
            <input
              id="fullName" type="text" value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Jens Jensen"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="din@email.dk"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Adgangskode
            </label>
            <input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required minLength={8} autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Min. 8 tegn"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !!cvrError}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Opretter virksomhed...' : 'Opret virksomhed gratis'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Ekstra brugere inviteres af administrator — de kan ikke tilmelde sig selv.
        </p>
      </form>
    </div>
  )
}
