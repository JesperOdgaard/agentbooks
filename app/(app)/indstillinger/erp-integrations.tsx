'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Plug, Trash2, RefreshCw, ExternalLink } from 'lucide-react'
import { saveIntegration, removeIntegration, testIntegration } from './actions'

type Integration = {
  type: string
  is_active: boolean | null
  last_sync_at: string | null
}

const INTEGRATIONS = [
  {
    type: 'billy',
    name: 'Billy by Shine',
    desc: 'Bogføring og fakturering',
    color: 'bg-orange-50',
    fields: [{ key: 'api_key', label: 'API-nøgle', placeholder: 'X-Access-Token' }],
    docsUrl: 'https://www.billy.dk/api',
  },
  {
    type: 'economic',
    name: 'e-conomic',
    desc: 'To-vejs synkronisering af kontoplan, leverandører og fakturaer',
    color: 'bg-blue-50',
    fields: [
      { key: 'api_key',   label: 'App Secret Token',      placeholder: 'X-AppSecretToken' },
      { key: 'api_key_2', label: 'Agreement Grant Token', placeholder: 'X-AgreementGrantToken' },
    ],
    docsUrl: 'https://www.e-conomic.com/developer',
  },
]

interface ErpIntegrationsProps {
  integrations: Integration[]
  isAdmin: boolean
}

export function ErpIntegrations({ integrations, isAdmin }: ErpIntegrationsProps) {
  const [showForm, setShowForm] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'error' | 'ok' | 'test'; text: string; target?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function getIntegration(type: string) {
    return integrations.find((i) => i.type === type && i.is_active)
  }

  function handleSave(type: string, formData: FormData) {
    formData.set('type', type)
    startTransition(async () => {
      const res = await saveIntegration(formData)
      if (res.error) setMessage({ type: 'error', text: res.error })
      else { setShowForm(null); setMessage(null) }
    })
  }

  function handleRemove(type: string) {
    startTransition(async () => {
      const res = await removeIntegration(type as 'billy' | 'economic')
      if (res.error) setMessage({ type: 'error', text: res.error })
      else setMessage(null)
    })
  }

  function handleTest(type: string) {
    startTransition(async () => {
      const res = await testIntegration(type as 'billy' | 'economic')
      if (res.error) setMessage({ type: 'error', text: res.error, target: type })
      else setMessage({ type: 'test', text: res.message ?? 'Forbundet ✓', target: type })
    })
  }

  return (
    <div className="space-y-4">
      {message && !message.target && (
        <div className={`text-sm px-4 py-2.5 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message.text}
        </div>
      )}

      {INTEGRATIONS.map((cfg) => {
        const connected = getIntegration(cfg.type)
        const isShowingForm = showForm === cfg.type
        const testMsg = message?.target === cfg.type ? message : null

        return (
          <div key={cfg.type} className={`rounded-xl border border-gray-200 overflow-hidden`}>
            {/* Header */}
            <div className={`${cfg.color} px-5 py-4 flex items-start justify-between`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <h3 className="text-sm font-semibold text-gray-900">{cfg.name}</h3>
                  {connected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle size={11} /> Tilsluttet
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Ikke tilsluttet
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{cfg.desc}</p>
                {connected?.last_sync_at && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Sidst testet: {new Date(connected.last_sync_at).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                )}
              </div>
              <a
                href={cfg.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Test feedback */}
            {testMsg && (
              <div className={`px-5 py-2 text-xs font-medium ${testMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {testMsg.text}
              </div>
            )}

            {/* Actions */}
            {isAdmin && (
              <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={() => handleTest(cfg.type)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
                      Test forbindelse
                    </button>
                    <button
                      onClick={() => handleRemove(cfg.type)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Fjern
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowForm(isShowingForm ? null : cfg.type)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    <Plug size={12} />
                    Tilslut
                  </button>
                )}
              </div>
            )}

            {/* API key form */}
            {isShowingForm && !connected && (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSave(cfg.type, new FormData(e.currentTarget)) }}
                className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3"
              >
                {cfg.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                      {field.label}
                    </label>
                    <input
                      name={field.key}
                      placeholder={field.placeholder}
                      required={field.key === 'api_key'}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                    />
                  </div>
                ))}
                <p className="text-[11px] text-gray-400">
                  Nøgler krypteres med AES-256-GCM inden lagring.{' '}
                  <a href={cfg.docsUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    API-dokumentation →
                  </a>
                </p>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 text-sm font-semibold py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {isPending ? 'Gemmer…' : '⊕ Gem nøgle'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(null)}
                    className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
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
