import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { defaultTrendMetricsForMode } from '@/lib/goalMode'
import { buildStatsDayRows, rollingAverage } from '@/lib/stats'
import { roundMacro } from '@/lib/macros'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'
import { cn } from '@/lib/utils'

type MetricKey = 'net' | 'calories' | 'protein' | 'carbs' | 'fat'

const METRIC_OPTIONS: { key: MetricKey; label: string; short: string }[] = [
  { key: 'net', label: 'Net Calories', short: 'Net' },
  { key: 'calories', label: 'Calories In', short: 'In' },
  { key: 'protein', label: 'Protein', short: 'Protein' },
  { key: 'carbs', label: 'Carbs', short: 'Carbs' },
  { key: 'fat', label: 'Fat', short: 'Fat' },
]

const COLORS: Record<MetricKey, string> = {
  net: 'var(--primary)',
  calories: '#f59e0b',
  protein: '#22c55e',
  carbs: '#3b82f6',
  fat: '#a855f7',
}

interface StatsTrendsPanelProps {
  range: { start: string; end: string }
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  accentColor: string
  onDayClick: (date: string) => void
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
  const defaultMetrics = defaultTrendMetricsForMode(goalMode)

  const [enabled, setEnabled] = useState<Set<MetricKey>>(
    () => new Set<MetricKey>(defaultMetrics as MetricKey[]),
  )
  const [showMoreMetrics, setShowMoreMetrics] = useState(false)
  const [rollingWindow, setRollingWindow] = useState<7 | 14>(7)
  const [showRolling, setShowRolling] = useState(false)

  useEffect(() => {
    setEnabled(new Set<MetricKey>(defaultTrendMetricsForMode(goalMode) as MetricKey[]))
    setShowMoreMetrics(false)
  }, [goalMode])

  const dayRows = useMemo(
    () => buildStatsDayRows(range, dailyLogs, foodLibrary, settings),
    [range, dailyLogs, foodLibrary, settings],
  )

  const chartData = useMemo(() => {
    const nets = dayRows.map((d) => d.net)
    const cals = dayRows.map((d) => d.calories)
    const prots = dayRows.map((d) => d.protein)
    const carbs = dayRows.map((d) => d.carbs)
    const fats = dayRows.map((d) => d.fat)
    const rollNet = rollingAverage(nets, rollingWindow)
    const rollCal = rollingAverage(cals, rollingWindow)
    const rollProt = rollingAverage(prots, rollingWindow)
    const rollCarb = rollingAverage(carbs, rollingWindow)
    const rollFat = rollingAverage(fats, rollingWindow)

    return dayRows.map((d, i) => ({
      date: format(parseISO(d.date), 'MM/dd'),
      fullDate: d.date,
      net: roundMacro(d.net, 0),
      calories: roundMacro(d.calories, 0),
      protein: roundMacro(d.protein),
      carbs: roundMacro(d.carbs),
      fat: roundMacro(d.fat),
      rollNet: rollNet[i],
      rollCal: rollCal[i],
      rollProt: rollProt[i],
      rollCarb: rollCarb[i],
      rollFat: rollFat[i],
    }))
  }, [dayRows, rollingWindow])

  const toggleMetric = (key: MetricKey) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (dayRows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No logged days in this period for trends.
      </p>
    )
  }

  const singleMetric = enabled.size === 1
  const primaryMetrics = METRIC_OPTIONS.filter((m) =>
    (defaultMetrics as MetricKey[]).includes(m.key),
  )
  const secondaryMetrics = METRIC_OPTIONS.filter(
    (m) => !(defaultMetrics as MetricKey[]).includes(m.key),
  )

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm">Chart lines</CardTitle>
          <p className="text-xs text-muted-foreground">
            {goalMode === 'cut'
              ? 'Net calories is the primary line in cut mode.'
              : goalMode === 'bulk'
                ? 'Net calories is the primary line in bulk mode.'
                : 'Calories in is the primary line in maintain mode.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          <div className="flex flex-wrap gap-2">
            {primaryMetrics.map(({ key, short, label }) => {
              const on = enabled.has(key)
              return (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={on ? 'default' : 'outline'}
                  className={cn('h-10 min-w-[4.5rem]', on && 'ring-1 ring-primary/40')}
                  onClick={() => toggleMetric(key)}
                >
                  {short}
                  <span className="sr-only">{label}</span>
                </Button>
              )
            })}
            {secondaryMetrics.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-10 text-xs"
                onClick={() => setShowMoreMetrics((v) => !v)}
              >
                {showMoreMetrics ? 'Fewer' : '+ More'}
              </Button>
            )}
          </div>
          {showMoreMetrics && secondaryMetrics.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {secondaryMetrics.map(({ key, short }) => {
                const on = enabled.has(key)
                return (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={on ? 'default' : 'outline'}
                    className="h-9 text-xs"
                    onClick={() => toggleMetric(key)}
                  >
                    {short}
                  </Button>
                )
              })}
            </div>
          )}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trends over time</CardTitle>
          <p className="text-xs text-muted-foreground">Tap a point to open that day</p>
        </CardHeader>
        <CardContent className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              onClick={(state) => {
                const idx =
                  typeof state?.activeTooltipIndex === 'number'
                    ? state.activeTooltipIndex
                    : -1
                const row = chartData[idx]
                if (row) onDayClick(row.fullDate)
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} />
              <Tooltip contentStyle={{ background: '#141414', border: '1px solid #333' }} />
              {!singleMetric && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {[...enabled].map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={METRIC_OPTIONS.find((m) => m.key === key)?.label ?? key}
                  stroke={key === 'net' ? accentColor : COLORS[key]}
                  strokeWidth={key === 'net' ? 2.5 : 2}
                  dot={{ r: 3, cursor: 'pointer' }}
                />
              ))}
              {showRolling &&
                [...enabled].map((key) => {
                  const rollKey =
                    key === 'net'
                      ? 'rollNet'
                      : key === 'calories'
                        ? 'rollCal'
                        : key === 'protein'
                          ? 'rollProt'
                          : key === 'carbs'
                            ? 'rollCarb'
                            : 'rollFat'
                  return (
                    <Line
                      key={`roll-${key}`}
                      type="monotone"
                      dataKey={rollKey}
                      name={`${METRIC_OPTIONS.find((m) => m.key === key)?.label} (${rollingWindow}d avg)`}
                      stroke={key === 'net' ? accentColor : COLORS[key]}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls={false}
                    />
                  )
                })}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}