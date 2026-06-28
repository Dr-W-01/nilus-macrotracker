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
import {
  StatsSectionCard,
  StatsSectionHeader,
} from '@/components/stats/StatsSectionCard'
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
import { chartTooltipStyle } from '@/lib/chartTheme'
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
  onStartLogging?: () => void
}

export function StatsBreakdownsPanel({
  range,
  dailyLogs,
  foodLibrary,
  settings,
  onDayClick,
  onStartLogging,
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
    'sticky top-0 z-10 cursor-pointer whitespace-nowrap bg-background px-2 py-2 text-[10px] font-semibold uppercase tracking-wide sm:text-xs sm:normal-case sm:tracking-normal shadow-[0_1px_0_var(--border)]'
  const dateHeaderClass = `${headerClass} sticky left-0 z-20 min-w-[4.5rem]`
  const cellClass = 'whitespace-nowrap px-2 py-1.5 tabular-nums text-[11px] sm:text-sm'
  const dateCellClass = `${cellClass} sticky left-0 z-[1] bg-background min-w-[4.5rem]`

  if (dayRows.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="No breakdown data"
        description="Nothing logged in this range yet. Start tracking to see macro distribution, top foods, and a day-by-day breakdown."
        actionLabel="Start logging"
        onAction={onStartLogging}
      />
    )
  }

  return (
    <div className="space-y-4">
      <StatsSectionCard contentClassName="space-y-2">
        <StatsSectionHeader
          title="Average macro distribution"
          description="Share of calories from protein, carbs, and fat (daily averages)"
          className="mb-0"
        />
        <div className="-mt-1 h-52">
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
                contentStyle={chartTooltipStyle}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {pieData.map((d) => (
            <div key={d.name} className="rounded-lg border border-border/60 bg-secondary/30 p-2">
              <p className="text-muted-foreground">{d.name}</p>
              <p className="font-bold text-primary">{d.value}%</p>
              <p className="text-muted-foreground">{d.grams}g avg</p>
            </div>
          ))}
        </div>
      </StatsSectionCard>

      <StatsSectionCard contentClassName="space-y-3">
        <StatsSectionHeader title="Top foods" />
        <ul className="-mx-4 divide-y divide-border border-t border-border sm:-mx-0 sm:rounded-lg sm:border">
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
      </StatsSectionCard>

      <StatsSectionCard contentClassName="space-y-3">
        <StatsSectionHeader
          title="Period averages"
          description={`${format(parseISO(range.start), 'MMM d')} – ${format(parseISO(range.end), 'MMM d, yyyy')}`}
        />
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <AvgCell label="Calories" value={roundMacro(avg.calories, 0)} />
          <AvgCell label="Net" value={roundMacro(avg.net, 0)} accent />
          {MACRO_NUTRIENT_ORDER.map((key) => (
            <AvgCell
              key={key}
              label={MACRO_DISPLAY_LABELS[key]}
              value={`${avg[key]}g`}
            />
          ))}
        </div>
      </StatsSectionCard>

      <StatsSectionCard contentClassName="space-y-3">
        <div>
          <StatsSectionHeader title="Daily log table" />
          <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
            Swipe sideways to see all columns →
          </p>
        </div>
        <div className="-mx-4 sm:mx-0">
          <div className="overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border border-border [-webkit-overflow-scrolling:touch]">
            <div className="max-h-[min(60dvh,32rem)] overflow-y-auto overscroll-y-contain">
          <Table
            containerClassName="overflow-visible"
            className="min-w-[40rem] w-full table-auto"
          >
            <colgroup>
              <col className="min-w-[4.5rem]" />
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
                <TableHead className={dateHeaderClass} onClick={() => toggleSort('date')}>
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
                  <TableCell className={dateCellClass}>
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
      </StatsSectionCard>
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
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${accent ? 'text-primary text-lg' : ''}`}>{value}</p>
    </div>
  )
}