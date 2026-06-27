import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  StatsSectionCard,
  StatsSectionHeader,
} from '@/components/stats/StatsSectionCard'
import {
  buildLoggedWeightChartData,
  buildWeightChartXTicks,
  computeWeightPeriodStats,
  computeWeightTrend,
  countLoggedWeightsInRange,
  weightChangeTone,
  type WeightChartPoint,
} from '@/lib/weightStats'
import { weightFromKg, weightUnitLabel } from '@/lib/weight'
import {
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
  CHART_TREND_LINE,
  chartTooltipStyle,
} from '@/lib/chartTheme'
import type { DailyLog, Settings } from '@/lib/types'
import { cn } from '@/lib/utils'

const GOAL_WEIGHT_COLOR = '#22c55e'

const PERIOD_LABELS: Record<'week' | 'month' | 'custom', string> = {
  week: 'This week',
  month: 'This month',
  custom: 'Selected period',
}

interface TrendsWeightSectionProps {
  range: { start: string; end: string }
  statsPeriod: 'week' | 'month' | 'custom'
  dailyLogs: Record<string, DailyLog>
  settings: Settings
  accentColor: string
  onDayClick: (date: string) => void
}

function WeightChartLegend({
  accentColor,
  hasGoal,
}: {
  accentColor: string
  hasGoal: boolean
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-0.5 w-3 rounded-sm"
          style={{ backgroundColor: accentColor }}
        />
        Weight
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-0 w-3 border-t-2 border-dashed"
          style={{ borderColor: CHART_TREND_LINE }}
        />
        7-day avg
      </span>
      {hasGoal && (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-3 border-t-2 border-dashed"
            style={{ borderColor: GOAL_WEIGHT_COLOR }}
          />
          Goal weight
        </span>
      )}
    </div>
  )
}

function toneClass(tone: ReturnType<typeof weightChangeTone>): string {
  if (tone === 'loss') return 'text-emerald-400'
  if (tone === 'gain') return 'text-red-400'
  return 'text-foreground'
}

function WeightStatTile({
  label,
  value,
  sublabel,
  tone = 'neutral',
}: {
  label: string
  value: string
  sublabel?: string
  tone?: 'loss' | 'gain' | 'neutral'
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', toneClass(tone))}>
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</p>
      )}
    </div>
  )
}

export function TrendsWeightSection({
  range,
  statsPeriod,
  dailyLogs,
  settings,
  accentColor,
  onDayClick,
}: TrendsWeightSectionProps) {
  const unit = settings.weightUnit ?? 'lbs'
  const unitLabel = weightUnitLabel(unit)

  const chartData = useMemo(
    () => buildLoggedWeightChartData(dailyLogs, unit, range, 7),
    [dailyLogs, unit, range],
  )

  const logCount = useMemo(
    () => countLoggedWeightsInRange(dailyLogs, range),
    [dailyLogs, range],
  )

  const periodStats = useMemo(() => computeWeightPeriodStats(chartData), [chartData])
  const trendInfo = useMemo(() => computeWeightTrend(chartData), [chartData])

  const xTicks = useMemo(
    () => buildWeightChartXTicks(chartData.map((p) => p.date)),
    [chartData],
  )

  const targetDisplay =
    settings.targetWeightKg != null && settings.targetWeightKg > 0
      ? weightFromKg(settings.targetWeightKg, unit)
      : null

  const goalLabel =
    targetDisplay != null
      ? `Goal ${targetDisplay.toFixed(1)} ${unitLabel}`
      : null

  const yDomain = useMemo((): [number, number] => {
    const values = chartData.flatMap((p) =>
      [p.weight, p.trend].filter((v): v is number => v != null),
    )
    if (targetDisplay != null) values.push(targetDisplay)
    if (values.length === 0) return [0, 100]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = Math.max(2, (max - min) * 0.08)
    return [roundY(min - pad), roundY(max + pad)]
  }, [chartData, targetDisplay])

  const formatWeight = (value: number) => `${value.toFixed(1)} ${unitLabel}`

  const trendText = useMemo(() => {
    if (!trendInfo) return null
    const abs = Math.abs(trendInfo.changePerWeek).toFixed(1)
    if (trendInfo.direction === 'losing') {
      return `Losing ${abs} ${unitLabel} per week`
    }
    if (trendInfo.direction === 'gaining') {
      return `Gaining ${abs} ${unitLabel} per week`
    }
    return 'Holding steady'
  }, [trendInfo, unitLabel])

  const projectionText =
    trendInfo?.projection4Weeks != null
      ? `Estimate: ~${trendInfo.projection4Weeks.toFixed(1)} ${unitLabel} in 4 weeks`
      : null

  return (
    <StatsSectionCard contentClassName="space-y-4">
      <StatsSectionHeader
        title="Weight over time"
        description={
          logCount === 0
            ? `No weight entries in ${PERIOD_LABELS[statsPeriod].toLowerCase()}. Log weight on the Daily tab.`
            : `${PERIOD_LABELS[statsPeriod]} · ${logCount} ${logCount === 1 ? 'entry' : 'entries'} · 7-day average`
        }
      />

      {periodStats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <WeightStatTile
              label="Highest"
              value={formatWeight(periodStats.highest)}
              sublabel={format(parseISO(periodStats.highestDate), 'MMM d')}
            />
            <WeightStatTile
              label="Lowest"
              value={formatWeight(periodStats.lowest)}
              sublabel={format(parseISO(periodStats.lowestDate), 'MMM d')}
            />
            <WeightStatTile
              label="Average"
              value={formatWeight(periodStats.average)}
            />
            <WeightStatTile
              label="Net change"
              value={`${periodStats.netChange > 0 ? '+' : ''}${periodStats.netChange.toFixed(1)} ${unitLabel}`}
              tone={weightChangeTone(periodStats.netChange)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <WeightStatTile
              label="Starting weight"
              value={formatWeight(periodStats.startWeight)}
              sublabel={format(parseISO(periodStats.startDate), 'MMM d, yyyy')}
            />
            <WeightStatTile
              label="Most recent"
              value={formatWeight(periodStats.latestWeight)}
              sublabel={format(parseISO(periodStats.latestDate), 'MMM d, yyyy')}
              tone={weightChangeTone(periodStats.netChange)}
            />
          </div>

          {trendText && (
            <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Trend rate
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-semibold',
                  toneClass(
                    trendInfo.direction === 'losing'
                      ? 'loss'
                      : trendInfo.direction === 'gaining'
                        ? 'gain'
                        : 'neutral',
                  ),
                )}
              >
                {trendText}
              </p>
              {projectionText && (
                <p className="mt-1 text-xs text-muted-foreground">{projectionText}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-56 min-h-[14rem] sm:h-64">
        {logCount === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No weight data in this period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
              onClick={(state) => {
                const idx =
                  typeof state?.activeTooltipIndex === 'number'
                    ? state.activeTooltipIndex
                    : -1
                const row = chartData[idx]
                if (row?.weight != null) onDayClick(row.date)
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
              <XAxis
                dataKey="date"
                ticks={xTicks}
                stroke={CHART_AXIS_STROKE}
                fontSize={10}
                tickLine={false}
                tickFormatter={(dateStr) => {
                  const row = chartData.find((p) => p.date === dateStr)
                  return row?.label ?? dateStr
                }}
                height={30}
              />
              <YAxis
                stroke={CHART_AXIS_STROKE}
                fontSize={11}
                tickLine={false}
                domain={yDomain}
                allowDecimals={false}
                tickFormatter={(v) => `${Math.round(Number(v))}`}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as WeightChartPoint | undefined
                  if (!row?.date) return ''
                  return format(parseISO(row.date), 'MMM d, yyyy')
                }}
                formatter={(value, name) => {
                  if (value == null || value === '') return ['—', name]
                  return [`${value} ${unitLabel}`, name]
                }}
              />
              <Legend
                content={
                  <WeightChartLegend
                    accentColor={accentColor}
                    hasGoal={targetDisplay != null}
                  />
                }
              />
              {targetDisplay != null && goalLabel && (
                <ReferenceLine
                  y={targetDisplay}
                  stroke={GOAL_WEIGHT_COLOR}
                  strokeWidth={2.5}
                  strokeDasharray="10 5"
                  label={{
                    value: goalLabel,
                    position: 'insideTopRight',
                    fill: GOAL_WEIGHT_COLOR,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight"
                legendType="none"
                stroke={accentColor}
                strokeWidth={2.5}
                dot={{ r: 4, cursor: 'pointer' }}
                connectNulls
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="trend"
                name="7-day avg"
                legendType="none"
                stroke={CHART_TREND_LINE}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </StatsSectionCard>
  )
}

function roundY(value: number): number {
  return Math.round(value)
}