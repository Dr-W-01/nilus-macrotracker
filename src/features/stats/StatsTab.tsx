import { useEffect, useMemo } from 'react'
import { parseISO } from 'date-fns'
import { BarChart3 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsPeriodBar } from '@/components/stats/StatsPeriodBar'
import { StatsOverviewPanel } from '@/features/stats/StatsOverviewPanel'
import { StatsTrendsPanel } from '@/features/stats/StatsTrendsPanel'
import { StatsBreakdownsPanel } from '@/features/stats/StatsBreakdownsPanel'
import { clampStatsRange, getMonthRange, getWeekRangeForDate } from '@/lib/dates'
import { navigateToDailyLogging } from '@/lib/navigateToDaily'
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
  const setStatsRange = useMacroStore((s) => s.setStatsRange)
  const setCurrentDate = useMacroStore((s) => s.setCurrentDate)
  const setCurrentTab = useMacroStore((s) => s.setCurrentTab)
  const accentColor = useMacroStore((s) => s.settings.accentColor)

  const range = useMemo(() => {
    const anchor = parseISO(statsAnchorDate)
    const raw =
      statsPeriod === 'week'
        ? getWeekRangeForDate(statsAnchorDate)
        : statsPeriod === 'month'
          ? getMonthRange(anchor)
          : { start: statsRangeStart, end: statsRangeEnd }
    return clampStatsRange(raw)
  }, [statsPeriod, statsAnchorDate, statsRangeStart, statsRangeEnd])

  useEffect(() => {
    if (statsPeriod !== 'week') return
    const w = getWeekRangeForDate(statsAnchorDate)
    if (statsRangeStart !== w.start || statsRangeEnd !== w.end) {
      setStatsRange(w.start, w.end)
    }
  }, [statsPeriod, statsAnchorDate, statsRangeStart, statsRangeEnd, setStatsRange])

  const goToDay = (date: string) => {
    setCurrentDate(date)
    setCurrentTab('daily')
  }

  const activeView =
    statsView === 'overview' || statsView === 'trends' || statsView === 'breakdowns'
      ? statsView
      : 'overview'

  return (
    <div className="stats-tab">
      <header className="tab-sticky-header">
        <div className="space-y-2 px-4 py-2">
          <div className="flex min-h-12 items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
            <h1 className="text-base font-bold">Stats</h1>
          </div>
          <StatsPeriodBar range={range} compact />
        </div>
      </header>

      <div className="space-y-4 p-4">

      <Tabs
        value={activeView}
        onValueChange={(v) =>
          setStatsView(v as 'overview' | 'trends' | 'breakdowns')
        }
      >
        <TabsList className="grid h-10 grid-cols-3">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs sm:text-sm">
            Trends
          </TabsTrigger>
          <TabsTrigger value="breakdowns" className="text-xs sm:text-sm">
            Breakdowns
          </TabsTrigger>
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
          onStartLogging={navigateToDailyLogging}
        />
      )}

      {activeView === 'trends' && (
        <StatsTrendsPanel
          range={range}
          statsPeriod={statsPeriod}
          dailyLogs={dailyLogs}
          foodLibrary={foodLibrary}
          settings={settings}
          accentColor={accentColor}
          onDayClick={goToDay}
          onStartLogging={navigateToDailyLogging}
        />
      )}

      {activeView === 'breakdowns' && (
        <StatsBreakdownsPanel
          range={range}
          dailyLogs={dailyLogs}
          foodLibrary={foodLibrary}
          settings={settings}
          onDayClick={goToDay}
          onStartLogging={navigateToDailyLogging}
        />
      )}
      </div>
    </div>
  )
}