import { useEffect, useMemo, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { defaultTrendMetricsForMode } from '@/lib/goalMode'
import {
  buildStatsDayRows,
  buildTrendMetricSeries,
  rollingAverageCalendarWindow,
  stableCalorieYDomain,
  type TrendMetricKey,
} from '@/lib/stats'
import { roundMacro } from '@/lib/macros'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TrendsWeightSection } from '@/components/stats/TrendsWeightSection'

type CalorieMetricKey = 'net' | 'calories'
type MacroMetricKey = 'protein' | 'carbs' | 'fat'

const CALORIE_METRICS: { key: CalorieMetricKey; label: string; short: string }[] = [
  { key: 'net', label: 'Net Calories', short: 'Net' },
  { key: 'calories', label: 'Calories In', short: 'In' },
]

const MACRO_METRICS: { key: MacroMetricKey; label: string; short: string }[] = [
  { key: 'protein', label: 'Protein', short: 'Protein' },
  { key: 'carbs', label: 'Carbs', short: 'Carbs' },
  { key: 'fat', label: 'Fat', short: 'Fat' },
]

const COLORS: Record<TrendMetricKey, string> = {
  net: 'var(--primary)',
  calories: '#f59e0b',
  protein: '#22c55e',
  carbs: '#3b82f6',
  fat: '#a855f7',
}

const ROLL_KEY: Record<TrendMetricKey, string> = {
  net: 'rollNet',
  calories: 'rollCal',
  protein: 'rollProt',
  carbs: 'rollCarb',
  fat: 'rollFat',
}

interface StatsTrendsPanelProps {
  range: { start: string; end: string }
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  accentColor: string
  onDayClick: (date: string) => void
}

type ChartRow = {
  date: string
  fullDate: string
  net: number
  calories: number
  protein: number
  carbs: number
  fat: number
  rollNet: number | null
  rollCal: number | null
  rollProt: number | null
  rollCarb: number | null
  rollFat: number | null
}

function TrendsLineChart({
  title,
  description,
  data,
  enabledKeys,
  metricOptions,
  accentColor,
  rollingWindow,
  showRolling,
  yDomain,
  onDayClick,
}: {
  title: string
  description: string
  data: ChartRow[]
  enabledKeys: Set<TrendMetricKey>
  metricOptions: { key: TrendMetricKey; label: string }[]
  accentColor: string
  rollingWindow: 7 | 14
  showRolling: boolean
  yDomain?: [number, number]
  onDayClick: (date: string) => void
}) {
  const singleMetric = enabledKeys.size === 1

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
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
            <Tooltip contentStyle={{ background: '#141414', border: '1px solid #333' }} />
            {!singleMetric && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {[...enabledKeys].map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={metricOptions.find((m) => m.key === key)?.label ?? key}
                stroke={key === 'net' ? accentColor : COLORS[key]}
                strokeWidth={key === 'net' ? 2.5 : 2}
                dot={{ r: 3, cursor: 'pointer' }}
              />
            ))}
            {showRolling &&
              [...enabledKeys].map((key) => (
                <Line
                  key={`roll-${key}`}
                  type="monotone"
                  dataKey={ROLL_KEY[key]}
                  name={`${metricOptions.find((m) => m.key === key)?.label} (${rollingWindow}d avg)`}
                  stroke={key === 'net' ? accentColor : COLORS[key]}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
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
  dailyLogs,
  foodLibrary,
  settings,
  accentColor,
  onDayClick,
}: StatsTrendsPanelProps) {
  const goalMode = settings.goalMode ?? 'cut'

  const [calorieEnabled, setCalorieEnabled] = useState<Set<CalorieMetricKey>>(
    () => new Set<CalorieMetricKey>(['net', 'calories']),
  )
  const [macroEnabled, setMacroEnabled] = useState<Set<MacroMetricKey>>(
    () => new Set<MacroMetricKey>(['protein', 'carbs', 'fat']),
  )
  const [rollingWindow, setRollingWindow] = useState<7 | 14>(7)
  const [showRolling, setShowRolling] = useState(false)

  useEffect(() => {
    const primary = defaultTrendMetricsForMode(goalMode)[0]
    if (primary === 'net' || primary === 'calories') {
      setCalorieEnabled(new Set([primary, primary === 'net' ? 'calories' : 'net']))
    }
  }, [goalMode])

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
        rollNet: roll('net'),
        rollCal: roll('calories'),
        rollProt: roll('protein'),
        rollCarb: roll('carbs'),
        rollFat: roll('fat'),
      }
    })
  }, [dayRows, range, dailyLogs, foodLibrary, settings, rollingWindow])

  const calorieYDomain = useMemo(() => {
    const values: number[] = []
    chartData.forEach((row) => {
      if (calorieEnabled.has('net')) values.push(row.net)
      if (calorieEnabled.has('calories')) values.push(row.calories)
      if (showRolling) {
        if (calorieEnabled.has('net') && row.rollNet != null) values.push(row.rollNet)
        if (calorieEnabled.has('calories') && row.rollCal != null) values.push(row.rollCal)
      }
    })
    return stableCalorieYDomain(values)
  }, [chartData, calorieEnabled, showRolling])

  const toggleCalorieMetric = (key: CalorieMetricKey) => {
    setCalorieEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleMacroMetric = (key: MacroMetricKey) => {
    setMacroEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const hasTrendData = dayRows.length > 0

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm">Chart lines</CardTitle>
          <p className="text-xs text-muted-foreground">
            Calories and macros are shown on separate charts. Rolling averages use
            calendar days before this period when needed (e.g. early in the week).
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Calories chart</p>
            <div className="flex flex-wrap gap-2">
              {CALORIE_METRICS.map(({ key, short, label }) => {
                const on = calorieEnabled.has(key)
                return (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={on ? 'default' : 'outline'}
                    className={cn('h-10 min-w-[4.5rem]', on && 'ring-1 ring-primary/40')}
                    onClick={() => toggleCalorieMetric(key)}
                  >
                    {short}
                    <span className="sr-only">{label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">Macros chart</p>
            <div className="flex flex-wrap gap-2">
              {MACRO_METRICS.map(({ key, short, label }) => {
                const on = macroEnabled.has(key)
                return (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={on ? 'default' : 'outline'}
                    className={cn('h-9 text-xs', on && 'ring-1 ring-primary/40')}
                    onClick={() => toggleMacroMetric(key)}
                  >
                    {short}
                    <span className="sr-only">{label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
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

      {hasTrendData ? (
        <>
          <TrendsLineChart
            title="Calories"
            description="Calories in and net calories (eaten − burned). Tap a point to open that day."
            data={chartData}
            enabledKeys={calorieEnabled}
            metricOptions={CALORIE_METRICS}
            accentColor={accentColor}
            rollingWindow={rollingWindow}
            showRolling={showRolling}
            yDomain={calorieYDomain}
            onDayClick={onDayClick}
          />
          <TrendsLineChart
            title="Macros"
            description="Protein, carbs, and fat per logged day. Tap a point to open that day."
            data={chartData}
            enabledKeys={macroEnabled}
            metricOptions={MACRO_METRICS}
            accentColor={accentColor}
            rollingWindow={rollingWindow}
            showRolling={showRolling}
            onDayClick={onDayClick}
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground">
              No logged days in this period for macro trends. Use the period selector above
              or log food on the Daily tab.
            </p>
          </CardContent>
        </Card>
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