import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getMonthRange, getWeekRange, shiftMonthRange, shiftWeekRange } from '@/lib/dates'
import { format, parseISO } from 'date-fns'
import { useMacroStore } from '@/store/useMacroStore'

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
    <section className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Period
      </p>
      <Tabs
        value={statsPeriod}
        onValueChange={(v) => {
          const p = v as 'week' | 'month' | 'custom'
          setStatsPeriod(p)
          if (p === 'week') {
            const w = getWeekRange(parseISO(statsAnchorDate))
            setStatsRange(w.start, w.end)
          } else if (p === 'month') {
            const m = getMonthRange(parseISO(statsAnchorDate))
            setStatsRange(m.start, m.end)
          }
        }}
      >
        <TabsList className="grid h-9 grid-cols-3 bg-muted/60">
          <TabsTrigger value="week" className="text-xs sm:text-sm">
            Week
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs sm:text-sm">
            Month
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">
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