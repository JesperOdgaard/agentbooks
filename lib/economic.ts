/**
 * e-conomic REST API helper
 * Dokumentation: https://restapi.e-conomic.com/
 */

export const ECONOMIC_BASE = 'https://restapi.e-conomic.com'

export function economicHeaders(appSecret: string, agreementGrant: string): Record<string, string> {
  return {
    'X-AppSecretToken': appSecret,
    'X-AgreementGrantToken': agreementGrant,
    'Content-Type': 'application/json',
  }
}

// ── Typer ──────────────────────────────────────────────────────────────────────

export type EconomicSupplier = {
  supplierNumber: number
  name: string
  email: string | null
  address: string | null
  city: string | null
  zip: string | null
  country: string | null
  phone: string | null
  vatNumber: string | null
  bankAccount?: { bankAccountNumber?: string; bankCode?: string } | null
  paymentTerms?: { paymentTermsNumber?: number } | null
}

export type EconomicBookedSupplierInvoice = {
  bookedInvoiceNumber: number
  date: string
  supplier: { supplierNumber: number }
  grossAmount: number
  netAmount: number
  vatAmount: number
  supplierInvoiceNumber: string | null
  lines: EconomicInvoiceLine[]
}

export type EconomicInvoiceLine = {
  lineNumber: number
  description: string
  quantity: number
  unitCostPrice: number
  totalNetAmount: number
  account: { accountNumber: number }
}

// ── Pagineret hentning ─────────────────────────────────────────────────────────

async function fetchAllPages<T>(
  startUrl: string,
  headers: Record<string, string>,
): Promise<T[]> {
  const items: T[] = []
  let url: string | undefined = startUrl

  while (url) {
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`e-conomic ${res.status}: ${body.slice(0, 200)}`)
    }
    const json = await res.json() as { collection: T[]; pagination?: { nextPage?: string } }
    items.push(...json.collection)
    url = json.pagination?.nextPage
  }

  return items
}

// ── Leverandører ───────────────────────────────────────────────────────────────

export async function fetchAllSuppliers(
  appSecret: string,
  agreementGrant: string,
): Promise<EconomicSupplier[]> {
  return fetchAllPages<EconomicSupplier>(
    `${ECONOMIC_BASE}/suppliers?pageSize=1000`,
    economicHeaders(appSecret, agreementGrant),
  )
}

// ── Kontoplan ──────────────────────────────────────────────────────────────────

export type EconomicAccount = {
  accountNumber: number
  name: string
  accountType: string
}

export async function fetchAllAccounts(
  appSecret: string,
  agreementGrant: string,
): Promise<EconomicAccount[]> {
  return fetchAllPages<EconomicAccount>(
    `${ECONOMIC_BASE}/accounts?pageSize=1000`,
    economicHeaders(appSecret, agreementGrant),
  )
}

// ── Betalingsbetingelser (bruges ved bogføring) ────────────────────────────────

export type EconomicPaymentTerm = {
  paymentTermsNumber: number
  name: string
}

export async function fetchFirstPaymentTerm(
  appSecret: string,
  agreementGrant: string,
): Promise<number | null> {
  try {
    const res = await fetch(`${ECONOMIC_BASE}/payment-terms?pageSize=1`, {
      headers: economicHeaders(appSecret, agreementGrant),
    })
    if (!res.ok) return null
    const json = await res.json() as { collection: EconomicPaymentTerm[] }
    return json.collection[0]?.paymentTermsNumber ?? null
  } catch {
    return null
  }
}

// ── Bogfør leverandørfaktura ───────────────────────────────────────────────────

export type BookSupplierInvoiceParams = {
  appSecret: string
  agreementGrant: string
  supplierNumber: number
  supplierInvoiceNumber: string | null
  date: string           // YYYY-MM-DD
  currency: string
  grossAmount: number
  netAmount: number
  vatAmount: number
  paymentTermsNumber: number
  accountNumber: number  // finanskonto
  description: string
}

export async function bookSupplierInvoice(
  params: BookSupplierInvoiceParams,
): Promise<{ bookedInvoiceNumber: number }> {
  const {
    appSecret, agreementGrant,
    supplierNumber, supplierInvoiceNumber,
    date, currency, grossAmount, netAmount, vatAmount,
    paymentTermsNumber, accountNumber, description,
  } = params

  const body = {
    date,
    currency,
    exchangeRate: 100,
    grossAmount,
    netAmount,
    netAmountInBaseCurrency: netAmount,
    grossAmountInBaseCurrency: grossAmount,
    vatAmount,
    roundingAmount: 0,
    paymentTerms: { paymentTermsNumber },
    supplier: { supplierNumber },
    supplierInvoiceNumber: supplierInvoiceNumber ?? 'UKENDT',
    lines: [
      {
        lineNumber: 1,
        description: description || 'Leverandørfaktura',
        quantity: 1,
        unitCostPrice: netAmount,
        totalNetAmount: netAmount,
        account: { accountNumber },
      },
    ],
  }

  const res = await fetch(`${ECONOMIC_BASE}/supplier-invoices/booked`, {
    method: 'POST',
    headers: economicHeaders(appSecret, agreementGrant),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`e-conomic bogføring fejlede ${res.status}: ${errBody.slice(0, 300)}`)
  }

  const json = await res.json() as { bookedInvoiceNumber: number }
  return { bookedInvoiceNumber: json.bookedInvoiceNumber }
}
