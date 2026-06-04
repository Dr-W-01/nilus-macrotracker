import { Card, CardContent } from '@/components/ui/card'
import {
  buildPeriodComparison,
  formatComparisonValue,
} from '@/lib/periodComparison'
import { roundMacro } from '@/lib/macros'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'

interface PeriodComparisonCardProps {
  range: { start: string; end: string }
  prevRange: { start: string; end: string }
  statsPeriod: 'week' | 'month' | 'custom'
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
}

export function PeriodComparisonCard({
  range,
  prevRange,
  statsPeriod,
  dailyLogs,
  foodLibrary,
  settings,
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
    <Card>
      <CardContent className="pt-4 pb-3 space-y-3">
        <div>
          <p className="text-sm font-medium">This period vs {periodLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily averages for logged days (— if not tracked)
          </p>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <ComparisonRow key={r.label} row={r} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ComparisonRow({
  row,
}: {
  row: ReturnType<typeof buildPeriodComparison>['rows'][number]
}) {
  const delta = row.delta
  const deltaText =
    delta == null
      ? null
      : delta === 0
        ? '±0'
        : row.format === 'signedCal' || row.format === 'cal'
          ? `${delta > 0 ? '+' : ''}${roundMacro(delta, 0)}`
          : row.format === 'percent'
            ? `${delta > 0 ? '+' : ''}${roundMacro(delta, 0)}%`
            : row.format === 'grams'
              ? `${delta > 0 ? '+' : ''}${roundMacro(delta, 1)}g`
              : row.format === 'weight'
                ? `${delta > 0 ? '+' : ''}${roundMacro(delta, 1)}`
                : `${delta > 0 ? '+' : ''}${delta}`

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        row.emphasized ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/30'
      }`}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{row.label}</p>
      <div className="grid grid-cols-3 gap-2 mt-1 items-end">
        <div>
          <p className="text-[10px] text-muted-foreground">This</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatComparisonValue(row.current, row.format, row.weightUnit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Last</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatComparisonValue(row.previous, row.format, row.weightUnit)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Δ</p>
          <p
            className={`text-sm font-medium tabular-nums ${
              delta == null
                ? 'text-muted-foreground'
                : delta > 0
                  ? 'text-amber-400'
                  : delta < 0
                    ? 'text-emerald-400'
                    : 'text-muted-foreground'
            }`}
          >
            {deltaText ?? '—'}
          </p>
        </div>
      </div>
    </div>
  )
}