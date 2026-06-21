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
  countLoggedWeights,
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

const GOAL_WEIGHT_COLOR = '#22c55e'

interface TrendsWeightSectionProps {
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

export function TrendsWeightSection({
  dailyLogs,
  settings,
  accentColor,
  onDayClick,
}: TrendsWeightSectionProps) {
  const unit = settings.weightUnit ?? 'lbs'

  const chartData = useMemo(
    () => buildLoggedWeightChartData(dailyLogs, unit, 7),
    [dailyLogs, unit],
  )

  const logCount = useMemo(() => countLoggedWeights(dailyLogs), [dailyLogs])

  const targetDisplay =
    settings.targetWeightKg != null && settings.targetWeightKg > 0
      ? weightFromKg(settings.targetWeightKg, unit)
      : null

  const goalLabel =
    targetDisplay != null
      ? `Goal ${targetDisplay.toFixed(1)} ${weightUnitLabel(unit)}`
      : null

  const latestLogged = chartData.length > 0 ? chartData[chartData.length - 1] : null

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

  return (
    <StatsSectionCard contentClassName="space-y-3">
      <div className="space-y-2">
        <StatsSectionHeader
          title="Weight over time"
          description={
            logCount === 0
              ? 'Log weight on the Daily tab to see your chart.'
              : `All time · ${logCount} ${logCount === 1 ? 'entry' : 'entries'} · 7-day average`
          }
        />
        {latestLogged?.weight != null && (
          <p className="text-xs text-muted-foreground">
            Latest:{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {latestLogged.weight} {weightUnitLabel(unit)}
            </span>
            {targetDisplay != null && (
              <span className="ml-1.5 text-emerald-400">· {goalLabel}</span>
            )}
          </p>
        )}
      </div>
      <div className="h-56 min-h-[14rem] sm:h-64">
          {logCount === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No weight data yet.
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
                  dataKey="label"
                  stroke={CHART_AXIS_STROKE}
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={chartData.length > 8 ? -35 : 0}
                  textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                  height={chartData.length > 8 ? 48 : 30}
                />
                <YAxis
                  stroke={CHART_AXIS_STROKE}
                  fontSize={11}
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
                    return [`${value} ${weightUnitLabel(unit)}`, name]
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