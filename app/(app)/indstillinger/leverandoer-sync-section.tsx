'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { syncLeverandoererFromEconomic } from './actions'

interface LeverandoerSyncSectionProps {
  hasEconomicIntegration: boolean
  isAdmin: boolean
  supplierCount: number
}

export function LeverandoerSyncSection({
  hasEconomicIntegration,
  isAdmin,
  supplierCount,
}: LeverandoerSyncSectionProps) {
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSync() {
    startTransition(async () => {
      setSyncMsg(null)
      const res = await syncLeverandoererFromEconomic()
      if (res.error) {
        setSyncMsg({ type: 'error', text: res.error })
      } else {
        setSyncMsg({
          type: 'ok',
          text: `Synkroniseret — ${res.created} oprettet, ${res.updated} opdateret`,
        })
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Users size={15} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Leverandører</h2>
            <p className="text-xs text-gray-400 mt-0.5">{supplierCount} leverandører i systemet</p>
          </div>
        </div>

        {hasEconomicIntegration && isAdmin && (
          <button
            onClick={handleSync}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
            {isPending ? 'Synkroniserer…' : 'Synk leverandører fra e-conomic'}
          </button>
        )}
      </div>

      {/* Feedback */}
      {syncMsg && (
        <div className={`px-6 py-3 flex items-center gap-2 text-sm ${syncMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {syncMsg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {syncMsg.text}
        </div>
      )}

      {!hasEconomicIntegration && (
        <div className="px-6 py-3 bg-blue-50 text-xs text-blue-700 flex items-center gap-2">
          <AlertCircle size={13} />
          Tilslut e-conomic under <strong className="ml-1">Integrationer</strong> for at hente leverandører automatisk
        </div>
      )}

      <div className="px-6 py-4 text-sm text-gray-500">
        Synkronisering matcher leverandører på e-conomic-nummer, CVR og navn. Eksisterende leverandører opdateres, nye oprettes automatisk.
        Bogføring på godkendte fakturaer sker automatisk hvis leverandøren har et e-conomic-nummer.
      </div>
    </div>
  )
}
