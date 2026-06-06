import { format, isValid, parseISO, subDays } from 'date-fns'
import { datesInRange, todayString } from '@/lib/dates'
import { roundMacro } from '@/lib/macros'
import type { DailyLog } from '@/lib/types'
import { weightFromKg } from '@/lib/weight'
import type { WeightUnit } from '@/lib/weight'

export type WeightRangePreset = '1w' | '1m' | '3m' | '6m' | '1y' | 'all'

export const WEIGHT_RANGE_OPTIONS: { value: WeightRangePreset; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]

const PRESET_DAYS: Record<Exclude<WeightRangePreset, 'all'>, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
}

export function getWeightLogDates(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.entries(dailyLogs)
    .filter(([, log]) => log.weightKg != null && log.weightKg > 0)
    .map(([date]) => date)
    .sort()
}

export function getWeightChartRange(
  preset: WeightRangePreset,
  dailyLogs: Record<string, DailyLog>,
): { start: string; end: string } {
  const end = todayString()
  if (preset === 'all') {
    const logged = getWeightLogDates(dailyLogs)
    if (logged.length === 0) {
      return { start: end, end }
    }
    return { start: logged[0], end }
  }
  const days = PRESET_DAYS[preset]
  const start = format(subDays(parseISO(end), days - 1), 'yyyy-MM-dd')
  return { start, end }
}

/** Format weight chart x-axis ticks; uses unique ISO dates as categories. */
export function weightChartAxisTick(dateStr: string, spanDays: number): string {
  const d = parseISO(dateStr)
  if (!isValid(d)) return dateStr
  if (spanDays > 400) return format(d, 'MMM yy')
  if (spanDays > 90) return format(d, 'M/d')
  return format(d, 'MM/dd')
}

export type WeightChartPoint = {
  date: string
  label: string
  weight: number | null
  trend: number | null
}

/** Moving average over calendar days; null weight days are skipped in the window. */
export function weightTrendLine(
  weights: (number | null)[],
  window: number,
): (number | null)[] {
  return weights.map((_, i) => {
    const slice = weights
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v != null)
    if (slice.length === 0) return null
    const sum = slice.reduce((a, b) => a + b, 0)
    return roundMacro(sum / slice.length, 2)
  })
}

export function buildWeightChartData(
  range: { start: string; end: string },
  dailyLogs: Record<string, DailyLog>,
  unit: WeightUnit,
  trendWindow = 7,
): WeightChartPoint[] {
  const dates = datesInRange(range.start, range.end)
  const weights = dates.map((date) => {
    const kg = dailyLogs[date]?.weightKg
    if (kg == null || !Number.isFinite(kg) || kg <= 0) return null
    return roundMacro(weightFromKg(kg, unit), 2)
  })
  const trends = weightTrendLine(weights, trendWindow)

  return dates.map((date, i) => ({
    date,
    label: format(parseISO(date), 'MM/dd'),
    weight: weights[i],
    trend: trends[i],
  }))
}

export function countWeightLogsInRange(
  range: { start: string; end: string },
  dailyLogs: Record<string, DailyLog>,
): number {
  return datesInRange(range.start, range.end).filter((date) => {
    const kg = dailyLogs[date]?.weightKg
    return kg != null && kg > 0
  }).length
}