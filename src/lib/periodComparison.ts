import { roundMacro } from '@/lib/macros'
import {
  buildStatsDayRows,
  computeAdherenceBreakdown,
  previousPeriodLabel,
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

function avgWeightDisplay(
  logs: Record<string, DailyLog>,
  dates: string[],
  unit: WeightUnit,
): number | null {
  const values = dates
    .map((d) => logs[d]?.weightKg)
    .filter((w): w is number => w != null && Number.isFinite(w) && w > 0)
  if (values.length === 0) return null
  const avgKg = values.reduce((a, b) => a + b, 0) / values.length
  return weightFromKg(avgKg, unit)
}

function energyBalancePercent(rows: StatsDayRow[]): number | null {
  const energyRows = rows.filter((d) => (d.goal.targetDeficit ?? 0) !== 0)
  if (energyRows.length === 0) return null
  return computeAdherenceBreakdown(energyRows).targetDeficit
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
  statsPeriod: 'week' | 'month' | 'custom',
): { periodLabel: string; rows: PeriodComparisonRow[] } {
  const currentRows = buildStatsDayRows(range, dailyLogs, foodLibrary, settings)
  const prevRows = buildStatsDayRows(prevRange, dailyLogs, foodLibrary, settings)
  const periodLabel = previousPeriodLabel(statsPeriod)
  const weightUnit = settings.weightUnit ?? 'lbs'

  const curDates = currentRows.map((r) => r.date)
  const prevDates = prevRows.map((r) => r.date)

  const rows: PeriodComparisonRow[] = [
    row(
      'Calories In',
      avg(currentRows, (r) => r.calories),
      avg(prevRows, (r) => r.calories),
      'cal',
    ),
    row(
      'Calories Out',
      avg(currentRows, (r) => r.burned),
      avg(prevRows, (r) => r.burned),
      'cal',
    ),
    row(
      'Net Calories',
      avg(currentRows, (r) => r.net),
      avg(prevRows, (r) => r.net),
      'signedCal',
      { emphasized: true },
    ),
    row(
      'Protein',
      avg(currentRows, (r) => r.protein),
      avg(prevRows, (r) => r.protein),
      'grams',
    ),
    row(
      'Weight',
      avgWeightDisplay(dailyLogs, curDates, weightUnit),
      avgWeightDisplay(dailyLogs, prevDates, weightUnit),
      'weight',
      { weightUnit },
    ),
    row(
      'Energy Balance',
      energyBalancePercent(currentRows),
      energyBalancePercent(prevRows),
      'percent',
      { emphasized: true },
    ),
  ]

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