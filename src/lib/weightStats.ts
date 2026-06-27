import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
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

export function getWeightLogDatesInRange(
  dailyLogs: Record<string, DailyLog>,
  range: { start: string; end: string },
): string[] {
  return getWeightLogDates(dailyLogs).filter(
    (date) => date >= range.start && date <= range.end,
  )
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
export function weightChartAxisTick(dateStr: string, spanDays: number): string {
  const d = parseISO(dateStr)
  if (!isValid(d)) return dateStr
  if (spanDays > 120) return format(d, 'MMM')
  if (spanDays > 45) return format(d, 'M/d')
  if (spanDays > 14) return format(d, 'M/d')
  return format(d, 'MM/dd')
}

export type WeightChartPoint = {
  date: string
  label: string
  weight: number | null
  trend: number | null
}

export type WeightPeriodStats = {
  highest: number
  highestDate: string
  lowest: number
  lowestDate: string
  average: number
  startWeight: number
  startDate: string
  latestWeight: number
  latestDate: string
  netChange: number
}

export type WeightTrendInfo = {
  changePerWeek: number
  direction: 'losing' | 'gaining' | 'stable'
  projection4Weeks: number | null
}

const STABLE_RATE_THRESHOLD = 0.05

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

/** Pick x-axis ticks: first, last, and evenly spaced milestones (max N labels). */
export function buildWeightChartXTicks(dates: string[], maxTicks = 7): string[] {
  if (dates.length === 0) return []
  if (dates.length <= maxTicks) return [...dates]

  const tickIndexes = new Set<number>([0, dates.length - 1])
  const innerCount = maxTicks - 2
  for (let i = 1; i <= innerCount; i++) {
    tickIndexes.add(Math.round((i / (innerCount + 1)) * (dates.length - 1)))
  }

  return [...tickIndexes]
    .sort((a, b) => a - b)
    .map((index) => dates[index])
}

/** Chart rows for logged weight dates only (no empty x-axis gaps). */
export function buildLoggedWeightChartData(
  dailyLogs: Record<string, DailyLog>,
  unit: WeightUnit,
  range: { start: string; end: string },
  trendWindow = 7,
): WeightChartPoint[] {
  const loggedDates = getWeightLogDatesInRange(dailyLogs, range)
  if (loggedDates.length === 0) return []

  const spanDays = Math.max(
    1,
    differenceInCalendarDays(
      parseISO(loggedDates[loggedDates.length - 1]),
      parseISO(loggedDates[0]),
    ),
  )

  const calendarDates = datesInRange(
    loggedDates[0],
    loggedDates[loggedDates.length - 1],
  )
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
      label: weightChartAxisTick(date, spanDays),
      weight: weights[idx],
      trend: idx >= 0 ? trends[idx] : null,
    }
  })
}

export function computeWeightPeriodStats(
  points: WeightChartPoint[],
): WeightPeriodStats | null {
  const logged = points.filter((p): p is WeightChartPoint & { weight: number } =>
    p.weight != null,
  )
  if (logged.length === 0) return null

  let highest = logged[0]
  let lowest = logged[0]
  let sum = 0

  for (const point of logged) {
    sum += point.weight
    if (point.weight > highest.weight) highest = point
    if (point.weight < lowest.weight) lowest = point
  }

  const start = logged[0]
  const latest = logged[logged.length - 1]

  return {
    highest: highest.weight,
    highestDate: highest.date,
    lowest: lowest.weight,
    lowestDate: lowest.date,
    average: roundMacro(sum / logged.length, 1),
    startWeight: start.weight,
    startDate: start.date,
    latestWeight: latest.weight,
    latestDate: latest.date,
    netChange: roundMacro(latest.weight - start.weight, 1),
  }
}

/** Linear trend rate (display units per week) from logged weights in the period. */
export function computeWeightTrend(points: WeightChartPoint[]): WeightTrendInfo | null {
  const logged = points.filter((p): p is WeightChartPoint & { weight: number } =>
    p.weight != null,
  )
  if (logged.length < 2) return null

  const origin = parseISO(logged[0].date)
  const xs = logged.map((p) => differenceInCalendarDays(parseISO(p.date), origin))
  const ys = logged.map((p) => p.weight)

  const n = logged.length
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return null

  const slopePerDay = (n * sumXY - sumX * sumY) / denom
  const changePerWeek = roundMacro(slopePerDay * 7, 2)
  const latest = logged[logged.length - 1].weight

  let direction: WeightTrendInfo['direction'] = 'stable'
  if (changePerWeek < -STABLE_RATE_THRESHOLD) direction = 'losing'
  else if (changePerWeek > STABLE_RATE_THRESHOLD) direction = 'gaining'

  const projection4Weeks =
    direction === 'stable' ? null : roundMacro(latest + changePerWeek * 4, 1)

  return { changePerWeek, direction, projection4Weeks }
}

export function countLoggedWeightsInRange(
  dailyLogs: Record<string, DailyLog>,
  range: { start: string; end: string },
): number {
  return getWeightLogDatesInRange(dailyLogs, range).length
}

export function countLoggedWeights(dailyLogs: Record<string, DailyLog>): number {
  return getWeightLogDates(dailyLogs).length
}

export function weightChangeTone(change: number): 'loss' | 'gain' | 'neutral' {
  if (change < -STABLE_RATE_THRESHOLD) return 'loss'
  if (change > STABLE_RATE_THRESHOLD) return 'gain'
  return 'neutral'
}