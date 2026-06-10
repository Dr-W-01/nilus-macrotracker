import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  averageMacros,
  buildStatsDayRows,
  computeTopFoods,
  macroCalorieDistribution,
} from '@/lib/stats'
import { roundMacro } from '@/lib/macros'
import {
  MACRO_CHART_COLORS,
  MACRO_DISPLAY_LABELS,
  MACRO_NUTRIENT_ORDER,
} from '@/lib/macroColors'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'

type SortKey =
  | 'date'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugars'
  | 'net'
  | 'vsGoal'

const PIE_COLORS = [
  MACRO_CHART_COLORS.protein,
  MACRO_CHART_COLORS.carbs,
  MACRO_CHART_COLORS.fat,
]

interface StatsBreakdownsPanelProps {
  range: { start: string; end: string }
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  onDayClick: (date: string) => void
}

export function StatsBreakdownsPanel({
  range,
  dailyLogs,
  foodLibrary,
  settings,
  onDayClick,
}: StatsBreakdownsPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(true)

  const dayRows = useMemo(
    () => buildStatsDayRows(range, dailyLogs, foodLibrary, settings),
    [range, dailyLogs, foodLibrary, settings],
  )

  const avg = useMemo(() => averageMacros(dayRows), [dayRows])
  const topFoods = useMemo(
    () => computeTopFoods(range, dailyLogs, foodLibrary),
    [range, dailyLogs, foodLibrary],
  )

  const pieData = useMemo(() => {
    const dist = macroCalorieDistribution({
      calories: avg.calories,
      protein: avg.protein,
      carbs: avg.carbs,
      fat: avg.fat,
      fiber: avg.fiber,
      sugars: avg.sugars,
    })
    return dist.map((d, i) => ({
      ...d,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }))
  }, [avg])

  const sortedRows = [...dayRows].sort((a, b) => {
    const mul = sortAsc ? 1 : -1
    if (sortKey === 'date') return mul * a.date.localeCompare(b.date)
    return mul * (a[sortKey] - b[sortKey])
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''

  const formatVsGoal = (delta: number) => {
    const rounded = roundMacro(delta, 0)
    if (rounded > 0) return `+${rounded}`
    return String(rounded)
  }

  const headerClass =
    'sticky top-0 z-10 cursor-pointer whitespace-nowrap bg-background px-2 py-2 text-[10px] font-semibold uppercase tracking-wide sm:text-xs sm:normal-case sm:tracking-normal shadow-[0_1px_0_hsl(var(--border))]'
  const cellClass = 'whitespace-nowrap px-2 py-1.5 tabular-nums text-[11px] sm:text-sm'

  if (dayRows.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="No breakdown data"
        description="Log meals on the Daily tab to see macro distribution, top foods, and a day-by-day table for this period."
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Average macro distribution</CardTitle>
          <p className="text-xs text-muted-foreground">
            Share of calories from protein, carbs, and fat (daily averages)
          </p>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.fill ?? PIE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const grams = (item?.payload as { grams?: number })?.grams
                  return [`${value}% (${grams}g)`, item?.name ?? '']
                }}
                contentStyle={{ background: '#141414', border: '1px solid #333' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {pieData.map((d) => (
          <div key={d.name} className="rounded-lg bg-secondary/50 p-2">
            <p className="text-muted-foreground">{d.name}</p>
            <p className="font-bold text-primary">{d.value}%</p>
            <p className="text-muted-foreground">{d.grams}g avg</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top foods</CardTitle>
          <p className="text-xs text-muted-foreground">By total calories in period</p>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {topFoods.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No foods logged
              </li>
            ) : (
              topFoods.map((f, i) => (
                <li
                  key={f.foodId}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.quantityLabel}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {f.calories} cal
                  </span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Period averages (per logged day)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <AvgCell label="Calories" value={roundMacro(avg.calories, 0)} />
          <AvgCell label="Net" value={roundMacro(avg.net, 0)} accent />
          {MACRO_NUTRIENT_ORDER.map((key) => (
            <AvgCell
              key={key}
              label={MACRO_DISPLAY_LABELS[key]}
              value={`${avg[key]}g`}
            />
          ))}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold">Daily log table</h3>
        <p className="text-xs text-muted-foreground sm:hidden">
          Swipe sideways to see all columns →
        </p>
        <div className="-mx-4 sm:mx-0">
          <Table
            scrollable
            containerClassName="max-h-[min(52dvh,28rem)] overflow-y-auto rounded-lg border border-border"
            className="min-w-[40rem]"
          >
            <colgroup>
              <col className="min-w-[3.5rem]" />
              <col className="min-w-[4.5rem]" />
              <col className="min-w-[4rem]" />
              <col className="min-w-[4rem]" />
              <col className="min-w-[3.5rem]" />
              <col className="min-w-[4rem]" />
              <col className="min-w-[4.5rem]" />
              <col className="min-w-[4.5rem]" />
              <col className="min-w-[4rem]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={headerClass} onClick={() => toggleSort('date')}>
                  Date{sortIndicator('date')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('calories')}>
                  Calories{sortIndicator('calories')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('protein')}>
                  Protein{sortIndicator('protein')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('carbs')}>
                  Carbs{sortIndicator('carbs')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('fat')}>
                  Fat{sortIndicator('fat')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('fiber')}>
                  Fiber{sortIndicator('fiber')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('sugars')}>
                  Sugars{sortIndicator('sugars')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('net')}>
                  Net{sortIndicator('net')}
                </TableHead>
                <TableHead className={headerClass} onClick={() => toggleSort('vsGoal')}>
                  vs Goal{sortIndicator('vsGoal')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow
                  key={row.date}
                  className="cursor-pointer active:bg-secondary/80"
                  onClick={() => onDayClick(row.date)}
                >
                  <TableCell className={cellClass}>
                    {format(parseISO(row.date), 'MM/dd')}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {roundMacro(row.calories, 0)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {roundMacro(row.protein)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {roundMacro(row.carbs)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {roundMacro(row.fat)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {roundMacro(row.fiber)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {roundMacro(row.sugars)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {roundMacro(row.net, 0)}
                  </TableCell>
                  <TableCell
                    className={`${cellClass} font-medium ${
                      row.vsGoal > 0
                        ? 'text-amber-500'
                        : row.vsGoal < 0
                          ? 'text-emerald-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {formatVsGoal(row.vsGoal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function AvgCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${accent ? 'text-primary text-lg' : ''}`}>{value}</p>
    </div>
  )
}