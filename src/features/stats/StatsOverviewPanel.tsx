import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { BarChart3 } from 'lucide-react'
import { DailyEnergyBalanceChart } from '@/components/stats/DailyEnergyBalanceChart'
import { InsightsCard } from '@/components/stats/InsightsCard'
import { PeriodComparisonCard } from '@/components/stats/PeriodComparisonCard'
import {
  StatsSectionCard,
  StatsSectionHeader,
  StatsSubsectionLabel,
} from '@/components/stats/StatsSectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  ADHERENCE_LABELS,
  type AdherenceKey,
  buildStatsDayRows,
  computeAdherenceBreakdown,
  buildInsightSummary,
  getPreviousRange,
  previousPeriodLabel,
  sumDayRows,
} from '@/lib/stats'
import { inferGoalModeFromDayRows, inferGoalModeFromTemplate } from '@/lib/goalMode'
import { roundMacro } from '@/lib/macros'
import type { FoodItem, Settings } from '@/lib/types'
import type { DailyLog } from '@/lib/types'

const OTHER_ADHERENCE: AdherenceKey[] = ['carbs', 'fat', 'fiber', 'sugars']

const ADHERENCE_HINTS: Partial<Record<AdherenceKey, string>> = {
  calories: 'Within ~15% of intake target',
  protein: 'Met or exceeded target',
  targetDeficit: 'Net calories within ~15% of goal',
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
  onStartLogging?: () => void
}

export function StatsOverviewPanel({
  range,
  statsPeriod,
  dailyLogs,
  foodLibrary,
  settings,
  accentColor,
  onStartLogging,
}: StatsOverviewPanelProps) {
  const dayRows = buildStatsDayRows(range, dailyLogs, foodLibrary, settings)
  const goalMode = useMemo(() => {
    if (dayRows.length > 0) return inferGoalModeFromDayRows(dayRows)
    const template = settings.goalTemplates.find((t) => t.id === settings.defaultTemplateId)
    return inferGoalModeFromTemplate(template)
  }, [dayRows, settings.goalTemplates, settings.defaultTemplateId])
  const prevRange = getPreviousRange(range)
  const prevRows = buildStatsDayRows(prevRange, dailyLogs, foodLibrary, settings)

  const totals = sumDayRows(dayRows)
  const loggedDays = dayRows.length
  const avgNet = loggedDays > 0 ? totals.net / loggedDays : 0
  const prevAvgNet =
    prevRows.length > 0 ? sumDayRows(prevRows).net / prevRows.length : null
  const netDelta =
    prevAvgNet != null && loggedDays > 0
      ? roundMacro(avgNet - prevAvgNet, 0)
      : null

  const adherence = computeAdherenceBreakdown(dayRows)
  const insightSummary = buildInsightSummary(
    dayRows,
    statsPeriod,
    goalMode,
    dailyLogs,
  )
  const balanceChartData = dayRows.map((d) => ({
    label: format(parseISO(d.date), 'M/d'),
    net: roundMacro(d.net, 0),
  }))

  const primaryKeys = useMemo(() => {
    const keys: AdherenceKey[] = []
    if (
      adherence.targetDeficit != null &&
      (goalMode === 'cut' || goalMode === 'bulk')
    ) {
      keys.push('targetDeficit')
    }
    keys.push('calories', 'protein')
    if (adherence.targetDeficit != null && goalMode === 'maintain') {
      keys.push('targetDeficit')
    }
    return keys
  }, [adherence.targetDeficit, goalMode])

  const netHeadline =
    goalMode === 'cut'
      ? 'Net Calories (deficit tracking)'
      : goalMode === 'bulk'
        ? 'Net Calories (surplus tracking)'
        : 'Net Calories (period total)'

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
      <div className="space-y-4">
        <EmptyState
          icon={BarChart3}
          title="No data for this period"
          description="Nothing logged in this date range yet. Start tracking on the Daily tab to see net calories, adherence, and insights here."
          actionLabel="Start logging"
          onAction={onStartLogging}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <p className="text-sm text-muted-foreground">{netHeadline}</p>
        <p className="text-5xl font-bold tracking-tight text-primary">
          {roundMacro(totals.net, 0)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{comparisonText}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {roundMacro(avgNet, 0)} cal/day avg · {loggedDays} logged day
          {loggedDays === 1 ? '' : 's'}
        </p>
      </div>

      <StatsSectionCard contentClassName="space-y-4">
        <StatsSectionHeader
          title="Goal adherence"
          description={`% of logged days on target. Protein counts when you meet or beat the goal.${
            goalMode === 'cut'
              ? ' Energy balance is your deficit net calorie goal.'
              : goalMode === 'bulk'
                ? ' Energy balance is your surplus net calorie goal.'
                : ' Energy balance uses your template net goal when set.'
          }`}
        />

        <div className="space-y-2">
          <StatsSubsectionLabel>
            {goalMode === 'cut' || goalMode === 'bulk'
              ? 'Priority metrics'
              : 'Calories & protein'}
          </StatsSubsectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {primaryKeys.map((key) => (
              <AdherenceCell
                key={key}
                label={ADHERENCE_LABELS[key]}
                hint={ADHERENCE_HINTS[key]}
                percent={adherence[key]!}
                prominent={
                  key === 'targetDeficit' ||
                  key === 'calories' ||
                  key === 'protein'
                }
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <StatsSubsectionLabel>Other macros</StatsSubsectionLabel>
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
      </StatsSectionCard>

      <PeriodComparisonCard
        range={range}
        prevRange={prevRange}
        statsPeriod={statsPeriod}
        dailyLogs={dailyLogs}
        foodLibrary={foodLibrary}
        settings={settings}
        goalMode={goalMode}
      />

      {insightSummary && <InsightsCard summary={insightSummary} />}

      <StatsSectionCard contentClassName="space-y-3">
        <StatsSectionHeader
          title="Daily energy balance"
          description="Net calories per logged day in this period."
        />
        <DailyEnergyBalanceChart data={balanceChartData} color={accentColor} />
      </StatsSectionCard>
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
      className={`rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 ${
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