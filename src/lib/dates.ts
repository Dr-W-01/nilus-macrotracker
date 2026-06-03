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

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDisplayDate(dateStr: string): string {
  const d = parseISO(dateStr)
  if (!isValid(d)) return dateStr
  return format(d, 'EEE, MMM d')
}

export function shiftDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd')
}

export function getWeekRange(anchor: Date = new Date()) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = endOfWeek(anchor, { weekStartsOn: 1 })
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
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