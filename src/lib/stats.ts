import { addDays, format, parseISO } from 'date-fns'
import { clampStatsRange, datesInRange, shiftDate, todayString } from '@/lib/dates'
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
import type { GoalMode } from '@/lib/goalMode'
import { computeLoggingStreak } from '@/lib/loggingStreak'
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

const ROLLING_LOOKBACK_MAX = 14

export type TrendMetricKey =
  | 'net'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugars'

function resolveDefaultGoal(settings: Settings): GoalTemplate {
  return (
    settings.goalTemplates.find((g) => g.id === settings.defaultTemplateId) ??
    settings.goalTemplates[0]
  )
}

export function getStatsDayRowForDate(
  date: string,
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
  settings: Settings,
): StatsDayRow | null {
  const log = dailyLogs[date]
  if (!log || log.foods.length === 0) return null
  const defaultGoal = resolveDefaultGoal(settings)
  const macros = computeDayMacros(foodLibrary, log.foods)
  const net = macros.calories - log.burnedCalories
  const goal =
    settings.goalTemplates.find((g) => g.id === log.goalTemplateId) ?? defaultGoal
  const vsGoal = net - goal.calories
  return { date, ...macros, net, burned: log.burnedCalories, vsGoal, goal }
}

export function buildStatsDayRows(
  range: { start: string; end: string },
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
  settings: Settings,
): StatsDayRow[] {
  const statsRange = clampStatsRange(range)
  return datesInRange(statsRange.start, statsRange.end)
    .map((date) => getStatsDayRowForDate(date, dailyLogs, foodLibrary, settings))
    .filter((row): row is StatsDayRow => row != null)
}

export function rollingAverageCalendarWindow(
  values: (number | null)[],
  index: number,
  window: number,
): number | null {
  if (index < window - 1) return null
  const slice = values.slice(index - window + 1, index + 1)
  const logged = slice.filter((v): v is number => v != null)
  if (logged.length === 0) return null
  return roundMacro(logged.reduce((a, b) => a + b, 0) / logged.length, 1)
}

export function buildTrendMetricSeries(
  range: { start: string; end: string },
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
  settings: Settings,
  lookbackDays = ROLLING_LOOKBACK_MAX,
): {
  dates: string[]
  displayStartIndex: number
  metrics: Record<TrendMetricKey, (number | null)[]>
} {
  const statsRange = clampStatsRange(range)
  const extendedStart = shiftDate(statsRange.start, -(lookbackDays - 1))
  const dates = datesInRange(extendedStart, statsRange.end)
  const displayStartIndex = dates.indexOf(statsRange.start)

  const rows = dates.map((date) =>
    getStatsDayRowForDate(date, dailyLogs, foodLibrary, settings),
  )

  const metrics: Record<TrendMetricKey, (number | null)[]> = {
    net: rows.map((r) => (r ? r.net : null)),
    calories: rows.map((r) => (r ? r.calories : null)),
    protein: rows.map((r) => (r ? r.protein : null)),
    carbs: rows.map((r) => (r ? r.carbs : null)),
    fat: rows.map((r) => (r ? r.fat : null)),
    fiber: rows.map((r) => (r ? r.fiber : null)),
    sugars: rows.map((r) => (r ? r.sugars : null)),
  }

  return { dates, displayStartIndex, metrics }
}

/** Y-axis domain for macro charts: always starts at 0, never shows negative values. */
export function stableMacroYDomain(values: number[], minSpan = 80): [number, number] {
  if (values.length === 0) return [0, 200]

  const dataMax = Math.max(0, ...values)
  let high = Math.max(dataMax, minSpan)
  const pad = Math.max(5, high * 0.08)
  high = Math.ceil((high + pad) / 10) * 10
  return [0, high]
}

/** Y-axis domain for calorie charts: always includes 0 with a minimum span to reduce zoom drama. */
export function stableCalorieYDomain(values: number[], minSpan = 600): [number, number] {
  if (values.length === 0) return [0, 2000]

  const dataMax = Math.max(0, ...values)
  const dataMin = Math.min(0, ...values)
  let low = dataMin
  let high = dataMax

  const span = high - low
  if (span < minSpan) {
    if (low >= 0) {
      high = Math.max(high, minSpan)
    } else if (high <= 0) {
      low = Math.min(low, -minSpan)
    } else {
      const extra = (minSpan - span) / 2
      low -= extra
      high += extra
    }
  }

  const pad = Math.max(40, (high - low) * 0.06)
  low = Math.floor((low - pad) / 50) * 50
  high = Math.ceil((high + pad) / 50) * 50
  low = Math.min(0, low)
  high = Math.max(0, high)
  if (low === high) high = low + minSpan
  return [low, high]
}

function niceCalorieTickStep(span: number, targetTickCount = 6): number {
  const rough = span / targetTickCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1))))
  const normalized = rough / magnitude
  let nice = 1
  if (normalized > 5) nice = 10
  else if (normalized > 2) nice = 5
  else if (normalized > 1) nice = 2
  return Math.max(50, Math.round((nice * magnitude) / 50) * 50)
}

/** Y-axis ticks for calorie charts — always includes 0 when the domain spans it. */
export function calorieYTicks([low, high]: [number, number]): number[] {
  if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high) return [0]

  const step = niceCalorieTickStep(high - low)
  const ticks = new Set<number>()

  if (low <= 0 && high >= 0) ticks.add(0)

  for (let v = step; v <= high + step * 0.001; v += step) {
    ticks.add(Math.round(v))
  }
  for (let v = -step; v >= low - step * 0.001; v -= step) {
    ticks.add(Math.round(v))
  }

  return [...ticks].sort((a, b) => a - b)
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

export type TrendGoalLines = {
  intakeTarget: number
  netTarget: number | null
  intakeLabel: string
  netLabel: string | null
}

/** Goal reference lines for the Trends calorie chart (handles mixed templates in a period). */
export function computeTrendGoalLines(dayRows: StatsDayRow[]): TrendGoalLines | null {
  if (dayRows.length === 0) return null

  const intakeValues = dayRows.map((d) => d.goal.calories)
  const uniqueIntake = new Set(intakeValues)
  const intakeTarget =
    uniqueIntake.size === 1
      ? intakeValues[0]
      : roundMacro(
          intakeValues.reduce((sum, v) => sum + v, 0) / intakeValues.length,
          0,
        )
  const intakeLabel =
    uniqueIntake.size === 1
      ? `Intake goal (${intakeTarget})`
      : `Avg intake goal (${intakeTarget})`

  const netTargets = dayRows
    .map((d) => getTargetNetCalories(d.goal))
    .filter((v): v is number => v != null)

  if (netTargets.length === 0) {
    return { intakeTarget, netTarget: null, intakeLabel, netLabel: null }
  }

  const uniqueNet = new Set(netTargets)
  const netTarget =
    uniqueNet.size === 1
      ? netTargets[0]
      : roundMacro(netTargets.reduce((sum, v) => sum + v, 0) / netTargets.length, 0)
  const netLabel =
    uniqueNet.size === 1
      ? `Net goal (${netTarget >= 0 ? '+' : ''}${netTarget})`
      : `Avg net goal (${netTarget >= 0 ? '+' : ''}${netTarget})`

  return { intakeTarget, netTarget, intakeLabel, netLabel }
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

export type InsightTone = 'positive' | 'warning' | 'neutral'

export type InsightBullet = {
  id: string
  text: string
  tone: InsightTone
}

export type InsightSummary = {
  headline: string
  bullets: InsightBullet[]
  takeaway: string
}

/** Structured, scannable insights for the Stats Overview tab. */
export function buildInsightSummary(
  rows: StatsDayRow[],
  period: 'week' | 'month' | 'custom',
  goalMode: GoalMode,
  dailyLogs: Record<string, DailyLog>,
): InsightSummary | null {
  if (rows.length === 0) return null

  const n = rows.length
  const periodLabel = period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'this period'
  const avgIntake = rows.reduce((s, d) => s + d.calories, 0) / n
  const avgIntakeGoal = rows.reduce((s, d) => s + d.goal.calories, 0) / n
  const avgNet = rows.reduce((s, d) => s + d.net, 0) / n
  const intakeDelta = roundMacro(avgIntake - avgIntakeGoal, 0)
  const intakeTol = Math.max(25, Math.abs(avgIntakeGoal) * ADHERENCE_TOLERANCE)

  const proteinHitDays = rows.filter((d) =>
    isProteinOnTarget(d.protein, d.goal.protein),
  ).length
  const proteinRate = proteinHitDays / n
  const streak = computeLoggingStreak(dailyLogs, todayString())

  const bullets: InsightBullet[] = []

  if (streak > 0) {
    bullets.push({
      id: 'streak',
      text: `${streak}-day logging streak — keep it going!`,
      tone: streak >= 3 ? 'positive' : 'neutral',
    })
  } else {
    bullets.push({
      id: 'streak',
      text: 'No active streak — log food today to start one.',
      tone: 'warning',
    })
  }

  bullets.push({
    id: 'protein',
    text: `Hit protein goal on ${proteinHitDays} of ${n} logged day${n === 1 ? '' : 's'} ${periodLabel}.`,
    tone: proteinRate >= 0.7 ? 'positive' : proteinRate >= 0.4 ? 'neutral' : 'warning',
  })

  const energyGoalRows = rows.filter((d) => (d.goal.targetDeficit ?? 0) !== 0)
  const deficitRows = energyGoalRows.filter((d) => (d.goal.targetDeficit ?? 0) < 0)
  const surplusRows = energyGoalRows.filter((d) => (d.goal.targetDeficit ?? 0) > 0)

  const showDeficit =
    deficitRows.length > 0 && (goalMode === 'cut' || goalMode === 'maintain')
  const showSurplus =
    surplusRows.length > 0 && (goalMode === 'bulk' || goalMode === 'maintain')

  if (showDeficit) {
    const avgTargetNet =
      deficitRows.reduce((s, d) => s + (d.goal.targetDeficit ?? 0), 0) /
      deficitRows.length
    const avgActualNet =
      deficitRows.reduce((s, d) => s + d.net, 0) / deficitRows.length
    const netGap = roundMacro(avgActualNet - avgTargetNet, 0)
    const tol = Math.max(50, Math.abs(avgTargetNet) * ADHERENCE_TOLERANCE)

    let text: string
    if (Math.abs(netGap) <= tol) {
      text = `Averaging ${roundMacro(avgActualNet, 0)} net cal/day — on target for your ${roundMacro(avgTargetNet, 0)} deficit goal.`
    } else if (netGap < 0) {
      text = `Averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${Math.abs(netGap)} cal deeper deficit than your ${roundMacro(avgTargetNet, 0)} goal.`
    } else {
      text = `Averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${netGap} cal shy of your ${roundMacro(avgTargetNet, 0)} deficit goal.`
    }
    bullets.push({
      id: 'net-deficit',
      text,
      tone: Math.abs(netGap) <= tol ? 'positive' : netGap > 0 ? 'warning' : 'neutral',
    })
  } else if (showSurplus) {
    const avgTargetNet =
      surplusRows.reduce((s, d) => s + (d.goal.targetDeficit ?? 0), 0) /
      surplusRows.length
    const avgActualNet =
      surplusRows.reduce((s, d) => s + d.net, 0) / surplusRows.length
    const netGap = roundMacro(avgActualNet - avgTargetNet, 0)
    const tol = Math.max(50, Math.abs(avgTargetNet) * ADHERENCE_TOLERANCE)

    let text: string
    if (Math.abs(netGap) <= tol) {
      text = `Averaging ${roundMacro(avgActualNet, 0)} net cal/day — on target for your +${roundMacro(avgTargetNet, 0)} surplus goal.`
    } else if (netGap > 0) {
      text = `Averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${netGap} cal above your +${roundMacro(avgTargetNet, 0)} surplus goal.`
    } else {
      text = `Averaging ${roundMacro(avgActualNet, 0)} net cal/day — ${Math.abs(netGap)} cal below your +${roundMacro(avgTargetNet, 0)} surplus goal.`
    }
    bullets.push({
      id: 'net-surplus',
      text,
      tone: Math.abs(netGap) <= tol ? 'positive' : netGap < 0 ? 'warning' : 'neutral',
    })
  } else {
    bullets.push({
      id: 'net-avg',
      text: `Averaging ${roundMacro(avgNet, 0)} net cal/day (eaten minus burned).`,
      tone: 'neutral',
    })
  }

  if (Math.abs(intakeDelta) <= intakeTol) {
    bullets.push({
      id: 'intake',
      text: `Average intake ${roundMacro(avgIntake, 0)} cal/day — within range of your ${roundMacro(avgIntakeGoal, 0)} cal target.`,
      tone: 'positive',
    })
  } else if (intakeDelta > 0) {
    bullets.push({
      id: 'intake',
      text: `Average intake ${roundMacro(avgIntake, 0)} cal/day — ${intakeDelta} cal above your ${roundMacro(avgIntakeGoal, 0)} cal target.`,
      tone: 'warning',
    })
  } else {
    bullets.push({
      id: 'intake',
      text: `Average intake ${roundMacro(avgIntake, 0)} cal/day — ${Math.abs(intakeDelta)} cal below your ${roundMacro(avgIntakeGoal, 0)} cal target.`,
      tone: 'warning',
    })
  }

  if (n >= 2) {
    const best = [...rows].sort((a, b) => b.net - a.net)[0]
    const toughest = [...rows].sort((a, b) => a.net - b.net)[0]
    if (best.date !== toughest.date) {
      bullets.push({
        id: 'range',
        text: `Highest net: ${format(parseISO(best.date), 'MMM d')} (${roundMacro(best.net, 0)} cal). Lowest: ${format(parseISO(toughest.date), 'MMM d')} (${roundMacro(toughest.net, 0)} cal).`,
        tone: 'neutral',
      })
    }
  }

  const trimmedBullets = bullets.slice(0, 6)

  const onTrackCount = trimmedBullets.filter((b) => b.tone === 'positive').length
  const warnCount = trimmedBullets.filter((b) => b.tone === 'warning').length

  let headline: string
  if (onTrackCount >= 3 && warnCount === 0) {
    headline =
      goalMode === 'cut'
        ? `Solid ${periodLabel} — you're largely on track with your cut goals.`
        : goalMode === 'bulk'
          ? `Strong ${periodLabel} — intake and surplus goals are looking good.`
          : `Strong ${periodLabel} — your logging and macros are in a good place.`
  } else if (warnCount >= 2) {
    headline = `A few areas need attention ${periodLabel} — small tweaks can get you back on track.`
  } else {
    headline = `Mixed ${periodLabel} — some wins, with room to sharpen a couple of habits.`
  }

  let takeaway: string
  if (proteinRate < 0.7) {
    takeaway = 'Prioritize protein at your next meal to build momentum.'
  } else if (streak === 0) {
    takeaway = 'Log today to restart your streak and keep trends accurate.'
  } else if (Math.abs(intakeDelta) > intakeTol) {
    takeaway =
      intakeDelta > 0
        ? 'Trim portion sizes slightly to align intake with your target.'
        : 'Add a snack or larger serving to close your intake gap.'
  } else if (showDeficit && bullets.find((b) => b.id === 'net-deficit')?.tone === 'warning') {
    takeaway = 'Tighten portions or activity to hit your deficit net calorie goal.'
  } else if (showSurplus && bullets.find((b) => b.id === 'net-surplus')?.tone === 'warning') {
    takeaway = 'Add calories to your meals to reach your surplus net goal.'
  } else {
    takeaway = 'Keep logging daily — consistency is your biggest lever right now.'
  }

  return { headline, bullets: trimmedBullets, takeaway }
}

/** @deprecated Use buildInsightSummary */
export function generateInsights(
  rows: StatsDayRow[],
  period: 'week' | 'month' | 'custom',
  _range: { start: string; end: string },
  goalMode: GoalMode = 'maintain',
): string[] {
  const summary = buildInsightSummary(rows, period, goalMode, {})
  if (!summary) return ['Log foods on the Daily tab to unlock insights for this period.']
  return [summary.headline, ...summary.bullets.map((b) => b.text), summary.takeaway]
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