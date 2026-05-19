'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ProfileForm({
  fullName,
  email,
}: {
  fullName: string | null
  email: string
}) {
  const [name, setName] = useState(fullName ?? '')
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [nameError, setNameError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [pwError, setPwError] = useState<string | null>(null)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setNameError('Navn må ikke være tomt'); return }
    setNameStatus('saving')
    setNameError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNameStatus('error'); setNameError('Ikke logget ind'); return }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id)

    if (error) {
      setNameStatus('error')
      setNameError('Kunne ikke gemme navn')
    } else {
      setNameStatus('saved')
      setTimeout(() => setNameStatus('idle'), 3000)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)

    if (newPassword.length < 8) {
      setPwError('Ny adgangskode skal være mindst 8 tegn')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Adgangskoderne stemmer ikke overens')
      return
    }

    setPwStatus('saving')
    const supabase = createClient()

    // Verificer nuværende adgangskode ved at forsøge et login
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPwStatus('error'); setPwError('Ikke logget ind'); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setPwStatus('error')
      setPwError('Nuværende adgangskode er forkert')
      return
    }

    // Opdatér adgangskode
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwStatus('error')
      setPwError('Kunne ikke ændre adgangskode: ' + error.message)
    } else {
      setPwStatus('saved')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwStatus('idle'), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Navn */}
      <form onSubmit={saveName} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fulde navn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jens Jensen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">E-mail kan ikke ændres her</p>
          </div>
        </div>

        {nameError && (
          <p className="text-sm text-red-600">{nameError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={nameStatus === 'saving'}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {nameStatus === 'saving' ? 'Gemmer...' : 'Gem navn'}
          </button>
          {nameStatus === 'saved' && (
            <span className="text-sm text-emerald-600 font-medium">✓ Gemt</span>
          )}
        </div>
      </form>

      <hr className="border-gray-100" />

      {/* Adgangskode */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Skift adgangskode</h3>
        <form onSubmit={savePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuværende adgangskode</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ny adgangskode</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 tegn"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bekræft ny adgangskode</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Gentag adgangskode"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {pwError && (
            <p className="text-sm text-red-600">{pwError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pwStatus === 'saving'}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {pwStatus === 'saving' ? 'Skifter...' : 'Skift adgangskode'}
            </button>
            {pwStatus === 'saved' && (
              <span className="text-sm text-emerald-600 font-medium">✓ Adgangskode ændret</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
