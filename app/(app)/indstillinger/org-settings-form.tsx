'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateOrganization } from './actions'
import { Upload, Trash2, Building2 } from 'lucide-react'

interface OrgData {
  id: string
  name: string
  cvr: string | null
  email: string | null
  phone: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  base_currency: string | null
  fiscal_year_start: string | null
  logo_url: string | null
}

const countries = [
  { value: 'DK', label: 'Danmark', flag: '🇩🇰' },
  { value: 'SE', label: 'Sverige', flag: '🇸🇪' },
  { value: 'NO', label: 'Norge', flag: '🇳🇴' },
  { value: 'FI', label: 'Finland', flag: '🇫🇮' },
  { value: 'DE', label: 'Tyskland', flag: '🇩🇪' },
  { value: 'GB', label: 'Storbritannien', flag: '🇬🇧' },
  { value: 'US', label: 'USA', flag: '🇺🇸' },
]

const currencies = ['DKK', 'EUR', 'USD', 'SEK', 'NOK', 'GBP']

const months = ['Januar','Februar','Marts','April','Maj','Juni','Juli','August','September','Oktober','November','December']
const fiscalValues = ['01-01','02-01','03-01','04-01','05-01','06-01','07-01','08-01','09-01','10-01','11-01','12-01']

export function OrgSettingsForm({ org, isAdmin }: { org: OrgData; isAdmin: boolean }) {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logo_url)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(file: File) {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) { setLogoError('Kun PNG, JPG, SVG og WebP er tilladt'); return }
    if (file.size > 5 * 1024 * 1024) { setLogoError('Filen må maksimalt være 5 MB'); return }
    setLogoError(null)
    setLogoUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `${org.id}/logo.${ext}`
    const supabase = createClient()
    const { error: uploadError } = await supabase.storage.from('organizations').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) { setLogoError('Upload fejlede: ' + uploadError.message); setLogoUploading(false); return }
    const { data: urlData } = supabase.storage.from('organizations').getPublicUrl(path)
    await supabase.from('organizations').update({ logo_url: urlData.publicUrl }).eq('id', org.id)
    setLogoUrl(urlData.publicUrl + '?t=' + Date.now())
    setLogoUploading(false)
  }

  async function handleLogoDelete() {
    setLogoError(null)
    const supabase = createClient()
    await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id)
    setLogoUrl(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setSuccess(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateOrganization(formData)
      if (result.error) { setError(result.error) }
      else { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    })
  }

  const inp = `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-400 bg-white`
  const lbl = `block text-sm font-medium text-gray-700 mb-1.5`

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">✓ Ændringer gemt</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* ── Venstre ── */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">Navn og adresse</h3>

          <div>
            <label className={lbl}>Navn</label>
            <input type="text" name="name" required defaultValue={org.name} disabled={!isAdmin} className={inp} placeholder="Virksomhedsnavn ApS" />
          </div>

          <div>
            <label className={lbl}>CVR</label>
            <input type="text" name="cvr" defaultValue={org.cvr ?? ''} disabled={!isAdmin} className={inp} placeholder="12345678" maxLength={8} />
          </div>

          <div>
            <label className={lbl}>Adresse</label>
            <input type="text" name="address" defaultValue={org.address ?? ''} disabled={!isAdmin} className={inp} placeholder="Gadenavn 1" />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Postnummer</label>
              <input type="text" name="postal_code" defaultValue={org.postal_code ?? ''} disabled={!isAdmin} className={inp} placeholder="1234" />
            </div>
            <div className="col-span-3">
              <label className={lbl}>By</label>
              <input type="text" name="city" defaultValue={org.city ?? ''} disabled={!isAdmin} className={inp} placeholder="København" />
            </div>
          </div>

          <div>
            <label className={lbl}>Land</label>
            <select name="country" defaultValue={org.country ?? 'DK'} disabled={!isAdmin} className={inp}>
              {countries.map((c) => <option key={c.value} value={c.value}>{c.flag} {c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className={lbl}>Basisvaluta</label>
              <select name="base_currency" defaultValue={org.base_currency ?? 'DKK'} disabled={!isAdmin} className={inp}>
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Regnskabsår starter</label>
              <select name="fiscal_year_start" defaultValue={org.fiscal_year_start ?? '01-01'} disabled={!isAdmin} className={inp}>
                {fiscalValues.map((v, i) => <option key={v} value={v}>{months[i]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Højre ── */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">Kontaktinformation</h3>

          <div>
            <label className={lbl}>Telefon</label>
            <input type="text" name="phone" defaultValue={org.phone ?? ''} disabled={!isAdmin} className={inp} placeholder="+45 12 34 56 78" />
          </div>

          <div>
            <label className={lbl}>E-mail</label>
            <input type="email" name="email" defaultValue={org.email ?? ''} disabled={!isAdmin} className={inp} placeholder="kontakt@virksomhed.dk" />
          </div>

          {/* ── Logo ── */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">Virksomhedsikon</h3>
            <p className="text-xs text-gray-400 mb-3">Bruges som dit ikon på fakturaer og dokumenter.</p>

            {logoUrl ? (
              <div className="relative inline-block group">
                <div className="w-48 h-28 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Virksomhedslogo" className="max-w-full max-h-full object-contain p-3" />
                </div>
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 bg-white rounded-lg shadow border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors" title="Erstat logo">
                      <Upload size={12} />
                    </button>
                    <button type="button" onClick={handleLogoDelete}
                      className="p-1.5 bg-white rounded-lg shadow border border-gray-200 text-red-400 hover:text-red-600 transition-colors" title="Slet logo">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ) : isAdmin ? (
              <div onClick={() => !logoUploading && fileInputRef.current?.click()}
                className="w-48 h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
                {logoUploading ? (
                  <p className="text-xs text-gray-400">Uploader...</p>
                ) : (
                  <>
                    <Building2 size={22} className="text-gray-300" />
                    <p className="text-xs text-gray-400">Upload logo</p>
                  </>
                )}
              </div>
            ) : (
              <div className="w-48 h-28 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                <Building2 size={24} className="text-gray-300" />
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); if (fileInputRef.current) fileInputRef.current.value = '' }} />
            {logoError && <p className="text-xs text-red-600 mt-2">{logoError}</p>}
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="mt-7 pt-5 border-t border-gray-100">
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors">
            {isPending ? 'Gemmer...' : 'Gem ændringer'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-gray-400">Kun administratorer kan redigere disse indstillinger.</p>
      )}
    </form>
  )
}
