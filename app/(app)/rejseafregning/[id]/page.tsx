import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Calendar } from 'lucide-react'
import { ExpenseActions } from './expense-actions'

function formatDKK(amount: number | null, currency = 'DKK') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

const statusLabel: Record<string, string> = {
  draft: 'Kladde',
  submitted: 'Indsendt',
  approved: 'Godkendt',
  rejected: 'Afvist',
  paid: 'Udbetalt',
}

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-purple-100 text-purple-700',
}

const categoryLabel: Record<string, string> = {
  transport: 'Transport',
  hotel: 'Hotel',
  meals: 'Forplejning',
  other: 'Andet',
}

const categoryColor: Record<string, string> = {
  transport: 'bg-blue-50 text-blue-700',
  hotel: 'bg-purple-50 text-purple-700',
  meals: 'bg-orange-50 text-orange-700',
  other: 'bg-gray-50 text-gray-600',
}

export default async function RejseafregningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('expense_reports')
    .select(`
      id, title, trip_name, report_date, status, total_amount, currency,
      notes, rejection_reason, approved_at, created_at,
      user_id,
      profiles(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!report) notFound()

  const { data: items } = await supabase
    .from('expense_items')
    .select('id, description, date, amount, currency, category, vat_amount, sort_order')
    .eq('expense_report_id', id)
    .order('sort_order', { ascending: true })

  // Tjek brugerens rolle
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const userRole = member?.role ?? 'employee'
  const isOwner = report.user_id === user.id
  const isApprover = ['admin', 'accountant'].includes(userRole)

  const profile = report.profiles as { full_name: string | null; email: string | null } | null

  // Beregn totaler
  const computedTotal = (items ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0)
  const totalVat = (items ?? []).reduce((sum, item) => sum + (item.vat_amount ?? 0), 0)

  // Kategori-breakdown
  const byCategory: Record<string, number> = {}
  for (const item of items ?? []) {
    const cat = item.category ?? 'other'
    byCategory[cat] = (byCategory[cat] ?? 0) + (item.amount ?? 0)
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/rejseafregning"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Rejseafregninger
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                statusColor[report.status] ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {statusLabel[report.status] ?? report.status}
            </span>
          </div>
          {report.trip_name && (
            <p className="text-gray-500 text-sm mt-1">{report.trip_name}</p>
          )}
        </div>
      </div>

      {/* Handlinger */}
      {(report.status !== 'paid' && report.status !== 'rejected') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Handlinger</p>
          <ExpenseActions
            reportId={report.id}
            status={report.status}
            isOwner={isOwner}
            isApprover={isApprover}
          />
        </div>
      )}

      {/* Afvisningsgrund */}
      {report.status === 'rejected' && report.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Afvisningsgrund</p>
          <p className="text-sm text-red-800">{report.rejection_reason}</p>
        </div>
      )}

      {/* Metadata-kort */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Indsendt af</p>
          </div>
          <p className="font-medium text-gray-900">{profile?.full_name ?? '—'}</p>
          {profile?.email && <p className="text-sm text-gray-500">{profile.email}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Afregningsdato</p>
          </div>
          <p className="font-medium text-gray-900">
            {report.report_date
              ? new Date(report.report_date).toLocaleDateString('da-DK')
              : '—'}
          </p>
          {report.approved_at && (
            <p className="text-xs text-gray-400 mt-1">
              Godkendt {new Date(report.approved_at).toLocaleDateString('da-DK')}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Samlet beløb</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDKK(computedTotal, report.currency ?? 'DKK')}
          </p>
          {totalVat > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Heraf moms: {formatDKK(totalVat, report.currency ?? 'DKK')}
            </p>
          )}
        </div>
      </div>

      {/* Kategori-fordeling */}
      {Object.keys(byCategory).length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Fordeling pr. kategori</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byCategory).map(([cat, amount]) => (
              <div
                key={cat}
                className={`px-3 py-2 rounded-lg text-sm ${categoryColor[cat] ?? 'bg-gray-50 text-gray-600'}`}
              >
                <span className="font-medium">{categoryLabel[cat] ?? cat}</span>
                <span className="ml-2 text-xs opacity-75">{formatDKK(amount, report.currency ?? 'DKK')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Udgiftsposter */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Udgiftsposter</h2>
        </div>
        {!items || items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400 text-sm">Ingen udgiftsposter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-5 py-3 text-left">Beskrivelse</th>
                  <th className="px-5 py-3 text-left">Dato</th>
                  <th className="px-5 py-3 text-left">Kategori</th>
                  <th className="px-5 py-3 text-right">Beløb</th>
                  <th className="px-5 py-3 text-right">Moms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {item.date ? new Date(item.date).toLocaleDateString('da-DK') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          categoryColor[item.category ?? 'other'] ?? 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {categoryLabel[item.category ?? 'other'] ?? item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                      {formatDKK(item.amount, item.currency ?? report.currency ?? 'DKK')}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 text-right tabular-nums">
                      {item.vat_amount ? formatDKK(item.vat_amount, item.currency ?? 'DKK') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700 text-right">
                    Total
                  </td>
                  <td className="px-5 py-3 text-base font-bold text-gray-900 text-right tabular-nums">
                    {formatDKK(computedTotal, report.currency ?? 'DKK')}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-600 text-right tabular-nums">
                    {totalVat > 0 ? formatDKK(totalVat, report.currency ?? 'DKK') : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Bemærkninger */}
      {report.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bemærkninger</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.notes}</p>
        </div>
      )}
    </div>
  )
}
