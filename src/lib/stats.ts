import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { datesInRange } from '@/lib/dates'
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
  const defaultGoal =
    settings.goalTemplates.find((g) => g.id === settings.defaultTemplateId) ??
    settings.goalTemplates[0]

  return datesInRange(range.start, range.end)
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

export function computeAdherence(rows: StatsDayRow[]): number {
  if (rows.length === 0) return 0
  const hits = rows.filter((d) => {
    const goalCal = d.goal.calories
    if (goalCal <= 0) return false
    const withinCal = Math.abs(d.net - goalCal) <= goalCal * 0.15
    const withinProtein = Math.abs(d.protein - d.goal.protein) <= d.goal.protein * 0.15
    const withinCarbs = Math.abs(d.carbs - d.goal.carbs) <= d.goal.carbs * 0.15
    const withinFat = Math.abs(d.fat - d.goal.fat) <= d.goal.fat * 0.15
    return withinCal && withinProtein && withinCarbs && withinFat
  }).length
  return Math.round((hits / rows.length) * 100)
}

export function generateInsights(
  rows: StatsDayRow[],
  period: 'week' | 'month' | 'custom',
  range: { start: string; end: string },
): string[] {
  if (rows.length === 0) return ['Log foods on the Daily tab to unlock insights for this period.']

  const insights: string[] = []
  const avgNet = rows.reduce((s, d) => s + d.net, 0) / rows.length
  const avgGoalCal =
    rows.reduce((s, d) => s + d.goal.calories, 0) / rows.length
  const delta = roundMacro(avgNet - avgGoalCal, 0)
  if (delta > 25) {
    insights.push(
      `Your average daily net calories are ${delta} above goal this ${period === 'month' ? 'month' : 'period'}.`,
    )
  } else if (delta < -25) {
    insights.push(
      `Your average daily net calories are ${Math.abs(delta)} below goal this ${period === 'month' ? 'month' : 'period'}.`,
    )
  } else {
    insights.push('Your average daily net calories are close to your calorie goal.')
  }

  const adherence = computeAdherence(rows)
  insights.push(`You hit your main macro goals on ${adherence}% of logged days in this period.`)

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

  return insights.slice(0, 4)
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

  for (const date of datesInRange(range.start, range.end)) {
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