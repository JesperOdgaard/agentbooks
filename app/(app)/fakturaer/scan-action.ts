'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ExtractedInvoice {
  invoice_number: string | null
  invoice_date: string | null      // YYYY-MM-DD
  due_date: string | null          // YYYY-MM-DD
  supplier_name: string | null
  supplier_cvr: string | null      // 8 cifre
  supplier_email: string | null
  supplier_address: string | null
  amount_excl_vat: number | null
  vat_amount: number | null
  amount_incl_vat: number | null
  currency: string | null
  line_items: Array<{
    description: string
    quantity: number | null
    unit_price: number | null
    line_total: number | null
  }>
  // Kontering-forslag
  suggested_account_code: string | null
  suggested_vat_code: string | null
  kontering_confidence: number | null  // 0-100
  kontering_reasoning: string | null
}

export async function scanInvoiceWithAI(
  invoiceId: string,
): Promise<{ success?: boolean; skipped?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind' }

  // Hent org og plan
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member?.organization_id) return { error: 'Ingen organisation' }

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', member.organization_id)
    .single()

  // Starter-plan har ingen AI-scanning
  if (!org || org.plan === 'starter') {
    return { skipped: true }
  }

  // Hent fakturapost
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, file_url, file_type')
    .eq('id', invoiceId)
    .single()

  if (!invoice?.file_url) return { error: 'Ingen fil fundet' }

  // Hent signed URL
  const { data: urlData } = await supabase.storage
    .from('invoices')
    .createSignedUrl(invoice.file_url, 300)

  if (!urlData?.signedUrl) return { error: 'Kunne ikke hente fil-URL' }

  // Download filen
  const fileResponse = await fetch(urlData.signedUrl)
  if (!fileResponse.ok) return { error: 'Kunne ikke downloade filen' }

  const buffer = await fileResponse.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const ext = invoice.file_url.split('.').pop()?.toLowerCase() ?? 'pdf'
  const isPdf = ext === 'pdf'
  const mediaType = isPdf ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`

  // Hent kontoplan og momskoder til AI-forslag
  const { data: accounts } = await supabase
    .from('accounts')
    .select('code, name, type')
    .order('code')

  const { data: vatCodes } = await supabase
    .from('vat_codes')
    .select('code, name, rate')
    .order('code')

  const accountList = accounts
    ? accounts.map((a) => `${a.code} – ${a.name} (${a.type})`).join('\n')
    : 'Ingen kontoplan tilgængelig'

  const vatList = vatCodes
    ? vatCodes.map((v) => `${v.code} – ${v.name} (${v.rate}%)`).join('\n')
    : 'Ingen momskoder tilgængelig'

  // Byg Claude API request
  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }

  const prompt = `Du er en ekspert i faktura-OCR og dansk bogholderi. Ekstraher følgende felter fra fakturaen og returner KUN gyldig JSON – ingen forklaring, ingen markdown.

Tilgængelig kontoplan:
${accountList}

Tilgængelige momskoder:
${vatList}

JSON-skema:
{
  "invoice_number": "string eller null",
  "invoice_date": "YYYY-MM-DD eller null",
  "due_date": "YYYY-MM-DD eller null",
  "supplier_name": "string eller null",
  "supplier_cvr": "8-cifret CVR-nummer som string eller null",
  "supplier_email": "string eller null",
  "supplier_address": "string eller null",
  "amount_excl_vat": number eller null,
  "vat_amount": number eller null,
  "amount_incl_vat": number eller null,
  "currency": "DKK/EUR/USD/SEK/NOK/GBP eller null",
  "line_items": [{"description": "string", "quantity": number, "unit_price": number, "line_total": number}],
  "suggested_account_code": "kontonummer fra kontoplanen (f.eks. '6030') eller null",
  "suggested_vat_code": "momskode (f.eks. 'DK25') eller null",
  "kontering_confidence": number fra 0 til 100 (hvor sikker er du på konteringen),
  "kontering_reasoning": "kort forklaring på dansk (maks 100 tegn) af hvorfor du valgte denne konto"
}

Regler:
- Beløb skal være tal (ikke strenge) uden valutasymbol
- Datoer skal formateres som YYYY-MM-DD
- CVR er typisk "CVR" eller "SE-nr" efterfulgt af 8 cifre
- Hvis feltet ikke kan aflæses, brug null
- line_items kan være tom array hvis ingen linjer er synlige
- Vælg KUN konto og momskode fra listerne ovenfor — brug det præcise kontonummer
- Sæt kontering_confidence til 0 hvis du er usikker, 100 hvis du er helt sikker`

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: prompt }],
        },
      ],
    }),
  })

  if (!apiResponse.ok) {
    const err = await apiResponse.text()
    return { error: `Claude API fejl: ${apiResponse.status} – ${err.slice(0, 200)}` }
  }

  const apiData = await apiResponse.json() as {
    content: Array<{ type: string; text?: string }>
  }

  const rawText = apiData.content.find((c) => c.type === 'text')?.text ?? ''

  let extracted: ExtractedInvoice
  try {
    // Fjern evt. markdown-blokke
    const jsonStr = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    extracted = JSON.parse(jsonStr) as ExtractedInvoice
  } catch {
    return { error: `Kunne ikke parse AI-svar: ${rawText.slice(0, 200)}` }
  }

  // Prøv at matche leverandør på CVR eller navn
  let supplierId: string | null = null
  if (extracted.supplier_cvr || extracted.supplier_name) {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, cvr')

    if (suppliers && suppliers.length > 0) {
      // Prioritér CVR-match
      const cvrMatch = extracted.supplier_cvr
        ? suppliers.find((s) => s.cvr === extracted.supplier_cvr)
        : null

      const nameMatch = extracted.supplier_name
        ? suppliers.find(
            (s) => s.name.toLowerCase() === extracted.supplier_name!.toLowerCase(),
          )
        : null

      supplierId = cvrMatch?.id ?? nameMatch?.id ?? null
    }

    // Opret ny leverandør hvis ingen match
    if (!supplierId && extracted.supplier_name) {
      const { data: newSupplier } = await supabase
        .from('suppliers')
        .insert({
          organization_id: member.organization_id,
          name: extracted.supplier_name,
          cvr: extracted.supplier_cvr ?? null,
          email: extracted.supplier_email ?? null,
          address: extracted.supplier_address ?? null,
          status: 'active',
        })
        .select('id')
        .single()

      supplierId = newSupplier?.id ?? null
    }
  }

  // Hjælpefunktioner til at sikre gyldige tal inden DB-indsættelse
  function safeAmount(val: number | null | undefined): number | null {
    if (val == null || !isFinite(val) || isNaN(val)) return null
    // numeric(15,2) max er 9_999_999_999_999.99
    if (Math.abs(val) > 9_999_999_999_999.99) return null
    return Math.round(val * 100) / 100
  }

  function safeConfidence(val: number | null | undefined): number | null {
    if (val == null || !isFinite(val) || isNaN(val)) return null
    return Math.max(0, Math.min(100, Math.round(val)))
  }

  function safeQuantity(val: number | null | undefined): number {
    if (val == null || !isFinite(val) || isNaN(val) || val <= 0) return 1
    if (val > 9_999_999) return 1
    return Math.round(val * 1000) / 1000   // numeric(10,3)
  }

  // Find account_id og vat_code_id ud fra foreslåede koder
  let suggestedAccountId: string | null = null
  let suggestedVatCodeId: string | null = null

  if (extracted.suggested_account_code && accounts) {
    const { data: matchedAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('code', extracted.suggested_account_code)
      .maybeSingle()
    suggestedAccountId = matchedAccount?.id ?? null
  }

  if (extracted.suggested_vat_code && vatCodes) {
    const { data: matchedVat } = await supabase
      .from('vat_codes')
      .select('id')
      .eq('code', extracted.suggested_vat_code)
      .maybeSingle()
    suggestedVatCodeId = matchedVat?.id ?? null
  }

  // Opdatér faktura med ekstraherede felter — kontering sættes direkte
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      invoice_number: extracted.invoice_number ?? null,
      invoice_date: extracted.invoice_date ?? null,
      due_date: extracted.due_date ?? null,
      supplier_id: supplierId,
      amount_excl_vat: safeAmount(extracted.amount_excl_vat),
      vat_amount: safeAmount(extracted.vat_amount),
      amount_incl_vat: safeAmount(extracted.amount_incl_vat),
      currency: extracted.currency ?? 'DKK',
      // Kontering forudfyldes automatisk af AI
      account_id: suggestedAccountId,
      vat_code_id: suggestedVatCodeId,
      ai_scanned: true,
      ai_data: {
        ...extracted,
        suggested_account_id: suggestedAccountId,
        suggested_vat_code_id: suggestedVatCodeId,
      } as unknown as Record<string, unknown>,
      ai_confidence: safeConfidence(extracted.kontering_confidence),
    })
    .eq('id', invoiceId)

  if (updateError) return { error: `Kunne ikke gemme AI-data: ${updateError.message}` }

  // Indsæt linjelinier hvis tilgængelige
  if (extracted.line_items && extracted.line_items.length > 0) {
    await supabase.from('invoice_line_items').insert(
      extracted.line_items.map((li) => ({
        invoice_id: invoiceId,
        description: li.description ?? '',
        quantity: safeQuantity(li.quantity),
        unit_price: safeAmount(li.unit_price) ?? 0,
        line_total: safeAmount(li.line_total) ?? 0,
      })),
    )
  }

  revalidatePath(`/fakturaer/${invoiceId}`)
  revalidatePath('/fakturaer')
  return { success: true }
}
