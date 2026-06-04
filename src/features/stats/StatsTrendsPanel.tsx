import { useMemo, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { buildStatsDayRows, rollingAverage } from '@/lib/stats'
import { roundMacro } from '@/lib/macros'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'

type MetricKey = 'net' | 'calories' | 'protein' | 'carbs' | 'fat'

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'net', label: 'Net Calories' },
  { key: 'calories', label: 'Calories In' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
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
  const [enabled, setEnabled] = useState<Set<MetricKey>>(
    () => new Set<MetricKey>(['calories']),
  )
  const [rollingWindow, setRollingWindow] = useState<7 | 14>(7)
  const [showRolling, setShowRolling] = useState(true)

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Metrics to display</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-4 gap-y-2">
          {METRIC_OPTIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={enabled.has(key)}
                onChange={() => toggleMetric(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-xs text-muted-foreground shrink-0">Rolling avg:</Label>
        <Button
          size="sm"
          variant={rollingWindow === 7 ? 'default' : 'outline'}
          onClick={() => setRollingWindow(7)}
        >
          7-day
        </Button>
        <Button
          size="sm"
          variant={rollingWindow === 14 ? 'default' : 'outline'}
          onClick={() => setRollingWindow(14)}
        >
          14-day
        </Button>
        <label className="flex items-center gap-2 text-sm ml-auto cursor-pointer">
          <Checkbox
            checked={showRolling}
            onChange={() => setShowRolling((v) => !v)}
          />
          Show average
        </label>
      </div>

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
              <Legend />
              {[...enabled].map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={METRIC_OPTIONS.find((m) => m.key === key)?.label ?? key}
                  stroke={key === 'net' ? accentColor : COLORS[key]}
                  strokeWidth={2}
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