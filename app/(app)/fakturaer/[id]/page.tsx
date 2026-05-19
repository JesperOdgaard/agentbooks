import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'
import { InvoiceActions } from './invoice-actions'
import { InvoicePdfViewer } from './invoice-pdf-viewer'
import { CreateSupplierModal } from './create-supplier-modal'
import { KonteringSuggestions } from './kontering-suggestions'
import { InvoiceEditForm } from './invoice-edit-form'
import { RegisterPaymentModal } from './register-payment-modal'
import { InvoiceQueueWidget } from './invoice-queue-widget'

const statusLabel: Record<string, string> = {
  pending: 'Afventer',
  awaiting_approval: 'Til godkendelse',
  approved: 'Godkendt',
  rejected: 'Afvist',
  paid: 'Betalt',
  overdue: 'Forfalden',
  cancelled: 'Annulleret',
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

function fmt(v: number | null, currency = 'DKK') {
  if (v == null) return '—'
  return new Intl.NumberFormat('da-DK', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(v)
}

export default async function FakturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`*, suppliers(id,name,email,cvr), accounts(id,code,name), vat_codes(id,code,name,rate), departments(id,name), projects(id,name)`)
    .eq('id', id)
    .single()

  if (invoiceError) console.error('[fakturaer/[id]]', invoiceError)
  if (!invoice) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  let orgId: string | null = null
  if (user) {
    const { data: m } = await supabase
      .from('organization_members').select('organization_id').eq('user_id', user.id).maybeSingle()
    orgId = m?.organization_id ?? null
  }

  let signedUrl: string | null = null
  if (invoice.file_url) {
    const { data: s } = await supabase.storage.from('invoices').createSignedUrl(invoice.file_url, 3600)
    signedUrl = s?.signedUrl ?? null
  }

  const [
    { data: accounts },
    { data: vatCodes },
    { data: departments },
    { data: projects },
  ] = await Promise.all([
    supabase.from('accounts').select('id,code,name').order('code'),
    supabase.from('vat_codes').select('id,code,name,rate').order('code'),
    orgId ? supabase.from('departments').select('id,name').eq('organization_id', orgId).order('name') : Promise.resolve({ data: [] }),
    orgId ? supabase.from('projects').select('id,name').eq('organization_id', orgId).order('name') : Promise.resolve({ data: [] }),
  ])

  const supplier = invoice.suppliers as { id: string; name: string; email: string | null; cvr: string | null } | null
  const account  = invoice.accounts  as { id: string; code: string; name: string } | null
  const vatCode  = invoice.vat_codes as { id: string; code: string; name: string; rate: number | null } | null

  let approverName: string | null = null
  if (invoice.approved_by) {
    const { data: p } = await supabase.from('profiles').select('full_name').eq('id', invoice.approved_by).single()
    approverName = p?.full_name ?? null
  }

  const assignedApproverId = (invoice as Record<string, unknown>).assigned_approver_id as string | null
  const matchedRuleName    = (invoice as Record<string, unknown>).matched_rule_name    as string | null
  let assignedApproverName: string | null = null
  if (assignedApproverId) {
    const { data: p } = await supabase.from('profiles').select('full_name').eq('id', assignedApproverId).maybeSingle()
    assignedApproverName = p?.full_name ?? null
  }

  interface AiData {
    supplier_name?: string | null; supplier_cvr?: string | null
    supplier_email?: string | null; supplier_address?: string | null
    suggested_account_code?: string | null; suggested_account_id?: string | null
    suggested_vat_code?: string | null; suggested_vat_code_id?: string | null
    kontering_confidence?: number | null; kontering_reasoning?: string | null
  }
  const aiData = (invoice.ai_data ?? null) as AiData | null

  let suggestedAccountName: string | null = null
  if (aiData?.suggested_account_id) {
    const { data: a } = await supabase.from('accounts').select('name').eq('id', aiData.suggested_account_id).maybeSingle()
    suggestedAccountName = a?.name ?? null
  }

  const konteringApplied = !!invoice.account_id && invoice.account_id === aiData?.suggested_account_id
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && !['paid', 'cancelled'].includes(invoice.status)

  // Hent ventende fakturaer til kø-widget (pending + awaiting_approval)
  const { data: queueRaw } = orgId
    ? await supabase
        .from('invoices')
        .select('id, invoice_number, amount_incl_vat, currency, status, due_date, suppliers(name)')
        .eq('organization_id', orgId)
        .in('status', ['pending', 'awaiting_approval'])
        .order('created_at', { ascending: true })
        .limit(20)
    : { data: [] }

  const queueInvoices = (queueRaw ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    supplier_name: (inv.suppliers as { name: string } | null)?.name ?? null,
    amount_incl_vat: inv.amount_incl_vat,
    currency: inv.currency,
    status: inv.status,
    due_date: inv.due_date,
  }))

  return (
    <div className="px-6 py-5 max-w-5xl">

      {/* ── Header ── */}
      <div className="mb-5">
        <Link href="/fakturaer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3">
          <ArrowLeft size={13} /> Fakturaer
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {invoice.invoice_number ? `Faktura ${invoice.invoice_number}` : 'Faktura uden nummer'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm text-gray-500">{supplier?.name ?? 'Ukendt leverandør'}</span>
              {invoice.invoice_date && (
                <span className="text-sm text-gray-400">
                  · {new Date(invoice.invoice_date).toLocaleDateString('da-DK')}
                </span>
              )}
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                  <AlertTriangle size={11} /> Forfalden
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyle[invoice.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {statusLabel[invoice.status] ?? invoice.status}
          </span>
        </div>
      </div>

      {/* ── Bannere ── */}
      {invoice.status === 'rejected' && invoice.rejection_reason && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
          <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-red-800">Afvist: </span>
            <span className="text-red-700">{invoice.rejection_reason}</span>
          </div>
        </div>
      )}
      {invoice.status === 'approved' && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 mb-4 text-sm">
          <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
          <span className="font-medium text-emerald-800">Godkendt</span>
          {(approverName || invoice.approved_at) && (
            <span className="text-emerald-600 text-xs">
              {approverName && `· af ${approverName}`}
              {invoice.approved_at && ` · ${new Date(invoice.approved_at).toLocaleDateString('da-DK')}`}
            </span>
          )}
          {(invoice as Record<string, unknown>).economic_booked_number && (
            <span className="ml-auto text-xs font-medium text-blue-700 bg-blue-50 ring-1 ring-blue-200 px-2 py-0.5 rounded-full">
              e-conomic #{String((invoice as Record<string, unknown>).economic_booked_number)}
            </span>
          )}
        </div>
      )}

      {/* ── Grid ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* ── Venstre (2/3) ── */}
        <div className="col-span-2 space-y-4">

          {/* PDF */}
          {orgId && (
            <InvoicePdfViewer invoiceId={id} orgId={orgId} signedUrl={signedUrl} fileName={invoice.file_name ?? null} />
          )}

          {/* Detaljer + edit */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fakturadetaljer</span>
              {invoice.ai_scanned && (
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                  AI-scannet {invoice.ai_confidence != null ? `· ${Math.round(Number(invoice.ai_confidence))}%` : ''}
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              <InvoiceEditForm
                invoiceId={id}
                invoiceNumber={invoice.invoice_number}
                invoiceDate={invoice.invoice_date}
                dueDate={invoice.due_date}
                amountExclVat={invoice.amount_excl_vat}
                vatAmount={invoice.vat_amount}
                amountInclVat={invoice.amount_incl_vat}
                currency={invoice.currency ?? 'DKK'}
                accountId={invoice.account_id}
                vatCodeId={invoice.vat_code_id}
                departmentId={invoice.department_id}
                projectId={invoice.project_id}
                notes={invoice.notes}
                accounts={accounts ?? []}
                vatCodes={vatCodes ?? []}
                departments={departments ?? []}
                projects={projects ?? []}
              />
            </div>
          </div>

          {/* AI konteringsforslag */}
          {aiData?.suggested_account_id && (
            <KonteringSuggestions
              invoiceId={id}
              suggestedAccountCode={aiData.suggested_account_code ?? null}
              suggestedAccountName={suggestedAccountName}
              suggestedAccountId={aiData.suggested_account_id}
              suggestedVatCode={aiData.suggested_vat_code ?? null}
              suggestedVatCodeId={aiData.suggested_vat_code_id ?? null}
              confidence={aiData.kontering_confidence ?? null}
              reasoning={aiData.kontering_reasoning ?? null}
              alreadyApplied={konteringApplied}
            />
          )}
        </div>

        {/* ── Højre (1/3) ── */}
        <div className="space-y-3">

          {/* Handlinger */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Handlinger</span>
            </div>
            <div className="p-3 space-y-1.5">
              {invoice.status === 'approved' && (
                <RegisterPaymentModal
                  invoiceId={id}
                  amountInclVat={invoice.amount_incl_vat}
                  currency={invoice.currency}
                />
              )}
              <InvoiceActions invoiceId={id} status={invoice.status} aiScanned={invoice.ai_scanned ?? false} />
            </div>
          </div>

          {/* Faktura-kø */}
          <InvoiceQueueWidget currentId={id} invoices={queueInvoices} />

          {/* Tildelt godkender */}
          {invoice.status === 'awaiting_approval' && assignedApproverName && (
            <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={11} className="text-blue-400" />
                <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">Tildelt godkender</span>
              </div>
              <p className="text-sm font-semibold text-blue-900">{assignedApproverName}</p>
              {matchedRuleName && (
                <p className="text-xs text-blue-400 mt-0.5">{matchedRuleName}</p>
              )}
            </div>
          )}

          {/* Leverandør */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leverandør</span>
            </div>
            <div className="px-4 py-3">
              {supplier ? (
                <div>
                  <p className="text-sm font-semibold text-gray-900">{supplier.name}</p>
                  {supplier.cvr   && <p className="text-xs text-gray-400 mt-0.5">CVR {supplier.cvr}</p>}
                  {supplier.email && <p className="text-xs text-gray-400">{supplier.email}</p>}
                  <Link href={`/leverandoerer/${supplier.id}`} className="text-xs text-emerald-600 hover:underline mt-2 inline-block">
                    Se profil →
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Ingen leverandør tilknyttet</p>
                  <CreateSupplierModal invoiceId={id} aiData={aiData} />
                </div>
              )}
            </div>
          </div>

          {/* Aktiv kontering */}
          {(account || vatCode) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontering</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {account && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{account.code}</span>
                    <span className="text-xs text-gray-700 truncate">{account.name}</span>
                  </div>
                )}
                {vatCode && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{vatCode.code}</span>
                    <span className="text-xs text-gray-500 truncate">{vatCode.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historik */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historik</span>
            </div>
            <div className="px-4 py-3">
              <ol className="relative border-l border-gray-100 space-y-3 ml-1">
                {[
                  {
                    show: true,
                    color: 'bg-gray-300',
                    label: 'Oprettet',
                    sub: new Date(invoice.created_at).toLocaleDateString('da-DK'),
                  },
                  {
                    show: !!invoice.ai_scanned,
                    color: 'bg-emerald-400',
                    label: 'AI-scannet',
                    sub: invoice.ai_confidence != null ? `Sikkerhed ${Math.round(Number(invoice.ai_confidence))}%` : null,
                  },
                  {
                    show: ['awaiting_approval', 'approved', 'rejected'].includes(invoice.status),
                    color: 'bg-blue-400',
                    label: 'Sendt til godkendelse',
                    sub: assignedApproverName ? `→ ${assignedApproverName}` : (matchedRuleName ?? null),
                  },
                  {
                    show: invoice.status === 'approved',
                    color: 'bg-emerald-500',
                    label: 'Godkendt',
                    sub: invoice.approved_at ? new Date(invoice.approved_at).toLocaleDateString('da-DK') : null,
                  },
         