'use client'

interface MonthlyData {
  month: string
  beloeb: number
  antal: number
}

interface StatusData {
  name: string
  value: number
  color: string
}

interface TopSupplier {
  name: string
  total: number
}

interface AccountBreakdown {
  code: string
  name: string
  total: number
}

interface Props {
  monthlyData: MonthlyData[]
  statusData: StatusData[]
  topSuppliers: TopSupplier[]
  accountBreakdown: AccountBreakdown[]
}

function formatShort(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`
  return `${amount.toFixed(0)}`
}

function formatDKKFull(amount: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function BarChartSVG({ data }: { data: MonthlyData[] }) {
  const W = 560
  const H = 180
  const PAD = { top: 10, right: 10, bottom: 28, left: 50 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...data.map((d) => d.beloeb), 1)
  const barW = chartW / data.length
  const barPad = barW * 0.25

  const yTicks = 4
  const yStep = maxVal / yTicks

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = yStep * i
        const y = PAD.top + chartH - (chartH * i) / yTicks
        return (
          <g key={i}>
            <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {formatShort(val)}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const barH = maxVal > 0 ? (d.beloeb / maxVal) * chartH : 0
        const x = PAD.left + i * barW + barPad / 2
        const y = PAD.top + chartH - barH
        const w = barW - barPad

        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={barH} fill="#10b981" rx={3} ry={3} />
            <title>{`${d.month}: ${formatDKKFull(d.beloeb)}`}</title>
            <text x={x + w / 2} y={PAD.top + chartH + 16} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {d.month}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChartSVG({ data }: { data: StatusData[] }) {
  const filtered = data.filter((d) => d.value > 0)
  const total = filtered.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const cx = 75
  const cy = 75
  const R = 55
  const r = 35

  let cumAngle = -Math.PI / 2
  const slices = filtered.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI
    const startAngle = cumAngle
    cumAngle += angle
    return { ...d, startAngle, angle }
  })

  function arcPath(startAngle: number, angle: number) {
    const x1 = cx + R * Math.cos(startAngle)
    const y1 = cy + R * Math.sin(startAngle)
    const x2 = cx + R * Math.cos(startAngle + angle)
    const y2 = cy + R * Math.sin(startAngle + angle)
    const ix1 = cx + r * Math.cos(startAngle)
    const iy1 = cy + r * Math.sin(startAngle)
    const ix2 = cx + r * Math.cos(startAngle + angle)
    const iy2 = cy + r * Math.sin(startAngle + angle)
    const large = angle > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`
  }

  return (
    <svg viewBox="0 0 150 150" className="w-full" style={{ maxWidth: 150 }}>
      {slices.map((s, i) => (
        <path key={i} d={arcPath(s.startAngle, s.angle)} fill={s.color}>
          <title>{`${s.name}: ${s.value}`}</title>
        </path>
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight="700" fill="#111827">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#9ca3af">
        fakturaer
      </text>
    </svg>
  )
}

const ACCOUNT_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46']

export function DashboardCharts({ monthlyData, statusData, topSuppliers, accountBreakdown }: Props) {
  const hasMonthlyData = monthlyData.some((d) => d.beloeb > 0)
  const hasStatusData = statusData.some((d) => d.value > 0)
  const hasAccountData = accountBreakdown.length > 0
  const hasSupplierData = topSuppliers.length > 0

  return (
    <div className="space-y-4">
      {/* Række 1: Søjlediagram + Status */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fakturabeløb — seneste 6 måneder</span>
          </div>
          <div className="px-4 py-4">
            {hasMonthlyData ? (
              <BarChartSVG data={monthlyData} />
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Ingen data endnu</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fakturastatus</span>
          </div>
          <div className="px-4 py-4">
            {hasStatusData ? (
              <div className="flex flex-col items-center gap-3">
                <DonutChartSVG data={statusData} />
                <div className="w-full space-y-1.5">
                  {statusData
                    .filter((d) => d.value > 0)
                    .map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-[11px] text-gray-600">{d.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-900">{d.value}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Ingen fakturaer endnu</div>
            )}
          </div>
        </div>
      </div>

      {/* Række 2: Udgifter per konto + Top leverandører */}
      <div className="grid grid-cols-3 gap-4">

        {/* Udgifter per konto — indeværende år */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Udgiftsfordeling per konto — {new Date().getFullYear()}
            </span>
          </div>
          <div className="px-5 py-4">
            {hasAccountData ? (
              <div className="space-y-3">
                {accountBreakdown.map((a, i) => {
                  const max = accountBreakdown[0].total
                  const pct = max > 0 ? (a.total / max) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }} />
                      <span className="text-[11px] font-mono text-gray-400 w-8 flex-shrink-0">{a.code}</span>
                      <span className="text-xs text-gray-700 w-36 truncate flex-shrink-0">{a.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-800 w-28 text-right tabular-nums flex-shrink-0">
                        {formatDKKFull(a.total)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                Ingen fakturaer med kontering i år
              </div>
            )}
          </div>
        </div>

        {/* Top leverandører */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top leverandører</span>
          </div>
          <div className="px-4 py-4">
            {hasSupplierData ? (
              <div className="space-y-3">
                {topSuppliers.map((s, i) => {
                  const max = topSuppliers[0].total
                  const pct = max > 0 ? (s.total / max) * 100 : 0
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] text-gray-400 w-3 flex-shrink-0">{i + 1}</span>
                          <span className="text-xs font-medium text-gray-800 truncate">{s.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 flex-shrink-0 tabular-nums">{formatShort(s.total)}</span>
                      </div>
                      <div className="ml-4 bg-gray-100 rounded-full h-1 overflow-hidden">
                        <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Ingen data endnu</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
