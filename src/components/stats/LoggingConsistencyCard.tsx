import { Flame } from 'lucide-react'
import {
  StatsSectionCard,
  StatsSectionHeader,
} from '@/components/stats/StatsSectionCard'
import {
  buildConsistencyDays,
  computeLoggingStreak,
} from '@/lib/loggingStreak'
import { todayString } from '@/lib/dates'
import type { DailyLog } from '@/lib/types'
import { cn } from '@/lib/utils'

interface LoggingConsistencyCardProps {
  dailyLogs: Record<string, DailyLog>
}

export function LoggingConsistencyCard({ dailyLogs }: LoggingConsistencyCardProps) {
  const streak = computeLoggingStreak(dailyLogs, todayString())
  const days = buildConsistencyDays(dailyLogs, 14, todayString())
  const loggedInWindow = days.filter((d) => d.logged).length

  return (
    <StatsSectionCard>
      <div className="flex items-start justify-between gap-3">
        <StatsSectionHeader
          title="Logging consistency"
          description={`${loggedInWindow} of the last 14 days with food logged`}
        />
        <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5">
          <Flame className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-bold tabular-nums text-foreground">{streak}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          Current streak:{' '}
          <span className="font-semibold text-foreground">
            {streak} {streak === 1 ? 'day' : 'days'}
          </span>
        </p>
        <div className="flex items-end justify-between gap-1">
          {days.map((day) => (
            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  'h-3 w-3 rounded-full border transition-colors',
                  day.logged
                    ? 'border-primary bg-primary'
                    : 'border-border bg-secondary/60',
                )}
                title={`${day.weekday}: ${day.logged ? 'logged' : 'no food'}`}
              />
              <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                {day.weekday.charAt(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </StatsSectionCard>
  )
}