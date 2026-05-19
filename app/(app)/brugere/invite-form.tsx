'use client'

import { useState, useTransition } from 'react'
import { inviteUser, cancelInvitation, resendInvitation } from './actions'
import { Copy, Check, RefreshCw } from 'lucide-react'

const roles = [
  { value: 'employee', label: 'Medarbejder' },
  { value: 'accountant', label: 'Bogholder' },
  { value: 'auditor', label: 'Revisor' },
  { value: 'admin', label: 'Administrator' },
]

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  accountant: 'Bogholder',
  employee: 'Medarbejder',
  auditor: 'Revisor',
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  accountant: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
  auditor: 'bg-yellow-100 text-yellow-700',
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  expires_at: string
}

export function InviteUserForm({
  organizationId,
  pendingInvitations,
}: {
  organizationId: string
  pendingInvitations: PendingInvitation[]
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; inviteUrl?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resendResult, setResendResult] = useState<{ id: string; url: string } | null>(null)
  const [resendCopied, setResendCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const res = await inviteUser({ email, role, organizationId })
    setResult(res)
    setLoading(false)

    if (res.success) {
      setEmail('')
      setRole('employee')
    }
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCancel(id: string) {
    setCancellingId(id)
    startTransition(async () => {
      await cancelInvitation(id)
      setCancellingId(null)
      if (resendResult?.id === id) setResendResult(null)
    })
  }

  async function handleResend(id: string) {
    setResendingId(id)
    const res = await resendInvitation(id)
    setResendingId(null)
    if (res.success && res.inviteUrl) {
      setResendResult({ id, url: res.inviteUrl })
    }
  }

  async function handleResendCopy(url: string) {
    await navigator.clipboard.writeText(url)
    setResendCopied(true)
    setTimeout(() => setResendCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Inviteringsformular */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="bruger@email.dk"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {loading ? 'Sender...' : 'Send invitation'}
          </button>
        </div>

        {result && (
          <div
            className={`mt-3 text-sm px-4 py-3 rounded-lg ${
              result.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            <p className="font-medium">{result.message}</p>
            {result.success && result.inviteUrl && (
              <div className="mt-2 flex items-center gap-2">
                <code className="text-xs bg-emerald-100 px-2 py-1 rounded flex-1 break-all">
                  {result.inviteUrl}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(result.inviteUrl!)}
                  className="flex items-center gap-1 text-xs bg-emerald-200 hover:bg-emerald-300 px-2 py-1 rounded transition-colors whitespace-nowrap"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Kopieret' : 'Kopier link'}
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Afventende invitationer */}
      {pendingInvitations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Afventende invitationer ({pendingInvitations.length})
          </p>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="bg-gray-50">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                    <p className="text-xs text-gray-400">
                      Udløber {new Date(inv.expires_at).toLocaleDateString('da-DK')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[inv.role] ?? 'bg-gray-100 text-gray-500'}`}>
                      {roleLabels[inv.role] ?? inv.role}
                    </span>
                    <button
                      onClick={() => handleResend(inv.id)}
                      disabled={resendingId === inv.id}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={resendingId === inv.id ? 'animate-spin' : ''} />
                      {resendingId === inv.id ? 'Fornyer...' : 'Genopsend'}
                    </button>
                    <button
                      onClick={() => handleCancel(inv.id)}
                      disabled={isPending && cancellingId === inv.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Annuller
                    </button>
                  </div>
                </div>
                {/* Vist URL efter genopsend */}
                {resendResult?.id === inv.id && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <code className="text-xs text-emerald-700 flex-1 break-all">{resendResult.url}</code>
                      <button
                        type="button"
                        onClick={() => handleResendCopy(resendResult.url)}
                        className="flex items-center gap-1 text-xs bg-emerald-200 hover:bg-emerald-300 px-2 py-1 rounded transition-colors whitespace-nowrap"
                      >
                        {resendCopied ? <Check size={11} /> : <Copy size={11} />}
                        {resendCopied ? 'Kopieret' : 'Kopier'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
