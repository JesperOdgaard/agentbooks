import { createClient } from '@/lib/supabase/server'
import { Building2, Mail, Phone, MapPin, CreditCard, Plus } from 'lucide-react'
import Link from 'next/link'
import { LeverandoerFilter } from './leverandoer-filter'
import { Suspense } from 'react'

export default async function LeverandoererPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q = '', status = '' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('suppliers')
    .select('id, name, cvr, email, phone, city, payment_terms, status')
    .order('name', { ascending: true })

  if (status === 'active')   query = query.eq('status', 'active')
  if (status === 'inactive') query = query.eq('status', 'inactive')
  if (q.trim())              query = query.ilike('name', `%${q.trim()}%`)

  const { data: suppliers } = await query
  const list = suppliers ?? []

  return (
    <div className="px-6 py-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leverandører</h1>
          <p className="text-sm text-gray-400 mt-0.5">Administrér dine kreditorer og kontakter</p>
        </div>
        <Link
          href="/leverandoerer/ny"
          className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={13} /> Tilføj leverandør
        </Link>
      </div>

      {/* Filter */}
      <Suspense>
        <LeverandoerFilter query={q} status={status} total={list.length} />
      </Suspense>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Building2 size={32} className="text-gray-200 mx-auto mb-3" />
            {q || status ? (
              <>
                <p className="text-sm font-medium text-gray-500">Ingen leverandører matcher søgningen</p>
                <Link href="/leverandoerer" className="inline-block mt-3 text-xs text-emerald-600 hover:underline">Ryd filtre</Link>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-500">Ingen leverandører endnu</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Tilføj din første leverandør for at komme i gang</p>
                <Link href="/leverandoerer/ny" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  Tilføj leverandør
                </Link>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Leverandør</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Kontakt</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">By</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Betalingsbetingelse</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((s) => (
                <tr key={s.id} className="group hover:bg-gray-50/60 transition-colors relative">
                  <td className="px-5 py-3.5">
                    <Link href={`/leverandoerer/${s.id}`} className="absolute inset-0" aria-label={s.name} />
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{s.name}</p>
                    {s.cvr && <p className="text-[11px] text-gray-400 mt-0.5 font-mono">CVR {s.cvr}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    {s.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail size={11} className="text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate max-w-[180px]">{s.email}</span>
                      </div>
                    ) : null}
                    {s.phone ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone size={11} className="text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-500">{s.phone}</span>
                      </div>
                    ) : null}
                    {!s.email && !s.phone && <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {s.city ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={11} className="text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-600">{s.city}</span>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={11} className="text-gray-300 flex-shrink-0" />
                      <span className="text-xs text-gray-600">{s.payment_terms ?? 30} dage</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                    }`}>
                      {s.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {list.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-2 px-1">{list.length} leverandør{list.length !== 1 ? 'er' : ''}</p>
      )}
    </div>
  )
}
