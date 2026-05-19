import { createClient } from '@/lib/supabase/server'
import { Receipt } from 'lucide-react'
import Link from 'next/link'

function formatDKK(amount: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
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

export default async function RejseafregningPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('expense_reports')
    .select('id, title, status, total_amount, currency, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rejseafregning</h1>
          <p className="text-gray-500 text-sm mt-1">Indsend og administrér udlæg og rejseafregninger</p>
        </div>
        <Link
          href="/rejseafregning/ny"
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Ny afregning
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {!reports || reports.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Receipt size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Ingen afregninger endnu</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">Opret en ny rejseafregning for at registrere udlæg</p>
            <Link
              href="/rejseafregning/ny"
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Ny afregning
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 text-left">Titel</th>
                  <th className="px-6 py-3 text-left">Indsendt af</th>
                  <th className="px-6 py-3 text-left">Dato</th>
                  <th className="px-6 py-3 text-right">Beløb</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((report) => {
                  const profile = report.profiles as { full_name: string | null } | null
                  return (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/rejseafregning/${report.id}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <Link href={`/rejseafregning/${report.id}`} className="hover:text-emerald-600 transition-colors">
                          {report.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {profile?.full_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('da-DK')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right tabular-nums">
                        {formatDKK(report.total_amount ?? 0)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            statusColor[report.status] ?? 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {statusLabel[report.status] ?? report.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
