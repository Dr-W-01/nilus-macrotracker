import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'

/** US-style week: Sunday (0) through Saturday */
export const WEEK_STARTS_ON = 0 as const

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Last calendar day included in Stats (today is excluded as incomplete). */
export function statsLastCompleteDate(): string {
  return shiftDate(todayString(), -1)
}

/** Clamp a range so Stats only use completed past days (end ≤ yesterday). */
export function clampStatsRange(range: { start: string; end: string }): {
  start: string
  end: string
} {
  const lastComplete = statsLastCompleteDate()
  let end = range.end
  if (end > lastComplete) end = lastComplete
  let start = range.start
  if (start > end) start = end
  return { start, end }
}

export function formatDisplayDate(dateStr: string): string {
  const d = parseISO(dateStr)
  if (!isValid(d)) return dateStr
  return format(d, 'EEE, MMM d')
}

const DAILY_VIEW_DAY_LABELS = ['SUN', 'MON', 'TUES', 'WED', 'THRS', 'FRI', 'SAT'] as const

/** Two-line Daily tab header in view mode: ALL-CAPS weekday + short date. */
export function formatDailyViewHeaderDate(dateStr: string): {
  dayLabel: string
  dateLabel: string
} {
  const d = parseISO(dateStr)
  if (!isValid(d)) return { dayLabel: '', dateLabel: dateStr }
  return {
    dayLabel: DAILY_VIEW_DAY_LABELS[d.getDay()],
    dateLabel: format(d, 'MMM d'),
  }
}

export function shiftDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd')
}

export function getWeekRange(anchor: Date = new Date()) {
  const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON })
  const end = endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON })
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

export function isDateInRange(date: string, range: { start: string; end: string }): boolean {
  const d = parseISO(date)
  const start = parseISO(range.start)
  const end = parseISO(range.end)
  return d >= start && d <= end
}

/** Calendar week (Sun–Sat) containing the given date */
export function getWeekRangeForDate(dateStr: string) {
  return getWeekRange(parseISO(dateStr))
}

export function getMonthRange(anchor: Date = new Date()) {
  const start = startOfMonth(anchor)
  const end = endOfMonth(anchor)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

export function shiftWeekRange(start: string, direction: -1 | 1) {
  const d = parseISO(start)
  const shifted = direction === -1 ? subWeeks(d, 1) : addWeeks(d, 1)
  return getWeekRange(shifted)
}

export function shiftMonthRange(start: string, direction: -1 | 1) {
  const d = parseISO(start)
  const shifted = direction === -1 ? subMonths(d, 1) : addMonths(d, 1)
  return getMonthRange(shifted)
}

export function datesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  let current = parseISO(start)
  const endDate = parseISO(end)
  while (current <= endDate) {
    dates.push(format(current, 'yyyy-MM-dd'))
    current = addDays(current, 1)
  }
  return dates
}

export function getLetterGroup(name: string): string {
  const first = name.trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(first) ? first : '#'
}