import { useMemo, useState } from 'react'
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
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  buildStatsDayRows,
  buildTrendMetricSeries,
  computeTrendGoalLines,
  rollingAverageCalendarWindow,
  stableCalorieYDomain,
  stableMacroYDomain,
  type TrendMetricKey,
} from '@/lib/stats'
import { roundMacro } from '@/lib/macros'
import { MACRO_CHART_COLORS, macroMetricOptions } from '@/lib/macroColors'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'
import { TrendsWeightSection } from '@/components/stats/TrendsWeightSection'

const CALORIE_METRICS: { key: TrendMetricKey; label: string }[] = [
  { key: 'net', label: 'Net Calories' },
  { key: 'calories', label: 'Calories In' },
]

const MACRO_METRICS = macroMetricOptions()

const CALORIE_LINE_COLORS: Record<'net' | 'calories', string> = {
  net: 'var(--primary)',
  calories: '#f59e0b',
}

const GOAL_LINE_COLORS = {
  intake: '#fbbf24',
  net: '#94a3b8',
} as const

type GoalLine = { y: number; label: string; stroke: string }

function lineColor(key: TrendMetricKey, accentColor: string): string {
  if (key === 'net') return accentColor
  if (key === 'calories') return CALORIE_LINE_COLORS.calories
  return MACRO_CHART_COLORS[key]
}

const ROLL_KEY: Record<TrendMetricKey, string> = {
  net: 'rollNet',
  calories: 'rollCal',
  protein: 'rollProt',
  carbs: 'rollCarb',
  fat: 'rollFat',
  fiber: 'rollFiber',
  sugars: 'rollSugars',
}

interface StatsTrendsPanelProps {
  range: { start: string; end: string }
  statsPeriod: 'week' | 'month' | 'custom'
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  accentColor: string
  onDayClick: (date: string) => void
}

function TrendsChartLegend({
  metrics,
  accentColor,
  showRolling,
  rollingWindow,
}: {
  metrics: { key: TrendMetricKey; label: string }[]
  accentColor: string
  showRolling: boolean
  rollingWindow: 7 | 14
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 pt-2 text-[10px]">
      {metrics.map(({ key, label }) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-3 rounded-sm"
            style={{ backgroundColor: lineColor(key, accentColor) }}
          />
          <span className="text-muted-foreground">{label}</span>
        </span>
      ))}
      {showRolling &&
        metrics.map(({ key, label }) => (
          <span key={`roll-${key}`} className="inline-flex items-center gap-1.5 opacity-80">
            <span
              className="inline-block h-0 w-3 border-t-2 border-dashed"
              style={{ borderColor: lineColor(key, accentColor) }}
            />
            <span className="text-muted-foreground">
              {label} ({rollingWindow}d avg)
            </span>
          </span>
        ))}
    </div>
  )
}

type ChartRow = {
  date: string
  fullDate: string
  net: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugars: number
  rollNet: number | null
  rollCal: number | null
  rollProt: number | null
  rollCarb: number | null
  rollFat: number | null
  rollFiber: number | null
  rollSugars: number | null
}

function TrendsLineChart({
  title,
  description,
  data,
  metrics,
  accentColor,
  rollingWindow,
  showRolling,
  yDomain,
  goalLines,
  compactDots = false,
  onDayClick,
}: {
  title: string
  description: string
  data: ChartRow[]
  metrics: { key: TrendMetricKey; label: string }[]
  accentColor: string
  rollingWindow: 7 | 14
  showRolling: boolean
  yDomain?: [number, number]
  goalLines?: GoalLine[]
  compactDots?: boolean
  onDayClick: (date: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className={compactDots ? 'h-80 sm:h-96' : 'h-72 sm:h-80'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            onClick={(state) => {
              const idx =
                typeof state?.activeTooltipIndex === 'number'
                  ? state.activeTooltipIndex
                  : -1
              const row = data[idx]
              if (row) onDayClick(row.fullDate)
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#888" fontSize={11} />
            <YAxis stroke="#888" fontSize={11} domain={yDomain ?? ['auto', 'auto']} />
            {yDomain && <ReferenceLine y={0} stroke="#666" strokeWidth={1} />}
            {goalLines?.map((goal) => (
              <ReferenceLine
                key={goal.label}
                y={goal.y}
                stroke={goal.stroke}
                strokeDasharray="8 4"
                strokeWidth={1.5}
                label={{
                  value: goal.label,
                  position: 'insideTopRight',
                  fill: goal.stroke,
                  fontSize: 10,
                }}
              />
            ))}
            <Tooltip contentStyle={{ background: '#141414', border: '1px solid #333' }} />
            <Legend
              content={
                <TrendsChartLegend
                  metrics={metrics}
                  accentColor={accentColor}
                  showRolling={showRolling}
                  rollingWindow={rollingWindow}
                />
              }
            />
            {metrics.map(({ key, label }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                legendType="none"
                stroke={lineColor(key, accentColor)}
                strokeWidth={key === 'net' ? 2.5 : 2}
                dot={{ r: compactDots ? 2.5 : 3, cursor: 'pointer' }}
                activeDot={{ r: compactDots ? 4 : 5 }}
              />
            ))}
            {showRolling &&
              metrics.map(({ key, label }) => (
                <Line
                  key={`roll-${key}`}
                  type="monotone"
                  dataKey={ROLL_KEY[key]}
                  name={`${label} (${rollingWindow}d avg)`}
                  legendType="none"
                  stroke={lineColor(key, accentColor)}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  strokeOpacity={0.85}
                  dot={false}
                  connectNulls={false}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function StatsTrendsPanel({
  range,
  statsPeriod,
  dailyLogs,
  foodLibrary,
  settings,
  accentColor,
  onDayClick,
}: StatsTrendsPanelProps) {
  const [rollingWindow, setRollingWindow] = useState<7 | 14>(7)
  const [showRolling, setShowRolling] = useState(false)
  const rollingAvailable = statsPeriod !== 'week'
  const showRollingLines = rollingAvailable && showRolling

  const dayRows = useMemo(
    () => buildStatsDayRows(range, dailyLogs, foodLibrary, settings),
    [range, dailyLogs, foodLibrary, settings],
  )

  const chartData = useMemo(() => {
    const { dates, metrics } = buildTrendMetricSeries(
      range,
      dailyLogs,
      foodLibrary,
      settings,
    )

    return dayRows.map((d) => {
      const idx = dates.indexOf(d.date)
      const roll = (key: TrendMetricKey) =>
        idx >= 0
          ? rollingAverageCalendarWindow(metrics[key], idx, rollingWindow)
          : null

      return {
        date: format(parseISO(d.date), 'MM/dd'),
        fullDate: d.date,
        net: roundMacro(d.net, 0),
        calories: roundMacro(d.calories, 0),
        protein: roundMacro(d.protein),
        carbs: roundMacro(d.carbs),
        fat: roundMacro(d.fat),
        fiber: roundMacro(d.fiber),
        sugars: roundMacro(d.sugars),
        rollNet: roll('net'),
        rollCal: roll('calories'),
        rollProt: roll('protein'),
        rollCarb: roll('carbs'),
        rollFat: roll('fat'),
        rollFiber: roll('fiber'),
        rollSugars: roll('sugars'),
      }
    })
  }, [dayRows, range, dailyLogs, foodLibrary, settings, rollingWindow])

  const calorieGoalLines = useMemo(() => computeTrendGoalLines(dayRows), [dayRows])

  const calorieChartGoalLines = useMemo((): GoalLine[] => {
    if (!calorieGoalLines) return []
    const lines: GoalLine[] = [
      {
        y: calorieGoalLines.intakeTarget,
        label: calorieGoalLines.intakeLabel,
        stroke: GOAL_LINE_COLORS.intake,
      },
    ]
    if (calorieGoalLines.netTarget != null && calorieGoalLines.netLabel) {
      lines.push({
        y: calorieGoalLines.netTarget,
        label: calorieGoalLines.netLabel,
        stroke: GOAL_LINE_COLORS.net,
      })
    }
    return lines
  }, [calorieGoalLines])

  const calorieYDomain = useMemo(() => {
    const values: number[] = []
    chartData.forEach((row) => {
      values.push(row.net, row.calories)
      if (showRollingLines) {
        if (row.rollNet != null) values.push(row.rollNet)
        if (row.rollCal != null) values.push(row.rollCal)
      }
    })
    if (calorieGoalLines) {
      values.push(calorieGoalLines.intakeTarget)
      if (calorieGoalLines.netTarget != null) values.push(calorieGoalLines.netTarget)
    }
    return stableCalorieYDomain(values)
  }, [chartData, showRollingLines, calorieGoalLines])

  const macroYDomain = useMemo(() => {
    const values: number[] = []
    chartData.forEach((row) => {
      values.push(row.protein, row.carbs, row.fat, row.fiber, row.sugars)
      if (showRollingLines) {
        if (row.rollProt != null) values.push(row.rollProt)
        if (row.rollCarb != null) values.push(row.rollCarb)
        if (row.rollFat != null) values.push(row.rollFat)
        if (row.rollFiber != null) values.push(row.rollFiber)
        if (row.rollSugars != null) values.push(row.rollSugars)
      }
    })
    return stableMacroYDomain(values)
  }, [chartData, showRollingLines])

  const hasTrendData = dayRows.length > 0

  return (
    <div className="space-y-3">
      {rollingAvailable && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">Rolling average</CardTitle>
            <p className="text-xs text-muted-foreground">
              Rolling averages use calendar days before this period when needed
              (e.g. early in the month).
            </p>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground w-full sm:w-auto">Rolling avg</span>
              <Button
                size="sm"
                variant={rollingWindow === 7 ? 'default' : 'outline'}
                onClick={() => setRollingWindow(7)}
              >
                7d
              </Button>
              <Button
                size="sm"
                variant={rollingWindow === 14 ? 'default' : 'outline'}
                onClick={() => setRollingWindow(14)}
              >
                14d
              </Button>
              <label className="flex items-center gap-2 text-xs ml-auto cursor-pointer">
                <Checkbox
                  checked={showRolling}
                  onChange={() => setShowRolling((v) => !v)}
                />
                Show average line
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {hasTrendData ? (
        <>
          <TrendsLineChart
            title="Calories"
            description="Calories in and net calories (eaten − burned). Dashed lines are your intake and net calorie goals. Tap a point to open that day."
            data={chartData}
            metrics={CALORIE_METRICS}
            accentColor={accentColor}
            rollingWindow={rollingWindow}
            showRolling={showRollingLines}
            yDomain={calorieYDomain}
            goalLines={calorieChartGoalLines}
            onDayClick={onDayClick}
          />
          <TrendsLineChart
            title="Macros"
            description="Protein, carbs, fat, fiber, and sugars per logged day. Tap a point to open that day."
            data={chartData}
            metrics={MACRO_METRICS}
            accentColor={accentColor}
            rollingWindow={rollingWindow}
            showRolling={showRollingLines}
            yDomain={macroYDomain}
            compactDots
            onDayClick={onDayClick}
          />
        </>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="No trends yet"
          description="Log food on the Daily tab to see calorie and macro charts for this period. Try a wider date range if you recently started tracking."
        />
      )}

      <TrendsWeightSection
        dailyLogs={dailyLogs}
        settings={settings}
        accentColor={accentColor}
        onDayClick={onDayClick}
      />
    </div>
  )
}