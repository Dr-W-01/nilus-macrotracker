import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  STATS_SECTION_CARD_CLASS,
  StatsSectionHeader,
} from '@/components/stats/StatsSectionCard'
import {
  getMonthRange,
  getWeekRange,
  getWeekRangeForDate,
  shiftMonthRange,
  shiftWeekRange,
  statsLastCompleteDate,
  todayString,
} from '@/lib/dates'
import { format, parseISO } from 'date-fns'
import { useMacroStore } from '@/store/useMacroStore'
import { cn } from '@/lib/utils'

interface StatsPeriodBarProps {
  range: { start: string; end: string }
}

export function StatsPeriodBar({ range }: StatsPeriodBarProps) {
  const statsPeriod = useMacroStore((s) => s.statsPeriod)
  const setStatsPeriod = useMacroStore((s) => s.setStatsPeriod)
  const statsRangeStart = useMacroStore((s) => s.statsRangeStart)
  const statsRangeEnd = useMacroStore((s) => s.statsRangeEnd)
  const setStatsRange = useMacroStore((s) => s.setStatsRange)
  const statsAnchorDate = useMacroStore((s) => s.statsAnchorDate)
  const setStatsAnchorDate = useMacroStore((s) => s.setStatsAnchorDate)

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

  return (
    <section
      className={cn(
        'space-y-2 rounded-xl border p-3 shadow-sm',
        STATS_SECTION_CARD_CLASS,
      )}
    >
      <StatsSectionHeader title="Period" />
      <Tabs
        value={statsPeriod}
        onValueChange={(v) => {
          const p = v as 'week' | 'month' | 'custom'
          setStatsPeriod(p)
          if (p === 'week') {
            const switchingToWeek = statsPeriod !== 'week'
            const w = switchingToWeek
              ? getWeekRange(new Date())
              : getWeekRangeForDate(statsAnchorDate)
            setStatsRange(w.start, w.end)
            if (switchingToWeek) setStatsAnchorDate(todayString())
          } else if (p === 'month') {
            const m = getMonthRange(parseISO(statsAnchorDate))
            setStatsRange(m.start, m.end)
          }
        }}
      >
        <TabsList className="grid h-9 grid-cols-3 bg-secondary/80 p-1">
          <TabsTrigger value="week" className="text-xs font-medium sm:text-sm">
            This Week
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs font-medium sm:text-sm">
            Month
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs font-medium sm:text-sm">
            Custom
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {statsPeriod === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Start</label>
            <Input
              type="date"
              value={statsRangeStart}
              onChange={(e) => setStatsRange(e.target.value, statsRangeEnd)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End</label>
            <Input
              type="date"
              max={statsLastCompleteDate()}
              value={statsRangeEnd}
              onChange={(e) => setStatsRange(statsRangeStart, e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => shiftPeriod(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-center text-sm text-muted-foreground">
          {format(parseISO(range.start), 'MMM d')} – {format(parseISO(range.end), 'MMM d, yyyy')}
        </span>
        <Button variant="ghost" size="icon" onClick={() => shiftPeriod(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </section>
  )
}