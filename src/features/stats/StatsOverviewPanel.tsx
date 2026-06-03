import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { NetCaloriesSparkline } from '@/components/stats/NetCaloriesSparkline'
import {
  ADHERENCE_LABELS,
  type AdherenceKey,
  buildStatsDayRows,
  computeAdherenceBreakdown,
  generateInsights,
  getPreviousRange,
  previousPeriodLabel,
  sumDayRows,
} from '@/lib/stats'
import { roundMacro } from '@/lib/macros'
import type { FoodItem, Settings } from '@/lib/types'
import type { DailyLog } from '@/lib/types'

const ADHERENCE_ORDER: AdherenceKey[] = [
  'calories',
  'targetDeficit',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugars',
]

interface StatsOverviewPanelProps {
  range: { start: string; end: string }
  statsPeriod: 'week' | 'month' | 'custom'
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  accentColor: string
}

export function StatsOverviewPanel({
  range,
  statsPeriod,
  dailyLogs,
  foodLibrary,
  settings,
  accentColor,
}: StatsOverviewPanelProps) {
  const dayRows = buildStatsDayRows(range, dailyLogs, foodLibrary, settings)
  const prevRange = getPreviousRange(range)
  const prevRows = buildStatsDayRows(prevRange, dailyLogs, foodLibrary, settings)

  const totals = sumDayRows(dayRows)
  const prevTotals = sumDayRows(prevRows)
  const loggedDays = dayRows.length
  const avgNet = loggedDays > 0 ? totals.net / loggedDays : 0
  const prevAvgNet =
    prevRows.length > 0 ? prevTotals.net / prevRows.length : null
  const netDelta =
    prevAvgNet != null && loggedDays > 0
      ? roundMacro(avgNet - prevAvgNet, 0)
      : null

  const adherence = computeAdherenceBreakdown(dayRows)
  const insights = generateInsights(dayRows, statsPeriod, range)
  const sparkData = dayRows.map((d) => ({ net: roundMacro(d.net, 0) }))

  const comparisonText =
    netDelta == null
      ? 'Log more days to compare with the previous period'
      : netDelta === 0
        ? `Same avg net cal vs ${previousPeriodLabel(statsPeriod)}`
        : netDelta > 0
          ? `+${netDelta} cal avg vs ${previousPeriodLabel(statsPeriod)}`
          : `${netDelta} cal avg vs ${previousPeriodLabel(statsPeriod)}`

  if (loggedDays === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No logged days in this period. Add foods on the Daily tab to see overview stats.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <p className="text-sm text-muted-foreground">Net Calories (period total)</p>
        <p className="text-5xl font-bold tracking-tight text-primary">
          {roundMacro(totals.net, 0)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{comparisonText}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {roundMacro(avgNet, 0)} cal/day avg · {loggedDays} logged day
          {loggedDays === 1 ? '' : 's'}
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          <p className="text-sm font-medium">Goal adherence</p>
          <p className="text-xs text-muted-foreground">
            % of logged days within ~15% of each target. Intake uses calories eaten;
            deficit uses your template&apos;s target deficit when set.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ADHERENCE_ORDER.map((key) => {
              const pct = adherence[key]
              if (pct == null) return null
              return (
                <AdherenceCell
                  key={key}
                  label={ADHERENCE_LABELS[key]}
                  percent={pct}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3 space-y-2">
          <p className="text-sm font-semibold">Insights</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {insights.map((line, i) => (
              <li key={i} className="leading-snug">
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Net calories trend</p>
          <NetCaloriesSparkline data={sparkData} color={accentColor} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{format(parseISO(dayRows[0].date), 'MMM d')}</span>
            <span>{format(parseISO(dayRows[dayRows.length - 1].date), 'MMM d')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AdherenceCell({ label, percent }: { label: string; percent: number }) {
  const hit = percent >= 70
  const partial = percent >= 40 && percent < 70
  return (
    <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground leading-tight mb-1">{label}</p>
      <p
        className={`text-xl font-bold tabular-nums ${
          hit ? 'text-emerald-400' : partial ? 'text-amber-400' : 'text-muted-foreground'
        }`}
      >
        {percent}%
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {hit ? 'On target' : partial ? 'Close' : 'Off target'}
      </p>
    </div>
  )
}