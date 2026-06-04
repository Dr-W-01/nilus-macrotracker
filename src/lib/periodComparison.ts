import type { GoalMode } from '@/lib/goalMode'
import { roundMacro } from '@/lib/macros'
import {
  buildStatsDayRows,
  computeAdherenceBreakdown,
  previousPeriodLabel,
  sumDayRows,
  type StatsDayRow,
} from '@/lib/stats'
import { weightFromKg, type WeightUnit } from '@/lib/weight'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'

export type ComparisonValueFormat = 'cal' | 'grams' | 'weight' | 'percent' | 'signedCal'

export type PeriodComparisonRow = {
  label: string
  current: number | null
  previous: number | null
  delta: number | null
  format: ComparisonValueFormat
  weightUnit?: WeightUnit
  emphasized?: boolean
}

function avg(rows: StatsDayRow[], pick: (r: StatsDayRow) => number): number | null {
  if (rows.length === 0) return null
  return rows.reduce((s, r) => s + pick(r), 0) / rows.length
}

function avgWeightKg(
  logs: Record<string, DailyLog>,
  dates: string[],
): number | null {
  const values = dates
    .map((d) => logs[d]?.weightKg)
    .filter((w): w is number => w != null && Number.isFinite(w) && w > 0)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function delta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null
  return roundMacro(current - previous, current % 1 === 0 && previous % 1 === 0 ? 0 : 1)
}

function row(
  label: string,
  current: number | null,
  previous: number | null,
  format: ComparisonValueFormat,
  opts?: { emphasized?: boolean; weightUnit?: WeightUnit },
): PeriodComparisonRow {
  return {
    label,
    current,
    previous,
    delta: delta(current, previous),
    format,
    emphasized: opts?.emphasized,
    weightUnit: opts?.weightUnit,
  }
}

export function buildPeriodComparison(
  range: { start: string; end: string },
  prevRange: { start: string; end: string },
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
  settings: Settings,
  goalMode: GoalMode,
  statsPeriod: 'week' | 'month' | 'custom',
): { periodLabel: string; rows: PeriodComparisonRow[] } {
  const currentRows = buildStatsDayRows(range, dailyLogs, foodLibrary, settings)
  const prevRows = buildStatsDayRows(prevRange, dailyLogs, foodLibrary, settings)
  const periodLabel = previousPeriodLabel(statsPeriod)
  const weightUnit = settings.weightUnit ?? 'lbs'

  const rows: PeriodComparisonRow[] = []

  const netLabel =
    goalMode === 'cut'
      ? 'Avg net calories'
      : goalMode === 'bulk'
        ? 'Avg net calories'
        : 'Avg net calories'

  rows.push(
    row(
      netLabel,
      avg(currentRows, (r) => r.net),
      avg(prevRows, (r) => r.net),
      'signedCal',
      { emphasized: goalMode === 'cut' || goalMode === 'bulk' },
    ),
  )

  if (goalMode === 'cut') {
    const curDeficitRows = currentRows.filter((d) => (d.goal.targetDeficit ?? 0) < 0)
    const prevDeficitRows = prevRows.filter((d) => (d.goal.targetDeficit ?? 0) < 0)
    if (curDeficitRows.length > 0 || prevDeficitRows.length > 0) {
      rows.push(
        row(
          'Target net (avg goal)',
          avg(curDeficitRows, (r) => r.goal.targetDeficit ?? 0),
          avg(prevDeficitRows, (r) => r.goal.targetDeficit ?? 0),
          'signedCal',
        ),
      )
    }
    const curAdh = computeAdherenceBreakdown(curDeficitRows.length ? curDeficitRows : currentRows)
    const prevAdh = computeAdherenceBreakdown(prevDeficitRows.length ? prevDeficitRows : prevRows)
    if (curAdh.targetDeficit != null || prevAdh.targetDeficit != null) {
      rows.push(
        row(
          'Energy balance adherence',
          curAdh.targetDeficit,
          prevAdh.targetDeficit,
          'percent',
          { emphasized: true },
        ),
      )
    }
  } else if (goalMode === 'bulk') {
    const curSurplusRows = currentRows.filter((d) => (d.goal.targetDeficit ?? 0) > 0)
    const prevSurplusRows = prevRows.filter((d) => (d.goal.targetDeficit ?? 0) > 0)
    if (curSurplusRows.length > 0 || prevSurplusRows.length > 0) {
      rows.push(
        row(
          'Target net (avg goal)',
          avg(curSurplusRows, (r) => r.goal.targetDeficit ?? 0),
          avg(prevSurplusRows, (r) => r.goal.targetDeficit ?? 0),
          'signedCal',
        ),
      )
    }
    const curAdh = computeAdherenceBreakdown(curSurplusRows.length ? curSurplusRows : currentRows)
    const prevAdh = computeAdherenceBreakdown(prevSurplusRows.length ? prevSurplusRows : prevRows)
    if (curAdh.targetDeficit != null || prevAdh.targetDeficit != null) {
      rows.push(
        row(
          'Energy balance adherence',
          curAdh.targetDeficit,
          prevAdh.targetDeficit,
          'percent',
          { emphasized: true },
        ),
      )
    }
  }

  rows.push(
    row(
      'Avg calories in',
      avg(currentRows, (r) => r.calories),
      avg(prevRows, (r) => r.calories),
      'cal',
      { emphasized: goalMode === 'maintain' },
    ),
  )

  rows.push(
    row(
      'Avg protein',
      avg(currentRows, (r) => r.protein),
      avg(prevRows, (r) => r.protein),
      'grams',
    ),
  )

  const curTotals = sumDayRows(currentRows)
  const prevTotals = sumDayRows(prevRows)
  if (currentRows.length > 0 && prevRows.length > 0) {
    rows.push(
      row(
        'Period net total',
        roundMacro(curTotals.net, 0),
        roundMacro(prevTotals.net, 0),
        'signedCal',
      ),
    )
  }

  const curDates = currentRows.map((r) => r.date)
  const prevDates = prevRows.map((r) => r.date)
  const curWt = avgWeightKg(dailyLogs, curDates)
  const prevWt = avgWeightKg(dailyLogs, prevDates)
  if (curWt != null || prevWt != null) {
    rows.push(
      row(
        `Avg weight (${weightUnit})`,
        curWt != null ? weightFromKg(curWt, weightUnit) : null,
        prevWt != null ? weightFromKg(prevWt, weightUnit) : null,
        'weight',
        { weightUnit },
      ),
    )
  }

  return { periodLabel, rows }
}

export function formatComparisonValue(
  value: number | null,
  format: ComparisonValueFormat,
  weightUnit?: WeightUnit,
): string {
  if (value == null) return '—'
  switch (format) {
    case 'signedCal':
      return `${value > 0 ? '+' : ''}${roundMacro(value, 0)}`
    case 'cal':
      return `${roundMacro(value, 0)}`
    case 'grams':
      return `${roundMacro(value, 1)}g`
    case 'percent':
      return `${roundMacro(value, 0)}%`
    case 'weight':
      return weightUnit ? `${roundMacro(value, 1)} ${weightUnit}` : String(value)
    default:
      return String(value)
  }
}