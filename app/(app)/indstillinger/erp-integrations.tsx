'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Loader2, Link2, Link2Off, RefreshCw } from 'lucide-react'
import { saveIntegration, removeIntegration, testIntegration } from './actions'

interface Integration {
  type: string
  is_active: boolean
  last_sync_at: string | null
}

interface ErpIntegrationsProps {
  integrations: Integration[]
  isAdmin: boolean
}

interface CardState {
  status: 'idle' | 'pending' | 'success' | 'error'
  message?: string
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Intl.DateTimeFormat('da-DK', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const integrationDefs = [
  {
    type: 'billy',
    name: 'Billy by Shine',
    logo: '🟡',
    desc: 'Synkronisér fakturaer, leverandører og bogføringsposter',
    docsUrl: 'https://billysbilling.com',
    fields: [
      { name: 'api_key', label: 'API-nøgle', placeholder: 'Din Billy API-nøgle', secret: true },
    ],
  },
  {
    type: 'economic',
    name: 'e-conomic',
    logo: '🔵',
    desc: 'To-vejs synkronisering af kontoplan, leverandører og fakturaer',
    docsUrl: 'https://developer.e-conomic.com',
    fields: [
      { name: 'api_key', label: 'App Secret Token', placeholder: 'X-AppSecretToken', secret: true },
      { name: 'api_key_2', label: 'Agreement Grant Token', placeholder: 'X-AgreementGrantToken', secret: true },
    ],
  },
] as const

type IntegrationType = 'billy' | 'economic'

export function ErpIntegrations({ integrations, isAdmin }: ErpIntegrationsProps) {
  const [isPending, startTransition] = useTransition()
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({})
  const [showForm, setShowForm] = useState<Record<string, boolean>>({})
  const [localIntegrations, setLocalIntegrations] = useState<Integration[]>(integrations)

  function getIntegration(type: string): Integration | undefined {
    return localIntegrations.find((i) => i.type === type && i.is_active)
  }

  function setCardState(type: string, state: CardState) {
    setCardStates((prev) => ({ ...prev, [type]: state }))
  }

  function handleSave(type: string, formEl: HTMLFormElement) {
    const formData = new FormData(formEl)
    formData.set('type', type)
    setCardState(type, { status: 'pending' })
    startTransition(async () => {
      const res = await saveIntegration(formData)
      if (res.error) {
        setCardState(type, { status: 'error', message: res.error })
      } else {
        setLocalIntegrations((prev) => {
          const filtered = prev.filter((i) => !(i.type === type))
          return [...filtered, { type, is_active: true, last_sync_at: null }]
        })
        setShowForm((prev) => ({ ...prev, [type]: false }))
        setCardState(type, { status: 'success', message: 'Integration gemt' })
        setTimeout(() => setCardState(type, { status: 'idle' }), 3000)
      }
    })
  }

  function handleRemove(type: IntegrationType) {
    setCardState(type, { status: 'pending' })
    startTransition(async () => {
      const res = await removeIntegration(type)
      if (res.error) {
        setCardState(type, { status: 'error', message: res.error })
      } else {
        setLocalIntegrations((prev) => prev.filter((i) => i.type !== type))
        setCardState(type, { status: 'idle' })
      }
    })
  }

  function handleTest(type: IntegrationType) {
    setCardState(type, { status: 'pending' })
    startTransition(async () => {
      const res = await testIntegration(type)
      if (res.error) {
        setCardState(type, { status: 'error', message: res.error })
      } else {
        setLocalIntegrations((prev) =>
          prev.map((i) =>
            i.type === type ? { ...i, last_sync_at: new Date().toISOString() } : i
          )
        )
        setCardState(type, { status: 'success', message: res.message ?? 'Forbindelsen virker' })
        setTimeout(() => setCardState(type, { status: 'idle' }), 5000)
      }
    })
  }

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {integrationDefs.map((def) => {
        const connected = getIntegration(def.type)
        const state = cardStates[def.type] ?? { status: 'idle' }
        const formVisible = showForm[def.type] ?? false
        const loading = state.status === 'pending'

        return (
          <div
            key={def.type}
            className={`border rounded-xl p-4 transition-colors ${
              connected ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{def.logo}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{def.name}</h3>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5">{def.desc}</p>
                </div>
              </div>
              {connected ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap flex-shrink-0">
                  <CheckCircle2 size={10} />
                  Tilsluttet
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap flex-shrink-0">
                  Ikke tilsluttet
                </span>
              )}
            </div>

            {/* Last sync */}
            {connected?.last_sync_at && (
              <p className="text-[10px] text-gray-400 mb-3">
                Sidst testet: {fmtDate(connected.last_sync_at)}
              </p>
            )}

            {/* Feedback */}
            {state.status === 'success' && state.message && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                <CheckCircle2 size={12} />
                {state.message}
              </div>
            )}
            {state.status === 'error' && state.message && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <XCircle size={12} />
                {state.message}
              </div>
            )}

            {/* Connected actions */}
            {connected && !formVisible && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(def.type as IntegrationType)}
                  disabled={loading || !isAdmin}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <RefreshCw size={11} />
                  )}
                  Test forbindelse
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleRemove(def.type as IntegrationType)}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Link2Off size={11} />
                    Fjern
                  </button>
                )}
              </div>
            )}

            {/* Not connected — show form toggle */}
            {!connected && !formVisible && isAdmin && (
              <button
                onClick={() => setShowForm((prev) => ({ ...prev, [def.type]: true }))}
                className="flex items-center gap-1.5 w-full justify-center text-xs font-medium py-1.5 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                <Link2 size={11} />
                Tilslut
              </button>
            )}

            {!connected && !isAdmin && (
              <p className="text-xs text-gray-400 italic">Kræver administratoradgang</p>
            )}

            {/* Setup form */}
            {formVisible && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSave(def.type, e.currentTarget)
                }}
                className="space-y-2.5 mt-2"
              >
                {def.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.secret ? 'password' : 'text'}
                      name={field.name}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      required={field.name === 'api_key'}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono placeholder-gray-300"
                    />
                  </div>
                ))}

                <p className="text-[10px] text-gray-400">
                  Nøgler krypteres med AES-256-GCM inden lagring.{' '}
                  <a href={def.docsUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                    API-dokumentation →
                  </a>
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-1.5 flex-1 justify-center text-xs font-medium py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    Gem nøgle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm((prev) => ({ ...prev, [def.type]: false }))
                      setCardState(def.type, { status: 'idle' })
                    }}
                    className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Annullér
                  </button>
                </div>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
