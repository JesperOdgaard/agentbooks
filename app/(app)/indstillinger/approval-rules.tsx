'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react'
import {
  createApprovalRule,
  updateApprovalRule,
  toggleApprovalRule,
  deleteApprovalRule,
} from './approval-rules-actions'

interface Member {
  user_id: string
  full_name: string | null
  email: string | null
  role: string
}

interface Department {
  id: string
  name: string
}

interface ApprovalRule {
  id: string
  name: string
  amount_min: number | null
  amount_max: number | null
  approver_user_id: string | null
  department_id: string | null
  priority: number | null
  is_active: boolean | null
}

interface ApprovalRulesProps {
  rules: ApprovalRule[]
  members: Member[]
  departments: Department[]
}

function formatAmount(val: number | null) {
  if (val == null) return ''
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 0 }).format(val)
}

function RuleForm({
  members,
  departments,
  initial,
  onSave,
  onCancel,
}: {
  members: Member[]
  departments: Department[]
  initial?: ApprovalRule
  onSave: (fd: FormData) => Promise<void>
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    await onSave(fd).catch((err: unknown) => setError(String(err)))
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Navn */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Regelnavn</label>
          <input
            name="name"
            defaultValue={initial?.name ?? ''}
            required
            placeholder="f.eks. Fakturaer over 10.000 kr."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Beløbsinterval */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Minimumsbeløb (inkl. moms)</label>
          <div className="relative">
            <input
              name="amount_min"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.amount_min ?? 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-10"
            />
            <span className="absolute right-3 top-2 text-xs text-gray-400">kr.</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Maksimumsbeløb (valgfrit)</label>
          <div className="relative">
            <input
              name="amount_max"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.amount_max ?? ''}
              placeholder="Ingen grænse"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-10"
            />
            <span className="absolute right-3 top-2 text-xs text-gray-400">kr.</span>
          </div>
        </div>

        {/* Godkender */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tildel godkender</label>
          <select
            name="approver_user_id"
            defaultValue={initial?.approver_user_id ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            <option value="">— Ingen specifik godkender —</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name ?? m.email ?? m.user_id}
              </option>
            ))}
          </select>
        </div>

        {/* Afdeling */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Afdeling (valgfrit)</label>
          <select
            name="department_id"
            defaultValue={initial?.department_id ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            <option value="">— Alle afdelinger —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Prioritet */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Prioritet <span className="font-normal text-gray-400">(høj = matches først)</span>
          </label>
          <input
            name="priority"
            type="number"
            min="0"
            defaultValue={initial?.priority ?? 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Check size={14} />
          {loading ? 'Gemmer...' : 'Gem regel'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
        >
          <X size={14} />
          Annuller
        </button>
      </div>
    </form>
  )
}

export function ApprovalRules({ rules: initialRules, members, departments }: ApprovalRulesProps) {
  const [rules, setRules] = useState(initialRules)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function getMemberName(userId: string | null) {
    if (!userId) return null
    const m = members.find((x) => x.user_id === userId)
    return m?.full_name ?? m?.email ?? userId
  }

  function getDeptName(deptId: string | null) {
    if (!deptId) return null
    return departments.find((d) => d.id === deptId)?.name ?? null
  }

  async function handleCreate(fd: FormData) {
    const result = await createApprovalRule(fd)
    if (result.error) throw new Error(result.error)
    setShowCreate(false)
    // Reload rules via revalidation — page will re-render server-side
    window.location.reload()
  }

  async function handleUpdate(ruleId: string, fd: FormData) {
    const result = await updateApprovalRule(ruleId, fd)
    if (result.error) throw new Error(result.error)
    setEditingId(null)
    window.location.reload()
  }

  async function handleToggle(rule: ApprovalRule) {
    const newVal = !rule.is_active
    const result = await toggleApprovalRule(rule.id, newVal)
    if (result.error) { setError(result.error); return }
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: newVal } : r))
  }

  async function handleDelete(ruleId: string) {
    if (!confirm('Slet denne godkendelsesregel?')) return
    const result = await deleteApprovalRule(ruleId)
    if (result.error) { setError(result.error); return }
    setRules((prev) => prev.filter((r) => r.id !== ruleId))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Godkendelsesregler</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Fakturaer routes automatisk til den rigtige godkender baseret på beløb og afdeling.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            Ny regel
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {showCreate && (
        <RuleForm
          members={members}
          departments={departments}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {rules.length === 0 && !showCreate ? (
        <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          Ingen regler oprettet endnu
        </div>
      ) : (
        <div className="space-y-2">
          {[...rules]
            .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
            .map((rule) => (
            <div key={rule.id}>
              {editingId === rule.id ? (
                <RuleForm
                  members={members}
                  departments={departments}
                  initial={rule}
                  onSave={(fd) => handleUpdate(rule.id, fd)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
                  rule.is_active
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-50 border-gray-100 opacity-60'
                }`}>
                  {/* Prioritet badge */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-600">{rule.priority ?? 0}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                      {!rule.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inaktiv</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {formatAmount(rule.amount_min)} kr.
                        {rule.amount_max != null
                          ? ` – ${formatAmount(rule.amount_max)} kr.`
                          : ' og op'}
                      </span>
                      {getDeptName(rule.department_id) && (
                        <>
                          <ChevronRight size={10} className="text-gray-300" />
                          <span className="text-xs text-gray-500">{getDeptName(rule.department_id)}</span>
                        </>
                      )}
                      {getMemberName(rule.approver_user_id) && (
                        <>
                          <ChevronRight size={10} className="text-gray-300" />
                          <span className="text-xs text-emerald-600 font-medium">
                            → {getMemberName(rule.approver_user_id)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Handlinger */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title={rule.is_active ? 'Deaktiver' : 'Aktiver'}
                    >
                      {rule.is_active
                        ? <ToggleRight size={16} className="text-emerald-500" />
                        : <ToggleLeft size={16} />
                      }
                    </button>
                    <button
                      onClick={() => setEditingId(rule.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Rediger"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Slet"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
