import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Bar,
  BarChart,
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
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  datesInRange,
  getMonthRange,
  getWeekRange,
  shiftMonthRange,
  shiftWeekRange,
} from '@/lib/dates'
import { computeDayMacros, roundMacro } from '@/lib/macros'
import { useMacroStore } from '@/store/useMacroStore'

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

export function StatsTab() {
  const dailyLogs = useMacroStore((s) => s.dailyLogs)
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const settings = useMacroStore((s) => s.settings)
  const statsPeriod = useMacroStore((s) => s.statsPeriod)
  const setStatsPeriod = useMacroStore((s) => s.setStatsPeriod)
  const statsRangeStart = useMacroStore((s) => s.statsRangeStart)
  const statsRangeEnd = useMacroStore((s) => s.statsRangeEnd)
  const setStatsRange = useMacroStore((s) => s.setStatsRange)
  const statsView = useMacroStore((s) => s.statsView)
  const setStatsView = useMacroStore((s) => s.setStatsView)
  const statsAnchorDate = useMacroStore((s) => s.statsAnchorDate)
  const setStatsAnchorDate = useMacroStore((s) => s.setStatsAnchorDate)
  const setCurrentDate = useMacroStore((s) => s.setCurrentDate)
  const setCurrentTab = useMacroStore((s) => s.setCurrentTab)
  const accentColor = useMacroStore((s) => s.settings.accentColor)

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(true)

  const range = useMemo(() => {
    const anchor = parseISO(statsAnchorDate)
    if (statsPeriod === 'week') return getWeekRange(anchor)
    if (statsPeriod === 'month') return getMonthRange(anchor)
    return { start: statsRangeStart, end: statsRangeEnd }
  }, [statsPeriod, statsAnchorDate, statsRangeStart, statsRangeEnd])

  const defaultGoal = settings.goalTemplates.find(
    (g) => g.id === settings.defaultTemplateId,
  ) ?? settings.goalTemplates[0]

  const dayRows = useMemo(() => {
    return datesInRange(range.start, range.end)
      .map((date) => {
        const log = dailyLogs[date]
        if (!log || log.foods.length === 0) return null
        const macros = computeDayMacros(foodLibrary, log.foods)
        const net = macros.calories - log.burnedCalories
        const goal =
          settings.goalTemplates.find((g) => g.id === log.goalTemplateId) ??
          defaultGoal
        const vsGoal = net - goal.calories
        return { date, ...macros, net, burned: log.burnedCalories, vsGoal }
      })
      .filter(Boolean) as {
      date: string
      calories: number
      protein: number
      carbs: number
      fat: number
      fiber: number
      sugars: number
      net: number
      burned: number
      vsGoal: number
    }[]
  }, [range, dailyLogs, foodLibrary, settings.goalTemplates, defaultGoal])

  const actualTotals = useMemo(
    () =>
      dayRows.reduce(
        (acc, d) => ({
          calories: acc.calories + d.calories,
          protein: acc.protein + d.protein,
          carbs: acc.carbs + d.carbs,
          fat: acc.fat + d.fat,
          fiber: acc.fiber + d.fiber,
          sugars: acc.sugars + d.sugars,
          net: acc.net + d.net,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0, net: 0 },
      ),
    [dayRows],
  )

  const loggedDays = dayRows.length
  const proportionalGoals = {
    calories: defaultGoal.calories * loggedDays,
    protein: defaultGoal.protein * loggedDays,
    carbs: defaultGoal.carbs * loggedDays,
    fat: defaultGoal.fat * loggedDays,
    fiber: defaultGoal.fiber * loggedDays,
    sugars: defaultGoal.sugars * loggedDays,
  }

  const chartData = dayRows.map((d) => ({
    date: format(parseISO(d.date), 'MM/dd'),
    fullDate: d.date,
    net: roundMacro(d.net, 0),
    protein: roundMacro(d.protein),
    carbs: roundMacro(d.carbs),
    fat: roundMacro(d.fat),
  }))

  const sortedRows = [...dayRows].sort((a, b) => {
    const mul = sortAsc ? 1 : -1
    if (sortKey === 'date') return mul * a.date.localeCompare(b.date)
    return mul * (a[sortKey] - b[sortKey])
  })

  const shiftPeriod = (dir: -1 | 1) => {
    if (statsPeriod === 'week') {
      const next = shiftWeekRange(range.start, dir)
      setStatsRange(next.start, next.end)
      setStatsAnchorDate(next.start)
    } else if (statsPeriod === 'month') {
      const next = shiftMonthRange(range.start, dir)
      setStatsRange(next.start, next.end)
      setStatsAnchorDate(next.start)
    }
  }

  const goToDay = (date: string) => {
    setCurrentDate(date)
    setCurrentTab('daily')
  }

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

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Stats</h1>

      <Tabs value={statsPeriod} onValueChange={(v) => {
        const p = v as 'week' | 'month' | 'custom'
        setStatsPeriod(p)
        if (p === 'week') {
          const w = getWeekRange(parseISO(statsAnchorDate))
          setStatsRange(w.start, w.end)
        } else if (p === 'month') {
          const m = getMonthRange(parseISO(statsAnchorDate))
          setStatsRange(m.start, m.end)
        }
      }}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      {statsPeriod === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Start</label>
            <Input type="date" value={statsRangeStart} onChange={(e) => setStatsRange(e.target.value, statsRangeEnd)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End</label>
            <Input type="date" value={statsRangeEnd} onChange={(e) => setStatsRange(statsRangeStart, e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => shiftPeriod(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {range.start} → {range.end}
        </span>
        <Button variant="ghost" size="icon" onClick={() => shiftPeriod(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Actual ({loggedDays} days)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Cal: {roundMacro(actualTotals.calories, 0)}</p>
            <p>Net: {roundMacro(actualTotals.net, 0)}</p>
            <p>P: {roundMacro(actualTotals.protein)}g</p>
            <p>C: {roundMacro(actualTotals.carbs)}g</p>
            <p>F: {roundMacro(actualTotals.fat)}g</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Proportional goals</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>{loggedDays} logged days × daily goal</p>
            <p>Cal: {roundMacro(proportionalGoals.calories, 0)}</p>
            <p>P: {roundMacro(proportionalGoals.protein)}g</p>
            <p>C: {roundMacro(proportionalGoals.carbs)}g</p>
            <p>F: {roundMacro(proportionalGoals.fat)}g</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={statsView} onValueChange={(v) => setStatsView(v as 'table' | 'charts')}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
      </Tabs>

      {statsView === 'table' ? (
        dayRows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No logged days in this period</p>
        ) : (
          <div className="space-y-1.5">
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
                      Protein (g){sortIndicator('protein')}
                    </TableHead>
                    <TableHead className={headerClass} onClick={() => toggleSort('carbs')}>
                      Carbs (g){sortIndicator('carbs')}
                    </TableHead>
                    <TableHead className={headerClass} onClick={() => toggleSort('fat')}>
                      Fat (g){sortIndicator('fat')}
                    </TableHead>
                    <TableHead className={headerClass} onClick={() => toggleSort('fiber')}>
                      Fiber (g){sortIndicator('fiber')}
                    </TableHead>
                    <TableHead className={headerClass} onClick={() => toggleSort('sugars')}>
                      Sugars (g){sortIndicator('sugars')}
                    </TableHead>
                    <TableHead className={headerClass} onClick={() => toggleSort('net')}>
                      Net Cal{sortIndicator('net')}
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
                      onClick={() => goToDay(row.date)}
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
        )
      ) : chartData.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No data for charts</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Net Calories</CardTitle></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  onClick={(state) => {
                    const idx = typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : -1
                    const row = chartData[idx]
                    if (row) goToDay(row.fullDate)
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#141414', border: '1px solid #333' }} />
                  <Line type="monotone" dataKey="net" stroke={accentColor} strokeWidth={2} dot={{ r: 4, fill: accentColor, cursor: 'pointer' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Macro breakdown</CardTitle></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  onClick={(state) => {
                    const idx = typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : -1
                    const row = chartData[idx]
                    if (row) goToDay(row.fullDate)
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#141414', border: '1px solid #333' }} />
                  <Legend />
                  <Bar dataKey="protein" stackId="a" fill={accentColor} />
                  <Bar dataKey="carbs" stackId="a" fill={accentColor} fillOpacity={0.75} />
                  <Bar dataKey="fat" stackId="a" fill={accentColor} fillOpacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}