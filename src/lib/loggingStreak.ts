import { format, parseISO } from 'date-fns'
import { shiftDate, todayString } from '@/lib/dates'
import type { DailyLog } from '@/lib/types'

export function dayHasLoggedFood(log: DailyLog | undefined): boolean {
  return log != null && log.foods.length > 0
}

/** Consecutive days with logged food ending at anchorDate (inclusive). */
export function computeLoggingStreak(
  dailyLogs: Record<string, DailyLog>,
  anchorDate: string = todayString(),
): number {
  let streak = 0
  let date = anchorDate
  while (dayHasLoggedFood(dailyLogs[date])) {
    streak += 1
    date = shiftDate(date, -1)
  }
  return streak
}

export type ConsistencyDay = {
  date: string
  logged: boolean
  weekday: string
}

/** Recent calendar days for a lightweight consistency strip (oldest → newest). */
export function buildConsistencyDays(
  dailyLogs: Record<string, DailyLog>,
  count = 14,
  endDate: string = todayString(),
): ConsistencyDay[] {
  const days: ConsistencyDay[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = shiftDate(endDate, -offset)
    days.push({
      date,
      logged: dayHasLoggedFood(dailyLogs[date]),
      weekday: format(parseISO(date), 'EEE'),
    })
  }
  return days
}