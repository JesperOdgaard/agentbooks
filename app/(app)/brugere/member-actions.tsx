'use client'

import { useState, useTransition } from 'react'
import { updateMemberRole, removeMember } from './actions'

const roles = [
  { value: 'employee', label: 'Medarbejder' },
  { value: 'accountant', label: 'Bogholder' },
  { value: 'auditor', label: 'Revisor' },
  { value: 'admin', label: 'Administrator' },
]

interface MemberActionsProps {
  memberId: string
  currentRole: string
}

export function MemberActions({ memberId, currentRole }: MemberActionsProps) {
  const [role, setRole] = useState(currentRole)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleRoleChange(newRole: string) {
    if (newRole === role) return
    setError(null)
    setRole(newRole)
    startTransition(async () => {
      const result = await updateMemberRole(memberId, newRole)
      if (result?.error) {
        setError(result.error)
        setRole(currentRole) // tilbagefald
      }
    })
  }

  async function handleRemove() {
    setError(null)
    startTransition(async () => {
      const result = await removeMember(memberId)
      if (result?.error) {
        setError(result.error)
        setConfirmRemove(false)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}

      {confirmRemove ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-red-600 font-medium">Er du sikker?</span>
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? '...' : 'Fjern'}
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="text-xs px-2 py-1 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            Annuller
          </button>
        </div>
      ) : (
        <>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isPending}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white disabled:opacity-50"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setConfirmRemove(true)}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Fjern
          </button>
        </>
      )}
    </div>
  )
}
