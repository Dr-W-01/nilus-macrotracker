import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Logging consistency</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loggedInWindow} of the last 14 days with food logged
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5">
            <Flame className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm font-bold tabular-nums text-primary">
              {streak}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Current streak:{' '}
            <span className="font-semibold text-foreground">
              {streak} {streak === 1 ? 'day' : 'days'}
            </span>
          </p>
          <div className="flex items-end justify-between gap-1">
            {days.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1 min-w-0">
                <span
                  className={cn(
                    'h-3 w-3 rounded-full border transition-colors',
                    day.logged
                      ? 'border-primary bg-primary'
                      : 'border-border bg-secondary/60',
                  )}
                  title={`${day.weekday}: ${day.logged ? 'logged' : 'no food'}`}
                />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                  {day.weekday.charAt(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}