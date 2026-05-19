import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PrintTrigger } from './print-trigger'

function fmt(amount: number | null, currency = 'DKK') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency
}

const statusLabel: Record<string, string> = {
  draft: 'Kladde',
  open: 'Åben',
  partially_received: 'Delvist modtaget',
  received: 'Modtaget',
  cancelled: 'Annulleret',
}

export default async function PrintPOPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: po } = await supabase
    .from('purchase_orders')
    .select(`
      id, po_number, title, status, order_date, expected_delivery,
      currency, total_amount, notes, created_at,
      suppliers(name, cvr, email, phone, address)
    `)
    .eq('id', id)
    .single()

  if (!po) notFound()

  const { data: lines } = await supabase
    .from('purchase_order_lines')
    .select('id, description, quantity, unit_price, line_total, sort_order')
    .eq('purchase_order_id', id)
    .order('sort_order', { ascending: true })

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: org } = member?.organization_id
    ? await supabase.from('organizations').select('name, address, cvr, email').eq('id', member.organization_id).single()
    : { data: null }

  const supplier = po.suppliers as {
    name: string; cvr?: string | null; email?: string | null; phone?: string | null; address?: string | null
  } | null

  const currency = (po as Record<string, unknown>).currency as string ?? 'DKK'
  const computedTotal = (lines ?? []).reduce((sum, l) => sum + (l.line_total ?? 0), 0)

  return (
    <>
      <PrintTrigger />
      <div className="print-page">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; color: #111827; background: white; }
          .print-page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
          .no-print { margin-bottom: 24px; }
          @media print {
            .no-print { display: none !important; }
            .print-page { padding: 24px; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .company-name { font-size: 22px; font-weight: 700; color: #111827; }
          .company-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .po-title { text-align: right; }
          .po-label { font-size: 28px; font-weight: 700; color: #10B981; }
          .po-number { font-size: 14px; color: #6b7280; margin-top: 4px; font-family: monospace; }
          .status-badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px; background: #d1fae5; color: #065f46; margin-top: 6px; }
          .divider { border: none; border-top: 2px solid #10B981; margin: 0 0 32px 0; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
          .meta-section h3 { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 10px; }
          .meta-row { margin-bottom: 6px; }
          .meta-label { font-size: 11px; color: #6b7280; }
          .meta-value { font-size: 13px; font-weight: 500; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { background: #f9fafb; border-bottom: 2px solid #e5e7eb; }
          th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 10px 12px; text-align: left; }
          th:last-child, th:nth-last-child(2), th:nth-last-child(3) { text-align: right; }
          td { font-size: 13px; padding: 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
          td:last-child, td:nth-last-child(2), td:nth-last-child(3) { text-align: right; }
          .total-row { display: flex; justify-content: flex-end; gap: 0; margin-top: 8px; }
          .total-box { background: #f0fdf4; border: 1.5px solid #10B981; border-radius: 10px; padding: 16px 24px; min-width: 240px; }
          .total-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
          .total-amount { font-size: 22px; font-weight: 700; color: #065f46; }
          .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 24px; }
          .notes-label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
          .notes-text { font-size: 13px; color: #374151; line-height: 1.6; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
        `}</style>

        {/* Back + Print knapper */}
        <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <a href={`/indkoebsordrer/${id}`} style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>← Tilbage</a>
        </div>

        {/* Header */}
        <div className="header">
          <div>
            <div className="company-name">{(org as Record<string,unknown>|null)?.name as string ?? 'Din virksomhed'}</div>
            <div className="company-sub">
              {(org as Record<string,unknown>|null)?.cvr ? `CVR: ${(org as Record<string,unknown>).cvr}` : ''}
              {(org as Record<string,unknown>|null)?.email ? ` · ${(org as Record<string,unknown>).email}` : ''}
            </div>
          </div>
          <div className="po-title">
            <div className="po-label">INDKØBSORDRE</div>
            <div className="po-number">{po.po_number ?? '—'}</div>
            <div className="status-badge">{statusLabel[po.status] ?? po.status}</div>
          </div>
        </div>

        <hr className="divider" />

        {/* Meta */}
        <div className="meta-grid">
          <div className="meta-section">
            <h3>Leverandør</h3>
            {supplier ? (
              <>
                <div className="meta-row">
                  <div className="meta-value">{supplier.name}</div>
                </div>
                {supplier.cvr && <div className="meta-row"><div className="meta-label">CVR: {supplier.cvr}</div></div>}
                {supplier.email && <div className="meta-row"><div className="meta-label">{supplier.email}</div></div>}
                {supplier.phone && <div className="meta-row"><div className="meta-label">{supplier.phone}</div></div>}
                {supplier.address && <div className="meta-row"><div className="meta-label">{supplier.address}</div></div>}
              </>
            ) : (
              <div className="meta-label">Ingen leverandør tilknyttet</div>
            )}
          </div>
          <div className="meta-section">
            <h3>Ordredetaljer</h3>
            {po.order_date && (
              <div className="meta-row">
                <div className="meta-label">Ordredato</div>
                <div className="meta-value">{new Date(po.order_date).toLocaleDateString('da-DK')}</div>
              </div>
            )}
            {po.expected_delivery && (
              <div className="meta-row">
                <div className="meta-label">Forventet levering</div>
                <div className="meta-value">{new Date(po.expected_delivery).toLocaleDateString('da-DK')}</div>
              </div>
            )}
            <div className="meta-row">
              <div className="meta-label">Valuta</div>
              <div className="meta-value">{currency}</div>
            </div>
            {po.title && (
              <div className="meta-row">
                <div className="meta-label">Titel</div>
                <div className="meta-value">{po.title}</div>
              </div>
            )}
          </div>
        </div>

        {/* Linjer */}
        <table>
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Beskrivelse</th>
              <th>Antal</th>
              <th>Enhedspris</th>
              <th>Linjetotal</th>
            </tr>
          </thead>
          <tbody>
            {(lines ?? []).map((line, i) => (
              <tr key={line.id ?? i}>
                <td>{line.description ?? '—'}</td>
                <td style={{ textAlign: 'right' }}>{line.quantity ?? '—'}</td>
                <td style={{ textAlign: 'right' }}>{fmt(line.unit_price, currency)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(line.line_total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="total-row">
          <div className="total-box">
            <div className="total-label">Total ekskl. moms</div>
            <div className="total-amount">{fmt(computedTotal, currency)}</div>
          </div>
        </div>

        {/* Noter */}
        {po.notes && (
          <div className="notes-box">
            <div className="notes-label">Noter</div>
            <div className="notes-text">{po.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <span>Genereret {new Date().toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <span>{po.po_number ?? ''}</span>
        </div>
      </div>
    </>
  )
}
