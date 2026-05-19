'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signupAndAcceptInvitation, loginAndAcceptInvitation } from './actions'

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  accountant: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-700',
  auditor: 'bg-yellow-100 text-yellow-700',
}

interface InvitationData {
  id: string
  email: string
  role: string
  roleLabel: string
  orgName: string
  expires_at: string
}

export function InvitationForm({ invitation, token }: { invitation: InvitationData; token: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('token', token)
    formData.set('password', password)
    if (mode === 'signup') formData.set('fullName', fullName)

    startTransition(async () => {
      const action = mode === 'signup' ? signupAndAcceptInvitation : loginAndAcceptInvitation
      const result = await action(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    })
  }

  const expiresDate = new Date(invitation.expires_at).toLocaleDateString('da-DK')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      {/* Invitation header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Du er inviteret</h1>
            <p className="text-xs text-gray-400">Link udløber {expiresDate}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Virksomhed</span>
            <span className="text-sm font-semibold text-gray-900">{invitation.orgName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Rolle</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[invitation.role] ?? 'bg-gray-100 text-gray-600'}`}>
              {invitation.roleLabel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">E-mail</span>
            <span className="text-sm text-gray-700">{invitation.email}</span>
          </div>
        </div>
      </div>

      {/* Fanevalg */}
      <div className="flex rounded-lg border border-gray-200 mb-5 overflow-hidden">
        <button
          type="button"
          onClick={() => { setMode('login'); setError(null) }}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mode === 'login'
              ? 'bg-emerald-500 text-white'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Jeg har allerede en konto
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setError(null) }}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mode === 'signup'
              ? 'bg-emerald-500 text-white'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Opret ny konto
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fulde navn (kun signup) */}
        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fulde navn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
              placeholder="Jens Jensen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* E-mail (låst — fra invitation) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            value={invitation.email}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Adgangskode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adgangskode <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'signup' ? 8 : 1}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'Min. 8 tegn' : '••••••••'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {mode === 'signup' && (
            <p className="text-xs text-gray-400 mt-1">Mindst 8 tegn</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {isPending
            ? 'Tilslutter...'
            : mode === 'signup'
            ? `Opret konto og tilslut ${invitation.orgName}`
            : `Log ind og tilslut ${invitation.orgName}`}
        </button>
      </form>
    </div>
  )
}
