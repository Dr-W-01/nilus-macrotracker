import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import {
  StatsSectionCard,
  StatsSectionHeader,
} from '@/components/stats/StatsSectionCard'
import {
  buildPeriodComparison,
  formatComparisonDelta,
  formatComparisonValue,
  isComparisonDeltaImproving,
} from '@/lib/periodComparison'
import type { GoalMode } from '@/lib/types'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PeriodComparisonCardProps {
  range: { start: string; end: string }
  prevRange: { start: string; end: string }
  statsPeriod: 'week' | 'month' | 'custom'
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  goalMode: GoalMode
}

export function PeriodComparisonCard({
  range,
  prevRange,
  statsPeriod,
  dailyLogs,
  foodLibrary,
  settings,
  goalMode,
}: PeriodComparisonCardProps) {
  const { periodLabel, rows } = buildPeriodComparison(
    range,
    prevRange,
    dailyLogs,
    foodLibrary,
    settings,
    statsPeriod,
  )

  if (rows.length === 0) return null

  return (
    <StatsSectionCard contentClassName="space-y-3">
      <StatsSectionHeader
        title="Period averages"
        description={`This period vs ${periodLabel}. Daily averages for logged days (— if not tracked).`}
      />
      <div className="space-y-2">
        {rows.map((r) => (
          <ComparisonRow key={r.label} row={r} goalMode={goalMode} />
        ))}
      </div>
    </StatsSectionCard>
  )
}

function ComparisonRow({
  row,
  goalMode,
}: {
  row: ReturnType<typeof buildPeriodComparison>['rows'][number]
  goalMode: GoalMode
}) {
  const deltaText = formatComparisonDelta(row.delta, row.format)
  const improving = isComparisonDeltaImproving(row.label, row.delta, goalMode)

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        row.emphasized ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-secondary/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
        {row.delta != null && (
          <DeltaBadge delta={row.delta} improving={improving} label={deltaText ?? '—'} />
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">This period</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatComparisonValue(row.current, row.format, row.weightUnit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Last period</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatComparisonValue(row.previous, row.format, row.weightUnit)}
          </p>
        </div>
      </div>
    </div>
  )
}

function DeltaBadge({
  delta,
  improving,
  label,
}: {
  delta: number
  improving: boolean | null
  label: string
}) {
  if (delta === 0 || improving == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs tabular-nums text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden />
        {label}
      </span>
    )
  }

  const Icon = delta > 0 ? ArrowUp : ArrowDown
  const colorClass = improving ? 'text-emerald-400' : 'text-red-400'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
        colorClass,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  )
}