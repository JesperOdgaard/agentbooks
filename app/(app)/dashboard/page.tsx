import { createClient } from '@/lib/supabase/server'
import { FileText, Clock, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { DashboardCharts } from './dashboard-charts'
import { OnboardingGuide } from './onboarding-guide'

function formatDKK(amount: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
  }).format(amount)
}

const statusLabel: Record<string, string> = {
  pending: 'Afventer',
  awaiting_approval: 'Til godkendelse',
  approved: 'Godkendt',
  rejected: 'Afvist',
  paid: 'Betalt',
  overdue: 'Forfalden',
  cancelled: 'Annulleret',
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  awaiting_approval: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const DA_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

export default async function DashboardPage() {
  const supabase = await createClient()

  // Hent org-navn
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .maybeSingle()

  const { data: org } = member?.organization_id
    ? await supabase
        .from('organizations')
        .select('name')
        .eq('id', member.organization_id)
        .single()
    : { data: null }

  // Hent alle fakturaer (status + beløb + dato + leverandør + konto)
  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('id, status, amount_incl_vat, amount_excl_vat, invoice_date, due_date, supplier_id, account_id, suppliers(name), accounts(code, name)')

  const invoices = allInvoices ?? []

  // Forfaldne fakturaer (due_date < i dag og ikke betalt/annulleret)
  const today = new Date().toISOString().slice(0, 10)
  const { data: overdueInvoicesList } = await supabase
    .from('invoices')
    .select('id, invoice_number, due_date, amount_incl_vat, status, suppliers(name)')
    .lt('due_date', today)
    .not('status', 'in', '("paid","cancelled")')
    .order('due_date', { ascending: true })
    .limit(8)

  const stats = {
    total: invoices.length,
    awaiting: invoices.filter((i) => i.status === 'awaiting_approval').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    pendingAmount: invoices
      .filter((i) => ['pending', 'awaiting_approval', 'approved'].includes(i.status))
      .reduce((sum, i) => sum + (i.amount_incl_vat ?? 0), 0),
  }

  // Seneste 5 fakturaer
  const { data: recentInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, amount_incl_vat, due_date, suppliers(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  // --- Chart data ---

  // Månedlig data: seneste 6 måneder
  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const monthInvoices = invoices.filter((inv) => {
      if (!inv.invoice_date) return false
      const invDate = new Date(inv.invoice_date)
      return invDate.getFullYear() === year && invDate.getMonth() === month
    })
    return {
      month: DA_MONTHS[month],
      beloeb: monthInvoices.reduce((sum, inv) => sum + (inv.amount_incl_vat ?? 0), 0),
      antal: monthInvoices.length,
    }
  })

  // Status fordeling
  const statusCounts: Record<string, number> = {}
  for (const inv of invoices) {
    statusCounts[inv.status] = (statusCounts[inv.status] ?? 0) + 1
  }

  const statusData = [
    { name: 'Afventer', value: statusCounts['pending'] ?? 0, color: '#fbbf24' },
    { name: 'Til godkendelse', value: statusCounts['awaiting_approval'] ?? 0, color: '#60a5fa' },
    { name: 'Godkendt', value: statusCounts['approved'] ?? 0, color: '#10b981' },
    { name: 'Betalt', value: statusCounts['paid'] ?? 0, color: '#9ca3af' },
    { name: 'Afvist', value: statusCounts['rejected'] ?? 0, color: '#f87171' },
    { name: 'Forfalden', value: statusCounts['overdue'] ?? 0, color: '#ef4444' },
  ]

  // Top 5 leverandører
  const supplierTotals: Record<string, { name: string; total: number }> = {}
  for (const inv of invoices) {
    if (!inv.supplier_id) continue
    const supplierData = inv.suppliers as { name: string } | null
    const name = supplierData?.name ?? 'Ukendt'
    if (!supplierTotals[inv.supplier_id]) {
      supplierTotals[inv.supplier_id] = { name, total: 0 }
    }
    supplierTotals[inv.supplier_id].total += inv.amount_incl_vat ?? 0
  }

  const topSuppliers = Object.values(supplierTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Udgifter per konto — indeværende år
  const currentYear = new Date().getFullYear()
  const accountTotals: Record<string, { code: string; name: string; total: number }> = {}
  for (const inv of invoices) {
    if (!inv.account_id) continue
    const invYear = inv.invoice_date ? new Date(inv.invoice_date).getFullYear() : null
    if (invYear !== currentYear) continue
    const acc = inv.accounts as { code: string; name: string } | null
    if (!acc) continue
    if (!accountTotals[inv.account_id]) {
      accountTotals[inv.account_id] = { code: acc.code, name: acc.name, total: 0 }
    }
    accountTotals[inv.account_id].total += Number(inv.amount_excl_vat) || 0
  }
  const accountBreakdown = Object.values(accountTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overblik over din fakturaflow</p>
      </div>

      {/* Onboarding — vis kun til nye org'er uden fakturaer */}
      {invoices.length === 0 && org && (
        <OnboardingGuide orgName={org.name} />
      )}

      {/* Statistik-kort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Fakturaer i alt</span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Afventer godkendelse</span>
            <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock size={16} className="text-yellow-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.awaiting}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Forfaldne</span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle size={16} className="text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Udestående beløb</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDKK(stats.pendingAmount)}</p>
        </div>
      </div>

      {/* Forfaldne fakturaer */}
      {overdueInvoicesList && overdueInvoicesList.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl mb-5 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-red-100">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              {overdueInvoicesList.length} forfaldne faktura{overdueInvoicesList.length !== 1 ? 'er' : ''} kræver handling
            </span>
          </div>
          <div className="divide-y divide-red-100">
            {overdueInvoicesList.map((inv) => {
              const supplier = inv.suppliers as { name: string } | null
              const daysOverdue = inv.due_date
                ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86_400_000)
                : null
              return (
                <Link
                  key={inv.id}
                  href={`/fakturaer/${inv.id}`}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-red-100/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs font-medium text-gray-800 truncate max-w-[180px]">
                      {supplier?.name ?? 'Ukendt leverandør'}
                    </span>
                    {inv.invoice_number && (
                      <span className="text-[11px] text-gray-400">{inv.invoice_number}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {daysOverdue !== null && (
                      <span className="text-[11px] text-red-600 font-medium">{daysOverdue} dag{daysOverdue !== 1 ? 'e' : ''} forfalden</span>
                    )}
                    <span className="text-xs font-semibold text-gray-900 tabular-nums">
                      {formatDKK(inv.amount_incl_vat ?? 0)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="mb-8">
        <DashboardCharts
          monthlyData={monthlyData}
          statusData={statusData}
          topSuppliers={topSuppliers}
          accountBreakdown={accountBreakdown}
        />
      </div>

      {/* Seneste fakturaer */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Seneste fakturaer</h2>
          <Link href="/fakturaer" className="text-sm text-emerald-600 hover:underline">
            Se alle
          </Link>
        </div>

        {!recentInvoices || recentInvoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Ingen fakturaer endnu</p>
            <Link
              href="/fakturaer/ny"
              className="inline-block mt-3 text-sm text-emerald-600 hover:underline"
            >
              Registrér din første faktura
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentInvoices.map((invoice) => {
              const supplier = invoice.suppliers as { name: string } | null
              return (
                <Link
                  key={invoice.id}
                  href={`/fakturaer/${invoice.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {supplier?.name ?? 'Ukendt leverandør'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {invoice.invoice_number ?? '—'}
                        {invoice.due_date && ` · Forfald ${new Date(invoice.due_date).toLocaleDateString('da-DK')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        statusColor[invoice.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {statusLabel[invoice.status] ?? invoice.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatDKK(invoice.amount_incl_vat ?? 0)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
