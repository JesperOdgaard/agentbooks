import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, CreditCard,
  FileText, AlertTriangle, ExternalLink, Hash,
} from 'lucide-react'
import Link from 'next/link'
import { SupplierEditForm } from './supplier-edit-form'

function fmt(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 2 }).format(v)
}


const statusLabel: Record<string, string> = {
  pending: 'Afventer', awaiting_approval: 'Til godkendelse',
  approved: 'Godkendt', rejected: 'Afvist',
  paid: 'Betalt', overdue: 'Forfalden', cancelled: 'Annulleret',
}
const statusStyle: Record<string, string> = {
  pending:           'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  awaiting_approval: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  approved:          'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected:          'bg-red-50 text-red-600 ring-1 ring-red-200',
  paid:              'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  overdue:           'bg-red-50 text-red-600 ring-1 ring-red-200',
  cancelled:         'bg-gray-100 text-gray-400 ring-1 ring-gray-200',
}

export default async function LeverandoerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (!supplier) notFound()

  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, due_date, amount_incl_vat, status')
    .eq('supplier_id', id)
    .order('invoice_date', { ascending: false })

  const invoices = allInvoices ?? []

  // KPI beregninger
  const totalCount   = invoices.length
  const totalAmount  = invoices.reduce((s, i) => s + (Number(i.amount_incl_vat) || 0), 0)
  const paidAmount   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amount_incl_vat) || 0), 0)
  const outstanding  = invoices
    .filter(i => ['pending', 'awaiting_approval', 'approved'].includes(i.status))
    .reduce((s, i) => s + (Number(i.amount_incl_vat) || 0), 0)
  const overdueInvoices = invoices.filter(i =>
    i.due_date && new Date(i.due_date) < new Date() && !['paid', 'cancelled'].includes(i.status)
  )
  const overdueAmount = overdueInvoices.reduce((s, i) => s + (Number(i.amount_incl_vat) || 0), 0)
  const paidCount = invoices.filter(i => i.status === 'paid').length

  return (
    <div className="px-6 py-5 max-w-6xl">

      {/* Breadcrumb */}
      <Link href="/leverandoerer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
        <ArrowLeft size={12} /> Leverandører
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{supplier.name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
              supplier.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
            }`}>
              {supplier.status === 'active' ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {supplier.cvr && (
              <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                <Hash size={10} /> CVR {supplier.cvr}
              </span>
            )}
            {supplier.city && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={10} />
                {[supplier.postal_code, supplier.city].filter(Boolean).join(' ')}
              </span>
            )}
            {supplier.payment_terms != null && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CreditCard size={10} /> Net {supplier.payment_terms} dage
              </span>
            )}
          </div>
        </div>

        <Link
          href="/fakturaer/ny"
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
        >
          <FileText size={12} /> Ny faktura
        </Link>
      </div>

      {/* KPI Strip — én linje */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
        <div className="flex divide-x divide-gray-100">
          <div className="flex items-center gap-3 px-5 py-3 min-w-0">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Fakturaer</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">{totalCount}</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Samlet købt</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">{fmt(totalAmount)}</span>
            <span className="text-[10px] text-gray-300 whitespace-nowrap">inkl. moms</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Betalt</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmt(paidAmount)}</span>
          </div>
          <div className={`flex items-center gap-3 px-5 py-3 flex-1 min-w-0 ${overdueAmount > 0 ? 'bg-red-50/40' : ''}`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${overdueAmount > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {overdueAmount > 0 ? 'Forfalden' : 'Udestående'}
            </span>
            <span className={`text-sm font-bold tabular-nums ${overdueAmount > 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {fmt(overdueAmount > 0 ? overdueAmount : outstanding)}
            </span>
            {overdueAmount > 0 && <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />}
          </div>
        </div>
      </div>

      {/* Hoved-grid */}
      <div className="grid grid-cols-3 gap-5">

        {/* Venstre: Fakturahistorik */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Fakturahistorik {totalCount > 0 && <span className="text-gray-400 font-normal">({totalCount})</span>}
              </span>
              <Link href="/fakturaer/ny" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                + Ny faktura
              </Link>
            </div>

            {invoices.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FileText size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">Ingen fakturaer fra denne leverandør endnu</p>
                <Link href="/fakturaer/ny" className="inline-block mt-3 text-xs text-emerald-600 hover:underline">
                  Registrér første faktura →
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fakturanr.</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Dato</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Forfald</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Beløb</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((inv) => {
                    const overdue = inv.due_date && new Date(inv.due_date) < new Date() && !['paid', 'cancelled'].includes(inv.status)
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="px-5 py-3">
                          <Link href={`/fakturaer/${inv.id}`} className="text-sm font-medium text-gray-800 group-hover:text-emerald-600 transition-colors">
                            {inv.invoice_number ?? <span className="text-gray-300 italic text-xs">Uden nummer</span>}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('da-DK') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums">
                          <span className={overdue ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString('da-DK') : '—'}
                          </span>
                          {overdue && <AlertTriangle size={10} className="text-red-400 inline ml-1" />}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                          {fmt(inv.amount_incl_vat)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyle[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {statusLabel[inv.status] ?? inv.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {invoices.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                      <td colSpan={3} className="px-5 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Total
                      </td>
                      <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right tabular-nums">
                        {fmt(totalAmount)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>

        {/* Højre: Info + Rediger */}
        <div className="space-y-4">

          {/* Kontakt */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontakt</span>
            </div>
            <div className="divide-y divide-gray-50">
              {supplier.email && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Mail size={13} className="text-gray-300 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">E-mail</p>
                    <a href={`mailto:${supplier.email}`} className="text-xs font-medium text-emerald-600 hover:underline truncate block">
                      {supplier.email}
                    </a>
                  </div>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Phone size={13} className="text-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Telefon</p>
                    <a href={`tel:${supplier.phone}`} className="text-xs font-medium text-gray-700">{supplier.phone}</a>
                  </div>
                </div>
              )}
              {(supplier.address || supplier.city) && (
                <div className="flex items-start gap-3 px-4 py-2.5">
                  <MapPin size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400">Adresse</p>
                    <div className="text-xs font-medium text-gray-700 leading-relaxed">
                      {supplier.address && <p>{supplier.address}</p>}
                      {(supplier.postal_code || supplier.city) && (
                        <p>{[supplier.postal_code, supplier.city].filter(Boolean).join(' ')}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!supplier.email && !supplier.phone && !supplier.address && (
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-300 italic">Ingen kontaktoplysninger</p>
                </div>
              )}
            </div>
          </div>

          {/* Bank */}
          {(supplier.iban || supplier.bank_reg_no) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bankoplysninger</span>
              </div>
              <div className="divide-y divide-gray-50">
                {supplier.iban && (
                  <div className="flex items-start gap-3 px-4 py-2.5">
                    <Building2 size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-gray-400">IBAN</p>
                      <p className="text-xs font-mono font-medium text-gray-700">{supplier.iban}</p>
                    </div>
                  </div>
                )}
                {supplier.bank_reg_no && supplier.bank_account_no && (
                  <div className="flex items-start gap-3 px-4 py-2.5">
                    <CreditCard size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-gray-400">Reg.nr. · Kontonr.</p>
                      <p className="text-xs font-mono font-medium text-gray-700">
                        {supplier.bank_reg_no} · {supplier.bank_account_no}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Intern note</p>
              <p className="text-xs text-amber-800 leading-relaxed">{supplier.notes}</p>
            </div>
          )}

          {/* Rediger */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rediger leverandør</span>
            </div>
            <div className="px-4 py-4">
              <SupplierEditForm supplier={supplier} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
