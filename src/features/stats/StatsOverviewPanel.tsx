import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { DailyEnergyBalanceChart } from '@/components/stats/DailyEnergyBalanceChart'
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

const PRIMARY_ADHERENCE: AdherenceKey[] = ['calories', 'protein', 'targetDeficit']
const OTHER_ADHERENCE: AdherenceKey[] = ['carbs', 'fat', 'fiber', 'sugars']

const ADHERENCE_HINTS: Partial<Record<AdherenceKey, string>> = {
  calories: 'Within ~15% of intake target',
  protein: 'Met or exceeded target',
  targetDeficit: 'Within ~15% of deficit or surplus goal',
  carbs: 'Within ~15% of target',
  fat: 'Within ~15% of target',
  fiber: 'Within ~15% of target',
  sugars: 'Within ~15% of target',
}

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
  const balanceChartData = dayRows.map((d) => ({
    label: format(parseISO(d.date), 'M/d'),
    net: roundMacro(d.net, 0),
  }))

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

  const primaryKeys = PRIMARY_ADHERENCE.filter((key) => adherence[key] != null)

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
        <CardContent className="pt-4 pb-3 space-y-4">
          <div>
            <p className="text-sm font-medium">Goal adherence</p>
            <p className="text-xs text-muted-foreground mt-1">
              % of logged days on target. Protein counts when you meet or beat the goal.
              Energy balance uses days that have a deficit or surplus goal set.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Calories &amp; protein
            </p>
            <div className="grid grid-cols-2 gap-2">
              {primaryKeys.map((key) => (
                <AdherenceCell
                  key={key}
                  label={ADHERENCE_LABELS[key]}
                  hint={ADHERENCE_HINTS[key]}
                  percent={adherence[key]!}
                  prominent={key === 'calories' || key === 'protein'}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Other macros
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OTHER_ADHERENCE.map((key) => (
                <AdherenceCell
                  key={key}
                  label={ADHERENCE_LABELS[key]}
                  hint={ADHERENCE_HINTS[key]}
                  percent={adherence[key]!}
                />
              ))}
            </div>
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
          <p className="text-sm font-medium mb-1">Daily energy balance</p>
          <DailyEnergyBalanceChart data={balanceChartData} color={accentColor} />
        </CardContent>
      </Card>
    </div>
  )
}

function AdherenceCell({
  label,
  hint,
  percent,
  prominent,
}: {
  label: string
  hint?: string
  percent: number
  prominent?: boolean
}) {
  const hit = percent >= 70
  const partial = percent >= 40 && percent < 70
  return (
    <div
      className={`rounded-lg bg-secondary/50 px-3 py-2.5 ${
        prominent ? 'ring-1 ring-primary/25' : ''
      }`}
    >
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p
        className={`font-bold tabular-nums ${
          prominent ? 'text-2xl' : 'text-xl'
        } ${
          hit ? 'text-emerald-400' : partial ? 'text-amber-400' : 'text-muted-foreground'
        }`}
      >
        {percent}%
      </p>
      {hint && (
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{hint}</p>
      )}
    </div>
  )
}