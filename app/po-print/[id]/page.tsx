import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PrintTrigger } from './print-trigger'

function fmt(v: number | null, currency = 'DKK') {
  if (v == null) return '—'
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' ' + currency
}

const statusLabel: Record<string, string> = {
  draft: 'Kladde', open: 'Åben', partially_received: 'Delvist modtaget',
  received: 'Modtaget', cancelled: 'Annulleret',
}

export default async function PrintPOPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('id,po_number,title,status,order_date,expected_delivery,currency,notes,suppliers(name,cvr,email,phone,address)')
    .eq('id', id).single()
  if (!po) notFound()

  const { data: lines } = await supabase
    .from('purchase_order_lines').select('id,description,quantity,unit_price,line_total,sort_order')
    .eq('purchase_order_id', id).order('sort_order', { ascending: true })

  const { data: member } = await supabase
    .from('organization_members').select('organization_id').eq('user_id', user.id).maybeSingle()

  const { data: org } = member?.organization_id
    ? await supabase.from('organizations').select('name,address,cvr,email,phone,postal_code,city,logo_url').eq('id', member.organization_id).single()
    : { data: null }

  const supplier = po.suppliers as { name: string; cvr?: string | null; email?: string | null; phone?: string | null; address?: string | null } | null
  const currency = (po as Record<string,unknown>).currency as string ?? 'DKK'
  const total = (lines ?? []).reduce((s, l) => s + (l.line_total ?? 0), 0)
  const o = org as Record<string,unknown> | null

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #f0f0f0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; }
    .wrap { max-width: 820px; margin: 24px auto; background: white; padding: 36px 40px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .back { font-size: 12px; color: #666; text-decoration: none; display: inline-block; margin-bottom: 18px; }
    .back:hover { color: #111; }
    @media print {
      html, body { background: white; }
      .back { display: none !important; }
      .wrap { box-shadow: none; margin: 0; padding: 20px 24px; }
      * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }

    /* Header */
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .logo { width: 110px; height: 55px; display: flex; align-items: center; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo-ph { font-size: 10px; font-weight: 700; color: #bbb; border: 1px dashed #ddd; padding: 5px 10px; border-radius: 3px; }
    .po-title { flex: 1; text-align: center; font-size: 22px; font-weight: 700; color: #1a1a2e; line-height: 55px; }
    .meta-tbl { text-align: right; font-size: 11px; }
    .meta-tbl table { margin-left: auto; border-collapse: collapse; }
    .meta-tbl td { padding: 2px 5px; }
    .meta-tbl td:first-child { color: #888; }
    .meta-tbl td:last-child { font-weight: 600; }

    /* Company */
    .company { font-size: 11px; color: #555; margin: 4px 0 12px; line-height: 1.6; }

    /* Rule */
    hr.rule { border: none; border-top: 2.5px solid #1a1a2e; margin: 0 0 12px; }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .section-hdr { background: #1a1a2e; color: white; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: 5px 9px; margin-bottom: 7px; }
    .detail { display: flex; gap: 6px; margin-bottom: 3px; font-size: 11px; }
    .dlbl { color: #888; width: 80px; flex-shrink: 0; }
    .dval { font-weight: 500; }

    /* Table */
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
    table.items thead tr { background: #1a1a2e; }
    table.items thead th { color: white; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: 6px 9px; text-align: left; }
    table.items thead th.r { text-align: right; }
    table.items tbody tr { border-bottom: 1px solid #eee; }
    table.items tbody tr:nth-child(even) { background: #fafafa; }
    table.items tbody td { padding: 7px 9px; }
    table.items tbody td.r { text-align: right; }
    table.items tbody td.n { color: #bbb; font-size: 10px; }

    /* Bottom */
    .bottom { display: flex; gap: 14px; align-items: flex-start; }
    .notes { flex: 1; background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; padding: 9px 11px; }
    .notes-hdr { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #aaa; letter-spacing: .06em; margin-bottom: 5px; }
    .totals { min-width: 215px; }
    .trow { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; border-bottom: 1px solid #f0f0f0; }
    .trow.grand { border-top: 2px solid #1a1a2e; border-bottom: none; margin-top: 4px; padding-top: 7px; }
    .trow.grand span { font-size: 14px; font-weight: 700; }

    /* Footer */
    .footer { display: flex; justify-content: space-between; font-size: 10px; color: #bbb; border-top: 1px solid #eee; padding-top: 10px; margin-top: 18px; }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <PrintTrigger />
      <div className="wrap">
        <a href={`/indkoebsordrer/${id}`} className="back">← Tilbage til ordren</a>

        {/* Header */}
        <div className="hdr">
          <div className="logo">
            {o?.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={o.logo_url as string} alt="Logo" />
              : <span className="logo-ph">LOGO</span>}
          </div>
          <div className="po-title">Purchase Order</div>
          <div className="meta-tbl">
            <table><tbody>
              {po.order_date && <tr><td>Dato</td><td>{new Date(po.order_date).toLocaleDateString('da-DK')}</td></tr>}
              <tr><td>PO#</td><td>{po.po_number ?? '—'}</td></tr>
              <tr><td>Status</td><td>{statusLabel[po.status] ?? po.status}</td></tr>
            </tbody></table>
          </div>
        </div>

        {/* Firma */}
        <div className="company">
          <strong>{o?.name as string ?? ''}</strong>
          {o?.cvr ? <> &nbsp;·&nbsp; CVR: {o.cvr as string}</> : null}
          {o?.address ? <><br />{o.address as string}{o?.postal_code ? `, ${o.postal_code as string}` : ''}{o?.city ? ` ${o.city as string}` : ''}</> : null}
          {o?.email ? <><br />{o.email as string}</> : null}
          {o?.phone ? <>&nbsp;·&nbsp;{o.phone as string}</> : null}
        </div>

        <hr className="rule" />

        {/* Info grid */}
        <div className="info-grid">
          <div>
            <div className="section-hdr">Leverandør</div>
            {supplier ? (
              <>
                <div className="detail"><span style={{ fontWeight: 700 }}>{supplier.name}</span></div>
                {supplier.cvr    && <div className="detail"><span className="dlbl">CVR</span><span className="dval">{supplier.cvr}</span></div>}
                {supplier.address && <div className="detail"><span className="dlbl">Adresse</span><span className="dval">{supplier.address}</span></div>}
                {supplier.phone  && <div className="detail"><span className="dlbl">Telefon</span><span className="dval">{supplier.phone}</span></div>}
                {supplier.email  && <div className="detail"><span className="dlbl">E-mail</span><span className="dval">{supplier.email}</span></div>}
              </>
            ) : <div style={{ color: '#aaa', fontSize: '11px' }}>Ingen leverandør</div>}
          </div>
          <div>
            <div className="section-hdr">Ordredetaljer</div>
            {po.order_date       && <div className="detail"><span className="dlbl">Ordredato</span><span className="dval">{new Date(po.order_date).toLocaleDateString('da-DK')}</span></div>}
            {po.expected_delivery && <div className="detail"><span className="dlbl">Levering</span><span className="dval">{new Date(po.expected_delivery).toLocaleDateString('da-DK')}</span></div>}
            <div className="detail"><span className="dlbl">Valuta</span><span className="dval">{currency}</span></div>
            {po.title            && <div className="detail"><span className="dlbl">Titel</span><span className="dval">{po.title}</span></div>}
          </div>
        </div>

        {/* Linjer */}
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '53%' }}>Varebeskrivelse</th>
              <th className="r" style={{ width: '10%' }}>Antal</th>
              <th className="r" style={{ width: '16%' }}>Enhedspris</th>
              <th className="r" style={{ width: '16%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(lines ?? []).map((line, i) => (
              <tr key={line.id ?? i}>
                <td className="n">{i + 1}</td>
                <td>{line.description ?? '—'}</td>
                <td className="r">{line.quantity ?? '—'}</td>
                <td className="r">{fmt(line.unit_price, currency)}</td>
                <td className="r" style={{ fontWeight: 600 }}>{fmt(line.line_total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bund */}
        <div className="bottom">
          <div className="notes">
            <div className="notes-hdr">Kommentarer og særlige instrukser</div>
            <div style={{ fontSize: '11px', color: po.notes ? '#333' : '#bbb' }}>{po.notes ?? '—'}</div>
          </div>
          <div className="totals">
            <div className="trow"><span>Subtotal</span><span>{fmt(total, currency)}</span></div>
            <div className="trow"><span>Moms (25%)</span><span>{fmt(total * 0.25, currency)}</span></div>
            <div className="trow grand"><span>Total</span><span>{fmt(total * 1.25, currency)}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <span>{new Date().toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <span>{o?.name as string ?? ''}</span>
        </div>
      </div>
    </>
  )
}
