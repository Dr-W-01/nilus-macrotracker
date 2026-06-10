import { format, isValid, parseISO } from 'date-fns'
import { datesInRange, todayString } from '@/lib/dates'
import { roundMacro } from '@/lib/macros'
import type { DailyLog } from '@/lib/types'
import { weightFromKg } from '@/lib/weight'
import type { WeightUnit } from '@/lib/weight'

export function getWeightLogDates(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.entries(dailyLogs)
    .filter(([, log]) => log.weightKg != null && log.weightKg > 0)
    .map(([date]) => date)
    .sort()
}

export function getAllTimeWeightRange(dailyLogs: Record<string, DailyLog>): {
  start: string
  end: string
} {
  const logged = getWeightLogDates(dailyLogs)
  const end = todayString()
  if (logged.length === 0) {
    return { start: end, end }
  }
  return { start: logged[0], end }
}

/** Format weight chart x-axis labels for logged-date ticks. */
export function weightChartAxisTick(dateStr: string, pointCount: number): string {
  const d = parseISO(dateStr)
  if (!isValid(d)) return dateStr
  if (pointCount > 24) return format(d, 'M/d')
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

/** Chart rows for logged weight dates only (no empty x-axis gaps). */
export function buildLoggedWeightChartData(
  dailyLogs: Record<string, DailyLog>,
  unit: WeightUnit,
  trendWindow = 7,
): WeightChartPoint[] {
  const loggedDates = getWeightLogDates(dailyLogs)
  if (loggedDates.length === 0) return []

  const range = { start: loggedDates[0], end: loggedDates[loggedDates.length - 1] }
  const calendarDates = datesInRange(range.start, range.end)
  const weights = calendarDates.map((date) => {
    const kg = dailyLogs[date]?.weightKg
    if (kg == null || !Number.isFinite(kg) || kg <= 0) return null
    return roundMacro(weightFromKg(kg, unit), 2)
  })
  const trends = weightTrendLine(weights, trendWindow)

  return loggedDates.map((date) => {
    const idx = calendarDates.indexOf(date)
    return {
      date,
      label: weightChartAxisTick(date, loggedDates.length),
      weight: weights[idx],
      trend: idx >= 0 ? trends[idx] : null,
    }
  })
}

export function countLoggedWeights(dailyLogs: Record<string, DailyLog>): number {
  return getWeightLogDates(dailyLogs).length
}