import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  compact?: boolean
}

export function StatsPeriodBar({ range, compact = false }: StatsPeriodBarProps) {
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
    <section className={cn(compact ? 'space-y-1.5' : 'space-y-2 rounded-xl border border-primary/20 bg-gradient-to-b from-[color-mix(in_oklab,var(--primary)_8%,var(--card))] to-card p-3 shadow-sm')}>
      {!compact && <p className="text-sm font-semibold">Period</p>}
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
        <TabsList className={cn('grid grid-cols-3 bg-secondary/80 p-0.5', compact ? 'h-7' : 'h-9 p-1')}>
          <TabsTrigger value="week" className="text-xs font-medium">
            This Week
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs font-medium">
            Month
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs font-medium">
            Custom
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {statsPeriod === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Start</label>
            <Input
              type="date"
              className={compact ? 'h-7 min-h-7 text-xs' : undefined}
              value={statsRangeStart}
              onChange={(e) => setStatsRange(e.target.value, statsRangeEnd)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">End</label>
            <Input
              type="date"
              className={compact ? 'h-7 min-h-7 text-xs' : undefined}
              max={statsLastCompleteDate()}
              value={statsRangeEnd}
              onChange={(e) => setStatsRange(statsRangeStart, e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" className={compact ? 'h-7 w-7' : undefined} onClick={() => shiftPeriod(-1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className={cn('text-center text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {format(parseISO(range.start), 'MMM d')} – {format(parseISO(range.end), 'MMM d, yyyy')}
        </span>
        <Button variant="ghost" size="icon" className={compact ? 'h-7 w-7' : undefined} onClick={() => shiftPeriod(1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  )
}