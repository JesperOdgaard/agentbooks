'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateInvoiceDetails } from '../actions'

interface Account    { id: string; code: string; name: string }
interface VatCode    { id: string; code: string; name: string; rate: number | null }
interface Department { id: string; name: string }
interface Project    { id: string; name: string }

interface Props {
  invoiceId: string
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  amountExclVat: number | null
  vatAmount: number | null
  amountInclVat: number | null
  currency: string | null
  accountId: string | null
  vatCodeId: string | null
  departmentId: string | null
  projectId: string | null
  notes: string | null
  accounts: Account[]
  vatCodes: VatCode[]
  departments: Department[]
  projects: Project[]
}

const CURRENCIES = ['DKK', 'EUR', 'USD', 'SEK', 'NOK', 'GBP']

function fmt(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' kr.'
}
function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('da-DK') : '—'
}
function toInputDate(d: string | null) {
  return d ? d.slice(0, 10) : ''
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}

function InputField({ label, name, type = 'text', defaultValue, suffix, placeholder }: {
  label: string; name: string; type?: string; defaultValue?: string | number; suffix?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input name={name} type={type} step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
        />
        {suffix && <span className="absolute right-2 top-1.5 text-[11px] text-gray-400">{suffix}</span>}
      </div>
    </div>
  )
}

function SelectField({ label, name, defaultValue, options }: {
  label: string; name: string; defaultValue: string; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-[11px] text-gray-400 mb-1">{label}</label>
      <select name={name} defaultValue={defaultValue}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
        <option value="">— Ingen —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function InvoiceEditForm({
  invoiceId, invoiceNumber, invoiceDate, dueDate,
  amountExclVat, vatAmount, amountInclVat, currency,
  accountId, vatCodeId, departmentId, projectId, notes,
  accounts, vatCodes, departments, projects,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const account    = accounts.find((a) => a.id === accountId)
  const vatCode    = vatCodes.find((v) => v.id === vatCodeId)
  const department = departments.find((d) => d.id === departmentId)
  const project    = projects.find((p) => p.id === projectId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const r = await updateInvoiceDetails(invoiceId, new FormData(e.currentTarget))
    if (r.error) setError(r.error)
    else setEditing(false)
    setLoading(false)
  }

  // ── View mode ─────────────────────────────────────────────
  if (!editing) return (
    <div>
      {/* Beløb — 3 tal prominent */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">Ekskl. moms</p>
          <p className="text-sm font-semibold text-gray-800">{fmt(amountExclVat)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">Moms</p>
          <p className="text-sm font-semibold text-gray-800">{fmt(vatAmount)}</p>
        </div>
        <div className="bg-emerald-50 ring-1 ring-emerald-100 rounded-lg px-3 py-2.5 text-center">
          <p className="text-[10px] text-emerald-600 mb-0.5">Total</p>
          <p className="text-sm font-bold text-emerald-700">{fmt(amountInclVat)}</p>
        </div>
      </div>

      {/* Øvrige felter som rows */}
      <Row label="Fakturanr." value={invoiceNumber ?? '—'} />
      <Row label="Fakturadato" value={fmtDate(invoiceDate)} />
      <Row
        label="Forfaldsdato"
        value={
          <span className={dueDate && new Date(dueDate) < new Date() ? 'text-red-500' : ''}>
            {fmtDate(dueDate)}
          </span>
        }
      />
      {currency && currency !== 'DKK' && <Row label="Valuta" value={currency} />}
      <Row
        label="Konto"
        value={account ? <span className="font-mono text-gray-600">{account.code} · {account.name}</span> : '—'}
      />
      <Row
        label="Momskode"
        value={vatCode ? <span className="font-mono text-gray-600">{vatCode.code}</span> : '—'}
      />
      {department && <Row label="Afdeling" value={department.name} />}
      {project    && <Row label="Projekt"   value={project.name}    />}
      {notes      && <Row label="Noter"     value={<span className="italic text-gray-500">{notes}</span>} />}

      <button onClick={() => setEditing(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-gray-200">
        <Pencil size={11} /> Rediger
      </button>
    </div>
  )

  // ── Edit mode ─────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Beløb */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Beløb</p>
        <div className="grid grid-cols-3 gap-2">
          <InputField label="Ekskl. moms" name="amount_excl_vat" type="number" defaultValue={amountExclVat ?? ''} suffix="kr." />
          <InputField label="Momsbeløb"   name="vat_amount"      type="number" defaultValue={vatAmount ?? ''}    suffix="kr." />
          <InputField label="Inkl. moms"  name="amount_incl_vat" type="number" defaultValue={amountInclVat ?? ''} suffix="kr." />
        </div>
        <div className="mt-2 w-28">
          <label className="block text-[11px] text-gray-400 mb-1">Valuta</label>
          <select name="currency" defaultValue={currency ?? 'DKK'}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Datoer */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Datoer</p>
        <div className="grid grid-cols-3 gap-2">
          <InputField label="Fakturanr." name="invoice_number" defaultValue={invoiceNumber ?? ''} />
          <InputField label="Fakturadato" name="invoice_date" type="date" defaultValue={toInputDate(invoiceDate)} />
          <InputField label="Forfaldsdato" name="due_date" type="date" defaultValue={toInputDate(dueDate)} />
        </div>
      </div>

      {/* Kontering */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Kontering</p>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Konto" name="account_id" defaultValue={accountId ?? ''}
            options={accounts.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))} />
          <SelectField label="Momskode" name="vat_code_id" defaultValue={vatCodeId ?? ''}
            options={vatCodes.map((v) => ({ value: v.id, label: `${v.code} · ${v.name}` }))} />
          {departments.length > 0 && (
            <SelectField label="Afdeling" name="department_id" defaultValue={departmentId ?? ''}
              options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          )}
          {projects.length > 0 && (
            <SelectField label="Projekt" name="project_id" defaultValue={projectId ?? ''}
              options={projects.map((p) => ({ value: p.id, label: p.name }))} />
          )}
        </div>
      </div>

      {/* Noter */}
      <div>
        <label className="block text-[11px] text-gray-400 mb-1">Noter</label>
        <textarea name="notes" defaultValue={notes ?? ''} rows={2} placeholder="Interne noter..."
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          <Check size={12} /> {loading ? 'Gemmer...' : 'Gem'}
        </button>
        <button type="button" onClick={() => { setEditing(false); setError(null) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-medium rounded-lg transition-colors">
          <X size={12} /> Annuller
        </button>
      </div>
    </form>
  )
}
