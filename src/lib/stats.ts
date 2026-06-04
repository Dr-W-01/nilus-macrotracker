import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { clampStatsRange, datesInRange } from '@/lib/dates'
import {
  computeDayMacros,
  getLoggedFoodMacros,
  roundMacro,
} from '@/lib/macros'
import type { MacroTotals } from '@/lib/types'
import {
  getFoodBaseAmount,
  getFoodBaseUnit,
  getLoggedServingMultiplier,
  roundAmount,
} from '@/lib/scale'
import { normalizeGoalMode, type GoalMode } from '@/lib/goalMode'
import type { DailyLog, FoodItem, GoalTemplate, LoggedFood, Settings } from '@/lib/types'

export type StatsDayRow = {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugars: number
  net: number
  burned: number
  vsGoal: number
  goal: GoalTemplate
}

export function buildStatsDayRows(
  range: { start: string; end: string },
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
  settings: Settings,
): StatsDayRow[] {
  const statsRange = clampStatsRange(range)
  const defaultGoal =
    settings.goalTemplates.find((g) => g.id === settings.defaultTemplateId) ??
    settings.goalTemplates[0]

  return datesInRange(statsRange.start, statsRange.end)
    .map((date) => {
      const log = dailyLogs[date]
      if (!log || log.foods.length === 0) return null
      const macros = computeDayMacros(foodLibrary, log.foods)
      const net = macros.calories - log.burnedCalories
      const goal =
        settings.goalTemplates.find((g) => g.id === log.goalTemplateId) ??
        defaultGoal
      const vsGoal = net - goal.calories
      return { date, ...macros, net, burned: log.burnedCalories, vsGoal, goal }
    })
    .filter((row): row is StatsDayRow => row != null)
}

export function getPreviousRange(range: { start: string; end: string }): {
  start: string
  end: string
} {
  const days = datesInRange(range.start, range.end).length
  const span = Math.max(1, days)
  const prevEnd = format(addDays(parseISO(range.start), -1), 'yyyy-MM-dd')
  const prevStart = format(addDays(parseISO(prevEnd), -(span - 1)), 'yyyy-MM-dd')
  return { start: prevStart, end: prevEnd }
}

export function previousPeriodLabel(period: 'week' | 'month' | 'custom'): string {
  if (period === 'week') return 'last week'
  if (period === 'month') return 'last month'
  return 'prior period'
}

export function sumDayRows(rows: StatsDayRow[]) {
  return rows.reduce(
    (acc, d) => ({
      calories: acc.calories + d.calories,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
      fiber: acc.fiber + d.fiber,
      sugars: acc.sugars + d.sugars,
      net: acc.net + d.net,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0, net: 0 },
  )
}

const ADHERENCE_TOLERANCE = 0.15

export type AdherenceKey =
  | 'calories'
  | 'targetDeficit'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugars'

export type AdherenceBreakdown = Record<AdherenceKey, number | null>

export const ADHERENCE_LABELS: Record<AdherenceKey, string> = {
  calories: 'Calories',
  targetDeficit: 'Energy balance',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sugars: 'Sugars',
}

function isWithinTarget(actual: number, target: number): boolean {
  if (target === 0) return Math.abs(actual) <= 25
  return Math.abs(actual - target) <= Math.abs(target) * ADHERENCE_TOLERANCE
}

/** Protein: at or above target counts as success */
function isProteinOnTarget(actual: number, target: number): boolean {
  if (target <= 0) return true
  return actual >= target * (1 - ADHERENCE_TOLERANCE)
}

/** Signed target net calories from goal (negative = deficit, positive = surplus). */
export function getTargetNetCalories(goal: GoalTemplate): number | null {
  const target = goal.targetDeficit ?? 0
  if (target === 0) return null
  return target
}

/** Actual net calories for the day (eaten − burned). */
export function getActualNetCalories(row: StatsDayRow): number {
  return row.net
}

/** @deprecated Target net is stored directly on targetDeficit; use getActualNetCalories. */
export function getActualEnergyBalance(row: StatsDayRow): number | null {
  const target = row.goal.targetDeficit ?? 0
  if (target === 0) return null
  return row.net
}

/** @deprecated Use getActualNetCalories */
export function getActualDeficit(row: StatsDayRow): number | null {
  return getActualEnergyBalance(row)
}

function isEnergyBalanceOnTarget(row: StatsDayRow): boolean {
  const targetNet = getTargetNetCalories(row.goal)
  if (targetNet == null) return false
  return isWithinTarget(row.net, targetNet)
}

export function formatTargetDeficitShort(targetDeficit?: number): string {
  if (targetDeficit == null || targetDeficit === 0) return ''
  if (targetDeficit < 0) return `${Math.abs(targetDeficit)} cal deficit`
  return `${targetDeficit} cal surplus`
}

function computeMetricAdherence(
  rows: StatsDayRow[],
  check: (row: StatsDayRow) => boolean,
): number {
  if (rows.length === 0) return 0
  const hits = rows.filter(check).length
  return Math.round((hits / rows.length) * 100)
}

export function computeAdherenceBreakdown(rows: StatsDayRow[]): AdherenceBreakdown {
  const energyGoalRows = rows.filter((d) => (d.goal.targetDeficit ?? 0) !== 0)
  const showEnergyGoal = energyGoalRows.length > 0

  return {
    calories: computeMetricAdherence(rows, (d) =>
      isWithinTarget(d.calories, d.goal.calories),
    ),
    targetDeficit: showEnergyGoal
      ? computeMetricAdherence(energyGoalRows, isEnergyBalanceOnTarget)
      : null,
    protein: computeMetricAdherence(rows, (d) =>
      isProteinOnTarget(d.protein, d.goal.protein),
    ),
    carbs: computeMetricAdherence(rows, (d) =>
      isWithinTarget(d.carbs, d.goal.carbs),
    ),
    fat: computeMetricAdherence(rows, (d) =>
      isWithinTarget(d.fat, d.goal.fat),
    ),
    fiber: computeMetricAdherence(rows, (d) =>
      isWithinTarget(d.fiber, d.goal.fiber),
    ),
    sugars: computeMetricAdherence(rows, (d) =>
      isWithinTarget(d.sugars, d.goal.sugars),
    ),
  }
}

/** @deprecated Use computeAdherenceBreakdown */
export function computeAdherence(rows: StatsDayRow[]): number {
  const breakdown = computeAdherenceBreakdown(rows)
  const values = [
    breakdown.calories,
    breakdown.protein,
    breakdown.carbs,
    breakdown.fat,
    breakdown.fiber,
    breakdown.sugars,
    breakdown.targetDeficit,
  ].filter((v): v is number => v != null)
  if (values.length === 0) return 0
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

export function generateInsights(
  rows: StatsDayRow[],
  period: 'week' | 'month' | 'custom',
  range: { start: string; end: string },
  goalMode: GoalMode = 'cut',
): string[] {
  if (rows.length === 0) return ['Log foods on the Daily tab to unlock insights for this period.']

  const mode = normalizeGoalMode(goalMode)
  const insights: string[] = []
  const periodLabel = period === 'month' ? 'month' : 'period'
  const n = rows.length

  const avgIntake = rows.reduce((s, d) => s + d.calories, 0) / n
  const avgIntakeGoal = rows.reduce((s, d) => s + d.goal.calories, 0) / n
  const avgNet = rows.reduce((s, d) => s + d.net, 0) / n

  const energyGoalRows = rows.filter((d) => (d.goal.targetDeficit ?? 0) !== 0)
  const usesEnergyGoal = energyGoalRows.length > 0

  if (usesEnergyGoal) {
    const deficitRows = energyGoalRows.filter((d) => (d.goal.targetDeficit ?? 0) < 0)
    const surplusRows = energyGoalRows.filter((d) => (d.goal.targetDeficit ?? 0) > 0)

    const showDeficitInsight =
      deficitRows.length > 0 && (mode === 'cut' || mode === 'maintain')
    const showSurplusInsight =
      surplusRows.length > 0 && (mode === 'bulk' || mode === 'maintain')

    if (showDeficitInsight) {
      const avgTargetNet =
        deficitRows.reduce((s, d) => s + (d.goal.targetDeficit ?? 0), 0) /
        deficitRows.length
      const avgActualNet =
        deficitRows.reduce((s, d) => s + d.net, 0) / deficitRows.length
      const netGap = roundMacro(avgActualNet - avgTargetNet, 0)
      const tol = Math.max(50, Math.abs(avgTargetNet) * ADHERENCE_TOLERANCE)

      if (Math.abs(netGap) <= tol) {
        insights.push(
          `You're averaging ${roundMacro(avgActualNet, 0)} net cal/day, very close to your ${roundMacro(avgTargetNet, 0)} deficit goal.`,
        )
      } else if (netGap < 0) {
        insights.push(
          `You're averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${Math.abs(netGap)} kcal more deficit than your ${roundMacro(avgTargetNet, 0)} goal.`,
        )
      } else {
        insights.push(
          `You're averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${netGap} kcal less deficit than your ${roundMacro(avgTargetNet, 0)} goal.`,
        )
      }
    }

    if (showSurplusInsight) {
      const avgTargetNet =
        surplusRows.reduce((s, d) => s + (d.goal.targetDeficit ?? 0), 0) /
        surplusRows.length
      const avgActualNet =
        surplusRows.reduce((s, d) => s + d.net, 0) / surplusRows.length
      const netGap = roundMacro(avgActualNet - avgTargetNet, 0)
      const tol = Math.max(50, Math.abs(avgTargetNet) * ADHERENCE_TOLERANCE)

      if (Math.abs(netGap) <= tol) {
        insights.push(
          `You're averaging ${roundMacro(avgActualNet, 0)} net cal/day, very close to your +${roundMacro(avgTargetNet, 0)} surplus goal.`,
        )
      } else if (netGap > 0) {
        insights.push(
          `You're averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${netGap} kcal above your +${roundMacro(avgTargetNet, 0)} surplus goal.`,
        )
      } else {
        insights.push(
          `You're averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${Math.abs(netGap)} kcal below your +${roundMacro(avgTargetNet, 0)} surplus goal.`,
        )
      }
    }

    const intakeDelta = roundMacro(avgIntake - avgIntakeGoal, 0)
    if (Math.abs(intakeDelta) > 25) {
      insights.push(
        intakeDelta > 0
          ? `Average intake was ${intakeDelta} cal above your ${roundMacro(avgIntakeGoal, 0)} cal/day target (separate from your energy balance goal).`
          : `Average intake was ${Math.abs(intakeDelta)} cal below your ${roundMacro(avgIntakeGoal, 0)} cal/day target.`,
      )
    }
  } else {
    const intakeDelta = roundMacro(avgIntake - avgIntakeGoal, 0)
    if (intakeDelta > 25) {
      insights.push(
        `Your average daily intake is ${intakeDelta} cal above your ${roundMacro(avgIntakeGoal, 0)} cal target this ${periodLabel}.`,
      )
    } else if (intakeDelta < -25) {
      insights.push(
        `Your average daily intake is ${Math.abs(intakeDelta)} cal below your ${roundMacro(avgIntakeGoal, 0)} cal target this ${periodLabel}.`,
      )
    } else {
      insights.push(
        `Your average daily intake (${roundMacro(avgIntake, 0)} cal) is close to your ${roundMacro(avgIntakeGoal, 0)} cal target.`,
      )
    }
    insights.push(
      `Average net calories (after burned): ${roundMacro(avgNet, 0)} cal/day.`,
    )
  }

  const adherence = computeAdherenceBreakdown(rows)
  const energyLabel =
    mode === 'cut'
      ? 'deficit goal'
      : mode === 'bulk'
        ? 'surplus goal'
        : 'energy balance'
  insights.push(
    `Adherence: protein ${adherence.protein}%, intake ${adherence.calories}%` +
      (adherence.targetDeficit != null
        ? `, ${energyLabel} ${adherence.targetDeficit}%`
        : '') +
      '.',
  )

  const best = [...rows].sort((a, b) => b.net - a.net)[0]
  const toughest = [...rows].sort((a, b) => a.net - b.net)[0]
  if (rows.length >= 2 && best.date !== toughest.date) {
    insights.push(
      `Highest net day: ${format(parseISO(best.date), 'MMM d')} (${roundMacro(best.net, 0)} cal). Lowest: ${format(parseISO(toughest.date), 'MMM d')} (${roundMacro(toughest.net, 0)} cal).`,
    )
  }

  const spanDays =
    differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1
  if (spanDays > rows.length) {
    insights.push(
      `${spanDays - rows.length} day(s) in range had no food logged.`,
    )
  }

  return insights.slice(0, 5)
}

export function rollingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    const slice = values.slice(i - window + 1, i + 1)
    const sum = slice.reduce((a, b) => a + b, 0)
    return roundMacro(sum / slice.length, 1)
  })
}

export type TopFoodEntry = {
  foodId: string
  name: string
  count: number
  quantityLabel: string
  calories: number
}

export function computeTopFoods(
  range: { start: string; end: string },
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
  limit = 8,
): TopFoodEntry[] {
  const map = new Map<
    string,
    { name: string; entries: number; qtyParts: string[]; calories: number }
  >()

  const statsRange = clampStatsRange(range)
  for (const date of datesInRange(statsRange.start, statsRange.end)) {
    const log = dailyLogs[date]
    if (!log) continue
    for (const entry of log.foods) {
      const food = foodLibrary.find((f) => f.id === entry.foodId)
      if (!food) continue
      const macros = getLoggedFoodMacros(foodLibrary, entry)
      const qtyLabel = formatLoggedQuantityTotal(food, entry)
      const prev = map.get(entry.foodId)
      if (prev) {
        prev.entries += 1
        prev.qtyParts.push(qtyLabel)
        prev.calories += macros.calories
      } else {
        map.set(entry.foodId, {
          name: food.name,
          entries: 1,
          qtyParts: [qtyLabel],
          calories: macros.calories,
        })
      }
    }
  }

  return [...map.entries()]
    .map(([foodId, v]) => ({
      foodId,
      name: v.name,
      count: v.entries,
      quantityLabel: summarizeQuantityParts(v.qtyParts, foodLibrary.find((f) => f.id === foodId)),
      calories: roundMacro(v.calories, 0),
    }))
    .sort((a, b) => b.calories - a.calories)
    .slice(0, limit)
}

function formatLoggedQuantityTotal(food: FoodItem, entry: LoggedFood): string {
  if (food.isRecipe) return '1 recipe'
  if (food.scaleType === 'scale') {
    const unit = getFoodBaseUnit(food)
    const amount =
      entry.scaleAmountEaten ??
      getFoodBaseAmount(food) * getLoggedServingMultiplier(food, entry)
    return `${roundAmount(amount)} ${unit}`
  }
  const qty = Math.max(1, Math.round(entry.quantity))
  return qty === 1 ? '1 serving' : `${qty} servings`
}

function summarizeQuantityParts(parts: string[], food?: FoodItem): string {
  if (parts.length === 0) return '—'
  if (food?.scaleType === 'scale') {
    const nums = parts
      .map((p) => parseFloat(p))
      .filter((n) => !Number.isNaN(n))
    if (nums.length === parts.length) {
      const unit = parts[0]?.split(' ').slice(1).join(' ') ?? ''
      const total = roundAmount(nums.reduce((a, b) => a + b, 0))
      return `${total} ${unit} total (${parts.length} logs)`
    }
  }
  const servings = parts.reduce((sum, p) => {
    const m = p.match(/^(\d+(?:\.\d+)?)\s+serving/)
    return sum + (m ? parseFloat(m[1]) : 1)
  }, 0)
  if (servings > 0) {
    return `${roundAmount(servings)} servings total (${parts.length} logs)`
  }
  return `${parts.length} logs`
}

export function macroCalorieDistribution(macros: MacroTotals) {
  const proteinCal = macros.protein * 4
  const carbsCal = macros.carbs * 4
  const fatCal = macros.fat * 9
  const total = proteinCal + carbsCal + fatCal
  if (total <= 0) {
    return [
      { name: 'Protein', value: 0, grams: 0 },
      { name: 'Carbs', value: 0, grams: 0 },
      { name: 'Fat', value: 0, grams: 0 },
    ]
  }
  return [
    { name: 'Protein', value: roundMacro((proteinCal / total) * 100, 0), grams: roundMacro(macros.protein) },
    { name: 'Carbs', value: roundMacro((carbsCal / total) * 100, 0), grams: roundMacro(macros.carbs) },
    { name: 'Fat', value: roundMacro((fatCal / total) * 100, 0), grams: roundMacro(macros.fat) },
  ]
}

export function averageMacros(rows: StatsDayRow[]): MacroTotals & { net: number } {
  if (rows.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0, net: 0 }
  }
  const n = rows.length
  const t = sumDayRows(rows)
  return {
    calories: roundMacro(t.calories / n),
    protein: roundMacro(t.protein / n),
    carbs: roundMacro(t.carbs / n),
    fat: roundMacro(t.fat / n),
    fiber: roundMacro(t.fiber / n),
    sugars: roundMacro(t.sugars / n),
    net: roundMacro(t.net / n, 0),
  }
}