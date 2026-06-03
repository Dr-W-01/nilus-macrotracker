import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsPeriodBar } from '@/components/stats/StatsPeriodBar'
import { StatsOverviewPanel } from '@/features/stats/StatsOverviewPanel'
import { StatsTrendsPanel } from '@/features/stats/StatsTrendsPanel'
import { StatsBreakdownsPanel } from '@/features/stats/StatsBreakdownsPanel'
import { getMonthRange, getWeekRange } from '@/lib/dates'
import { useMacroStore } from '@/store/useMacroStore'

export function StatsTab() {
  const dailyLogs = useMacroStore((s) => s.dailyLogs)
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const settings = useMacroStore((s) => s.settings)
  const statsPeriod = useMacroStore((s) => s.statsPeriod)
  const statsRangeStart = useMacroStore((s) => s.statsRangeStart)
  const statsRangeEnd = useMacroStore((s) => s.statsRangeEnd)
  const statsAnchorDate = useMacroStore((s) => s.statsAnchorDate)
  const statsView = useMacroStore((s) => s.statsView)
  const setStatsView = useMacroStore((s) => s.setStatsView)
  const setCurrentDate = useMacroStore((s) => s.setCurrentDate)
  const setCurrentTab = useMacroStore((s) => s.setCurrentTab)
  const accentColor = useMacroStore((s) => s.settings.accentColor)

  const range = useMemo(() => {
    const anchor = parseISO(statsAnchorDate)
    if (statsPeriod === 'week') return getWeekRange(anchor)
    if (statsPeriod === 'month') return getMonthRange(anchor)
    return { start: statsRangeStart, end: statsRangeEnd }
  }, [statsPeriod, statsAnchorDate, statsRangeStart, statsRangeEnd])

  const goToDay = (date: string) => {
    setCurrentDate(date)
    setCurrentTab('daily')
  }

  const activeView =
    statsView === 'overview' || statsView === 'trends' || statsView === 'breakdowns'
      ? statsView
      : 'overview'

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Stats</h1>

      <StatsPeriodBar range={range} />

      <Tabs
        value={activeView}
        onValueChange={(v) =>
          setStatsView(v as 'overview' | 'trends' | 'breakdowns')
        }
      >
        <TabsList className="grid h-10 grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeView === 'overview' && (
        <StatsOverviewPanel
          range={range}
          statsPeriod={statsPeriod}
          dailyLogs={dailyLogs}
          foodLibrary={foodLibrary}
          settings={settings}
          accentColor={accentColor}
        />
      )}

      {activeView === 'trends' && (
        <StatsTrendsPanel
          range={range}
          dailyLogs={dailyLogs}
          foodLibrary={foodLibrary}
          settings={settings}
          accentColor={accentColor}
          onDayClick={goToDay}
        />
      )}

      {activeView === 'breakdowns' && (
        <StatsBreakdownsPanel
          range={range}
          dailyLogs={dailyLogs}
          foodLibrary={foodLibrary}
          settings={settings}
          onDayClick={goToDay}
        />
      )}
    </div>
  )
}