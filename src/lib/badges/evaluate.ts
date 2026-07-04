import { format, parseISO } from 'date-fns'
import { collectAllCategories, foodCategories } from '@/lib/categories'
import { getWeekRangeForDate, shiftDate } from '@/lib/dates'
import { isConfiguredMeal, resolveLoggedMeal } from '@/lib/meals'
import { resolveMealsForLog } from '@/lib/mealProfiles'
import { computeLoggingStreak, dayHasLoggedFood } from '@/lib/loggingStreak'
import { getStatsDayRowForDate } from '@/lib/stats'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'
import { ALL_BADGE_IDS } from '@/lib/badges/definitions'
import type { BadgeEarnedInstance, BadgeId, BadgeProgress, BadgeState } from '@/lib/badges/types'

const ADHERENCE_TOLERANCE = 0.15

export type BadgeScanInput = {
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  badgeState: BadgeState
  favoriteFoodIds: string[]
  customCategories: string[]
}

export type BadgeAwardMap = Partial<Record<BadgeId, BadgeEarnedInstance[]>>

function isWithinTarget(actual: number, target: number): boolean {
  if (target === 0) return Math.abs(actual) <= 25
  return Math.abs(actual - target) <= Math.abs(target) * ADHERENCE_TOLERANCE
}

function isProteinOnTarget(actual: number, target: number): boolean {
  if (target <= 0) return true
  return actual >= target * (1 - ADHERENCE_TOLERANCE)
}

function isEnergyBalanceOnTarget(net: number, targetDeficit?: number): boolean {
  const target = targetDeficit ?? 0
  if (target === 0) return false
  return isWithinTarget(net, target)
}

export function instanceKey(inst: BadgeEarnedInstance): string {
  return inst.periodKey ?? inst.earnedAt
}

export function getBadgeCount(progress: BadgeProgress | undefined): number {
  return progress?.instances.length ?? 0
}

export function getUnviewedBadgeCount(badgeState: BadgeState): number {
  return badgeState.unviewedBadgeIds?.length ?? 0
}

/** Badges in the "New Badges" section, sorted by most recent award (incl. recurring). */
export function getRecentlyAwardedBadges(
  badgeState: BadgeState,
): { id: BadgeId; earnedAt: string }[] {
  return (badgeState.newSectionBadgeIds ?? [])
    .filter((id) => getBadgeCount(badgeState.progress[id]) > 0)
    .map((id) => ({
      id,
      earnedAt: badgeState.progress[id]!.instances.at(-1)?.earnedAt ?? '',
    }))
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
}

export function mergeBadgeInstances(
  existing: BadgeEarnedInstance[],
  found: BadgeEarnedInstance[],
): { merged: BadgeEarnedInstance[]; added: BadgeEarnedInstance[] } {
  const keys = new Set(existing.map(instanceKey))
  const added = found.filter((f) => !keys.has(instanceKey(f)))
  return { merged: [...existing, ...added], added }
}

function sortedLogDates(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.keys(dailyLogs)
    .filter((date) => dayHasLoggedFood(dailyLogs[date]))
    .sort()
}

function computeWeightStreak(
  dailyLogs: Record<string, DailyLog>,
  anchorDate: string,
): number {
  let streak = 0
  let date = anchorDate
  while (dailyLogs[date]?.weightKg != null && dailyLogs[date]!.weightKg! > 0) {
    streak += 1
    date = shiftDate(date, -1)
  }
  return streak
}

function datesWithWeight(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.keys(dailyLogs)
    .filter((date) => {
      const w = dailyLogs[date]?.weightKg
      return w != null && w > 0
    })
    .sort()
}

function evaluateStreakMilestones(
  dailyLogs: Record<string, DailyLog>,
  milestone: number,
  prefix: string,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  for (const date of sortedLogDates(dailyLogs)) {
    const streak = computeLoggingStreak(dailyLogs, date)
    const prevStreak = computeLoggingStreak(dailyLogs, shiftDate(date, -1))
    if (streak >= milestone && prevStreak < milestone) {
      instances.push({ earnedAt: date, periodKey: `${prefix}-${date}` })
    }
  }
  return instances
}

function evaluateWeightStreakMilestones(
  dailyLogs: Record<string, DailyLog>,
  milestone: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  for (const date of datesWithWeight(dailyLogs)) {
    const streak = computeWeightStreak(dailyLogs, date)
    const prevStreak = computeWeightStreak(dailyLogs, shiftDate(date, -1))
    if (streak >= milestone && prevStreak < milestone) {
      instances.push({
        earnedAt: date,
        periodKey: `weight-streak-${milestone}-${date}`,
      })
    }
  }
  return instances
}

type WeeklyGoalKind =
  | 'protein_week'
  | 'calorie_week'
  | 'balance_week'
  | 'fiber_week'
  | 'carbs_week'
  | 'fat_week'
  | 'sugars_week'

function rowHitsWeeklyGoal(row: ReturnType<typeof getStatsDayRowForDate> & object, kind: WeeklyGoalKind): boolean {
  if (kind === 'protein_week') {
    return isProteinOnTarget(row.protein, row.goal.protein)
  }
  if (kind === 'calorie_week') {
    return isWithinTarget(row.calories, row.goal.calories)
  }
  if (kind === 'fiber_week') {
    return isWithinTarget(row.fiber, row.goal.fiber)
  }
  if (kind === 'carbs_week') {
    return isWithinTarget(row.carbs, row.goal.carbs)
  }
  if (kind === 'fat_week') {
    return isWithinTarget(row.fat, row.goal.fat)
  }
  if (kind === 'sugars_week') {
    return isWithinTarget(row.sugars, row.goal.sugars)
  }
  if ((row.goal.targetDeficit ?? 0) === 0) return false
  return isEnergyBalanceOnTarget(row.net, row.goal.targetDeficit)
}

function evaluateWeeklyBadges(
  input: BadgeScanInput,
  kind: WeeklyGoalKind,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const weekStarts = new Set<string>()

  for (const date of Object.keys(input.dailyLogs)) {
    if (!dayHasLoggedFood(input.dailyLogs[date])) continue
    weekStarts.add(getWeekRangeForDate(date).start)
  }

  for (const weekStart of [...weekStarts].sort()) {
    const week = getWeekRangeForDate(weekStart)
    const rows = []
    let d = week.start
    while (d <= week.end) {
      const row = getStatsDayRowForDate(
        d,
        input.dailyLogs,
        input.foodLibrary,
        input.settings,
      )
      if (row) rows.push(row)
      d = shiftDate(d, 1)
    }

    if (rows.length < 5) continue

    const allHit = rows.every((row) => rowHitsWeeklyGoal(row, kind))

    if (!allHit) continue
    if (kind === 'balance_week' && rows.every((r) => (r.goal.targetDeficit ?? 0) === 0)) {
      continue
    }

    instances.push({ earnedAt: week.end, periodKey: `${kind}-${week.start}` })
  }

  return instances
}

type DailyGoalKind =
  | 'protein_day'
  | 'calorie_day'
  | 'balance_day'
  | 'fiber_day'
  | 'carbs_day'
  | 'fat_day'
  | 'sugars_day'
  | 'deficit_day'
  | 'surplus_day'
  | 'macro_triple_day'
  | 'macro_quad_day'

function evaluateDailyGoalBadges(
  input: BadgeScanInput,
  kind: DailyGoalKind,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []

  for (const date of sortedLogDates(input.dailyLogs)) {
    const row = getStatsDayRowForDate(
      date,
      input.dailyLogs,
      input.foodLibrary,
      input.settings,
    )
    if (!row) continue

    let hit = false
    if (kind === 'protein_day') {
      hit = isProteinOnTarget(row.protein, row.goal.protein)
    } else if (kind === 'calorie_day') {
      hit = isWithinTarget(row.calories, row.goal.calories)
    } else if (kind === 'fiber_day') {
      hit = isWithinTarget(row.fiber, row.goal.fiber)
    } else if (kind === 'carbs_day') {
      hit = isWithinTarget(row.carbs, row.goal.carbs)
    } else if (kind === 'fat_day') {
      hit = isWithinTarget(row.fat, row.goal.fat)
    } else if (kind === 'sugars_day') {
      hit = isWithinTarget(row.sugars, row.goal.sugars)
    } else if (kind === 'deficit_day') {
      const target = row.goal.targetDeficit ?? 0
      hit = target < 0 && isEnergyBalanceOnTarget(row.net, target)
    } else if (kind === 'surplus_day') {
      const target = row.goal.targetDeficit ?? 0
      hit = target > 0 && isEnergyBalanceOnTarget(row.net, target)
    } else if (kind === 'balance_day') {
      if ((row.goal.targetDeficit ?? 0) !== 0) {
        hit = isEnergyBalanceOnTarget(row.net, row.goal.targetDeficit)
      }
    } else if (kind === 'macro_triple_day') {
      hit =
        isProteinOnTarget(row.protein, row.goal.protein) &&
        isWithinTarget(row.calories, row.goal.calories) &&
        isWithinTarget(row.fiber, row.goal.fiber)
    } else if (kind === 'macro_quad_day') {
      hit =
        isProteinOnTarget(row.protein, row.goal.protein) &&
        isWithinTarget(row.calories, row.goal.calories) &&
        isWithinTarget(row.carbs, row.goal.carbs) &&
        isWithinTarget(row.fat, row.goal.fat)
    }

    if (hit) {
      instances.push({ earnedAt: date, periodKey: `${kind}-${date}` })
    }
  }

  return instances
}

type GoalStreakKind = 'protein' | 'calorie' | 'fiber' | 'deficit'

function evaluateGoalStreakMilestones(
  input: BadgeScanInput,
  kind: GoalStreakKind,
  milestone: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const prefix =
    kind === 'protein'
      ? 'protein-streak'
      : kind === 'calorie'
        ? 'calorie-streak'
        : kind === 'fiber'
          ? 'fiber-streak'
          : 'deficit-streak'

  const hitsGoal = (date: string): boolean => {
    if (!dayHasLoggedFood(input.dailyLogs[date])) return false
    const row = getStatsDayRowForDate(
      date,
      input.dailyLogs,
      input.foodLibrary,
      input.settings,
    )
    if (!row) return false
    if (kind === 'protein') {
      return isProteinOnTarget(row.protein, row.goal.protein)
    }
    if (kind === 'calorie') {
      return isWithinTarget(row.calories, row.goal.calories)
    }
    if (kind === 'fiber') {
      return isWithinTarget(row.fiber, row.goal.fiber)
    }
    const target = row.goal.targetDeficit ?? 0
    return target < 0 && isEnergyBalanceOnTarget(row.net, target)
  }

  const computeStreak = (anchorDate: string): number => {
    let streak = 0
    let d = anchorDate
    while (hitsGoal(d)) {
      streak += 1
      d = shiftDate(d, -1)
    }
    return streak
  }

  for (const date of sortedLogDates(input.dailyLogs)) {
    if (!hitsGoal(date)) continue
    const streak = computeStreak(date)
    const prevStreak = computeStreak(shiftDate(date, -1))
    if (streak >= milestone && prevStreak < milestone) {
      instances.push({ earnedAt: date, periodKey: `${prefix}-${milestone}-${date}` })
    }
  }

  return instances
}

function evaluateMealCompleteDays(input: BadgeScanInput): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  for (const [date, log] of Object.entries(input.dailyLogs)) {
    if (!dayHasLoggedFood(log)) continue
    const meals = resolveMealsForLog(log, input.settings)
    if (meals.length === 0) continue
    const covered = new Set<string>()
    for (const entry of log.foods) {
      if (!entry.meal?.trim()) continue
      if (!isConfiguredMeal(entry.meal, meals)) continue
      covered.add(resolveLoggedMeal(entry.meal, meals)!.toLowerCase())
    }
    if (meals.every((meal) => covered.has(meal.toLowerCase()))) {
      instances.push({ earnedAt: date, periodKey: `meal-complete-${date}` })
    }
  }
  return instances
}

function evaluateCumulativeLogThresholds(
  dailyLogs: Record<string, DailyLog>,
  thresholds: number[],
  prefix: string,
  recurringEvery?: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const awarded = new Set<string>()
  let cumulative = 0

  for (const date of Object.keys(dailyLogs).sort()) {
    cumulative += dailyLogs[date].foods.length

    if (recurringEvery) {
      for (let t = recurringEvery; t <= cumulative; t += recurringEvery) {
        const key = `${prefix}-${t}`
        if (awarded.has(key)) continue
        awarded.add(key)
        instances.push({ earnedAt: date, periodKey: key })
      }
    } else {
      for (const threshold of thresholds) {
        const key = `${prefix}-${threshold}`
        if (cumulative >= threshold && !awarded.has(key)) {
          awarded.add(key)
          instances.push({ earnedAt: date, periodKey: key })
        }
      }
    }
  }

  return instances
}

function evaluateDistinctDayThresholds(
  dailyLogs: Record<string, DailyLog>,
  thresholds: number[],
): BadgeEarnedInstance[] {
  const dates = sortedLogDates(dailyLogs)
  const instances: BadgeEarnedInstance[] = []

  for (const threshold of thresholds) {
    if (dates.length >= threshold) {
      instances.push({
        earnedAt: dates[threshold - 1],
        periodKey: `days-${threshold}`,
      })
    }
  }

  return instances
}

function evaluateLibraryThresholds(
  foodLibrary: FoodItem[],
  thresholds: number[],
  fallbackDate: string,
): Partial<Record<BadgeId, BadgeEarnedInstance[]>> {
  const count = foodLibrary.filter((f) => !f.isRecipe).length
  const awards: Partial<Record<BadgeId, BadgeEarnedInstance[]>> = {}
  const map: Record<number, BadgeId> = {
    5: 'library_five',
    10: 'library_ten',
    25: 'library_twentyfive',
    50: 'library_fifty',
    100: 'library_hundred',
  }

  for (const threshold of thresholds) {
    const id = map[threshold]
    if (id && count >= threshold) {
      awards[id] = [{ earnedAt: fallbackDate, periodKey: 'once' }]
    }
  }

  return awards
}

function evaluateRecipeCountThreshold(
  foodLibrary: FoodItem[],
  threshold: number,
  fallbackDate: string,
): BadgeEarnedInstance[] | undefined {
  const count = foodLibrary.filter((f) => f.isRecipe).length
  if (count >= threshold) {
    return [{ earnedAt: fallbackDate, periodKey: 'once' }]
  }
  return undefined
}

function evaluateFavoriteThresholds(
  favoriteFoodIds: string[],
  fallbackDate: string,
): Partial<Record<BadgeId, BadgeEarnedInstance[]>> {
  const awards: Partial<Record<BadgeId, BadgeEarnedInstance[]>> = {}
  const count = favoriteFoodIds.length
  const map: Record<number, BadgeId> = {
    5: 'five_favorites',
    10: 'ten_favorites',
  }

  for (const [threshold, id] of Object.entries(map)) {
    if (count >= Number(threshold)) {
      awards[id] = [{ earnedAt: fallbackDate, periodKey: 'once' }]
    }
  }

  return awards
}

function evaluateDistinctCountThreshold(
  dates: string[],
  threshold: number,
  prefix: string,
): BadgeEarnedInstance[] {
  if (dates.length >= threshold) {
    return [{ earnedAt: dates[threshold - 1], periodKey: `${prefix}-${threshold}` }]
  }
  return []
}

function evaluateBigDays(
  dailyLogs: Record<string, DailyLog>,
  minFoods: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  for (const [date, log] of Object.entries(dailyLogs)) {
    if (log.foods.length >= minFoods) {
      instances.push({ earnedAt: date, periodKey: `big-day-${date}` })
    }
  }
  return instances
}

function evaluateWeekendLogger(dailyLogs: Record<string, DailyLog>): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const weekStarts = new Set<string>()

  for (const date of Object.keys(dailyLogs)) {
    if (!dayHasLoggedFood(dailyLogs[date])) continue
    weekStarts.add(getWeekRangeForDate(date).start)
  }

  for (const weekStart of [...weekStarts].sort()) {
    const week = getWeekRangeForDate(weekStart)
    let satLogged = false
    let sunLogged = false
    let d = week.start
    while (d <= week.end) {
      const weekday = parseISO(d).getDay()
      if (weekday === 6 && dayHasLoggedFood(dailyLogs[d])) satLogged = true
      if (weekday === 0 && dayHasLoggedFood(dailyLogs[d])) sunLogged = true
      d = shiftDate(d, 1)
    }
    if (satLogged && sunLogged) {
      instances.push({ earnedAt: week.end, periodKey: `weekend-${week.start}` })
    }
  }

  return instances
}

function evaluateMealStreakByPosition(
  dailyLogs: Record<string, DailyLog>,
  settings: Settings,
  position: number,
  milestone: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []

  const hasMeal = (date: string) => {
    const log = dailyLogs[date]
    if (!log || !dayHasLoggedFood(log)) return false
    const meals = resolveMealsForLog(log, settings)
    const targetMeal = meals[position]
    if (!targetMeal) return false
    const mealLower = targetMeal.toLowerCase()
    return log.foods.some((entry) => {
      if (!entry.meal?.trim()) return false
      if (!isConfiguredMeal(entry.meal, meals)) return false
      return resolveLoggedMeal(entry.meal, meals)!.toLowerCase() === mealLower
    })
  }

  for (const date of sortedLogDates(dailyLogs)) {
    if (!hasMeal(date)) continue
    const log = dailyLogs[date]
    const meals = resolveMealsForLog(log, settings)
    const targetMeal = meals[position]
    if (!targetMeal) continue
    const mealLower = targetMeal.toLowerCase()
    let streak = 0
    let d = date
    while (hasMeal(d)) {
      streak += 1
      d = shiftDate(d, -1)
    }
    const prevDate = shiftDate(date, -1)
    let prevStreak = 0
    let pd = prevDate
    while (hasMeal(pd)) {
      prevStreak += 1
      pd = shiftDate(pd, -1)
    }
    if (streak >= milestone && prevStreak < milestone) {
      instances.push({
        earnedAt: date,
        periodKey: `meal-streak-${mealLower}-${milestone}-${date}`,
      })
    }
  }

  return instances
}

function computeBurnStreak(
  dailyLogs: Record<string, DailyLog>,
  anchorDate: string,
): number {
  let streak = 0
  let date = anchorDate
  while ((dailyLogs[date]?.burnedCalories ?? 0) > 0) {
    streak += 1
    date = shiftDate(date, -1)
  }
  return streak
}

function datesWithBurn(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.keys(dailyLogs)
    .filter((date) => (dailyLogs[date]?.burnedCalories ?? 0) > 0)
    .sort()
}

function evaluateBurnStreakMilestones(
  dailyLogs: Record<string, DailyLog>,
  milestone: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  for (const date of datesWithBurn(dailyLogs)) {
    const streak = computeBurnStreak(dailyLogs, date)
    const prevStreak = computeBurnStreak(dailyLogs, shiftDate(date, -1))
    if (streak >= milestone && prevStreak < milestone) {
      instances.push({
        earnedAt: date,
        periodKey: `burn-streak-${milestone}-${date}`,
      })
    }
  }
  return instances
}

function evaluateNetDeficitDays(
  input: BadgeScanInput,
  minDeficit: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  for (const date of sortedLogDates(input.dailyLogs)) {
    const log = input.dailyLogs[date]
    if ((log?.burnedCalories ?? 0) <= 0) continue
    const row = getStatsDayRowForDate(
      date,
      input.dailyLogs,
      input.foodLibrary,
      input.settings,
    )
    if (!row || row.net > -minDeficit) continue
    instances.push({ earnedAt: date, periodKey: `net-deficit-${minDeficit}-${date}` })
  }
  return instances
}

function evaluateNetDeficitWeeks(
  input: BadgeScanInput,
  minWeeklyDeficit: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const weekStarts = new Set<string>()

  for (const date of sortedLogDates(input.dailyLogs)) {
    if ((input.dailyLogs[date]?.burnedCalories ?? 0) <= 0) continue
    weekStarts.add(getWeekRangeForDate(date).start)
  }

  for (const weekStart of [...weekStarts].sort()) {
    const week = getWeekRangeForDate(weekStart)
    let totalDeficit = 0
    let d = week.start
    while (d <= week.end) {
      const log = input.dailyLogs[d]
      if (!log || !dayHasLoggedFood(log) || log.burnedCalories <= 0) {
        d = shiftDate(d, 1)
        continue
      }
      const row = getStatsDayRowForDate(
        d,
        input.dailyLogs,
        input.foodLibrary,
        input.settings,
      )
      if (row && row.net < 0) {
        totalDeficit += -row.net
      }
      d = shiftDate(d, 1)
    }
    if (totalDeficit >= minWeeklyDeficit) {
      instances.push({
        earnedAt: week.end,
        periodKey: `net-deficit-week-${minWeeklyDeficit}-${week.start}`,
      })
    }
  }

  return instances
}

function evaluateBurnMonthCalendar(
  dailyLogs: Record<string, DailyLog>,
): BadgeEarnedInstance[] {
  const byMonth = new Map<string, string[]>()
  for (const date of datesWithBurn(dailyLogs)) {
    const monthKey = format(parseISO(date), 'yyyy-MM')
    const bucket = byMonth.get(monthKey) ?? []
    bucket.push(date)
    byMonth.set(monthKey, bucket)
  }

  for (const [monthKey, dates] of [...byMonth.entries()].sort()) {
    if (dates.length >= 20) {
      return [
        {
          earnedAt: dates[dates.length - 1],
          periodKey: `burn-month-calendar-${monthKey}`,
        },
      ]
    }
  }

  return []
}

function evaluateFullWeekLogger(dailyLogs: Record<string, DailyLog>): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const weekStarts = new Set<string>()

  for (const date of Object.keys(dailyLogs)) {
    if (!dayHasLoggedFood(dailyLogs[date])) continue
    weekStarts.add(getWeekRangeForDate(date).start)
  }

  for (const weekStart of [...weekStarts].sort()) {
    const week = getWeekRangeForDate(weekStart)
    let allDays = true
    let d = week.start
    while (d <= week.end) {
      if (!dayHasLoggedFood(dailyLogs[d])) {
        allDays = false
        break
      }
      d = shiftDate(d, 1)
    }
    if (allDays) {
      instances.push({ earnedAt: week.end, periodKey: `full-week-${week.start}` })
    }
  }

  return instances
}

function evaluateCategoryThresholds(
  foodLibrary: FoodItem[],
  customCategories: string[],
  fallbackDate: string,
): Partial<Record<BadgeId, BadgeEarnedInstance[]>> {
  const awards: Partial<Record<BadgeId, BadgeEarnedInstance[]>> = {}
  const allCategories = collectAllCategories(foodLibrary, customCategories)

  if (allCategories.length >= 5) {
    awards.categories_five = [{ earnedAt: fallbackDate, periodKey: 'once' }]
  }

  const taggedFoods = foodLibrary.filter(
    (food) => !food.isRecipe && foodCategories(food).length > 0,
  )
  if (taggedFoods.length >= 10) {
    awards.category_tagger = [{ earnedAt: fallbackDate, periodKey: 'once' }]
  }

  return awards
}

function evaluateWeekdayWarrior(dailyLogs: Record<string, DailyLog>): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const weekStarts = new Set<string>()

  for (const date of Object.keys(dailyLogs)) {
    if (!dayHasLoggedFood(dailyLogs[date])) continue
    weekStarts.add(getWeekRangeForDate(date).start)
  }

  for (const weekStart of [...weekStarts].sort()) {
    const week = getWeekRangeForDate(weekStart)
    let allWeekdays = true
    let d = week.start
    while (d <= week.end) {
      const weekday = parseISO(d).getDay()
      if (weekday >= 1 && weekday <= 5 && !dayHasLoggedFood(dailyLogs[d])) {
        allWeekdays = false
        break
      }
      d = shiftDate(d, 1)
    }
    if (allWeekdays) {
      instances.push({ earnedAt: week.end, periodKey: `weekday-${week.start}` })
    }
  }

  return instances
}

function evaluateMealCompleteWeeks(input: BadgeScanInput): BadgeEarnedInstance[] {
  const completeDays = evaluateMealCompleteDays(input)
  const byWeek = new Map<string, number>()

  for (const inst of completeDays) {
    const weekStart = getWeekRangeForDate(inst.earnedAt).start
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + 1)
  }

  const instances: BadgeEarnedInstance[] = []
  for (const [weekStart, count] of [...byWeek.entries()].sort()) {
    if (count >= 5) {
      const week = getWeekRangeForDate(weekStart)
      instances.push({
        earnedAt: week.end,
        periodKey: `meal-complete-week-${weekStart}`,
      })
    }
  }

  return instances
}

function evaluateBurnWeeks(dailyLogs: Record<string, DailyLog>): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const weekStarts = new Set<string>()

  for (const date of Object.keys(dailyLogs)) {
    if (dailyLogs[date].burnedCalories > 0) {
      weekStarts.add(getWeekRangeForDate(date).start)
    }
  }

  for (const weekStart of [...weekStarts].sort()) {
    const week = getWeekRangeForDate(weekStart)
    let burnDays = 0
    let d = week.start
    while (d <= week.end) {
      if ((dailyLogs[d]?.burnedCalories ?? 0) > 0) burnDays += 1
      d = shiftDate(d, 1)
    }
    if (burnDays >= 5) {
      instances.push({ earnedAt: week.end, periodKey: `burn-week-${week.start}` })
    }
  }

  return instances
}

function evaluateNoteStreak(
  dailyLogs: Record<string, DailyLog>,
  milestone: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const hasNote = (date: string) => (dailyLogs[date]?.note.trim().length ?? 0) > 0

  const noteDates = Object.keys(dailyLogs).filter(hasNote).sort()
  for (const date of noteDates) {
    let streak = 0
    let d = date
    while (hasNote(d)) {
      streak += 1
      d = shiftDate(d, -1)
    }
    const prevStreak = (() => {
      let s = 0
      let pd = shiftDate(date, -1)
      while (hasNote(pd)) {
        s += 1
        pd = shiftDate(pd, -1)
      }
      return s
    })()
    if (streak >= milestone && prevStreak < milestone) {
      instances.push({ earnedAt: date, periodKey: `note-streak-${milestone}-${date}` })
    }
  }

  return instances
}

function evaluateRecipeLogThresholds(
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
  every: number,
): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const awarded = new Set<number>()
  let cumulative = 0
  const recipeIds = new Set(foodLibrary.filter((f) => f.isRecipe).map((f) => f.id))

  for (const date of Object.keys(dailyLogs).sort()) {
    for (const entry of dailyLogs[date].foods) {
      if (!recipeIds.has(entry.foodId)) continue
      cumulative += 1
      for (let t = every; t <= cumulative; t += every) {
        if (awarded.has(t)) continue
        awarded.add(t)
        instances.push({ earnedAt: date, periodKey: `recipe-logs-${t}` })
      }
    }
  }

  return instances
}

/** Scan all historical data and return every badge instance the user qualifies for. */
export function scanAllBadgeInstances(input: BadgeScanInput): BadgeAwardMap {
  const { dailyLogs, foodLibrary, favoriteFoodIds, customCategories } = input
  const awards: BadgeAwardMap = {}

  const firstFoodDate = sortedLogDates(dailyLogs)[0]
  const fallbackDate = firstFoodDate ?? foodLibrary[0]?.lastUsed ?? '1970-01-01'

  if (firstFoodDate) {
    awards.first_food = [{ earnedAt: firstFoodDate, periodKey: 'once' }]
  }

  Object.assign(
    awards,
    evaluateLibraryThresholds(foodLibrary, [5, 10, 25, 50, 100], fallbackDate),
  )

  const firstRecipe = foodLibrary
    .filter((f) => f.isRecipe)
    .sort((a, b) => a.lastUsed.localeCompare(b.lastUsed))[0]
  if (firstRecipe) {
    awards.first_recipe = [{ earnedAt: firstRecipe.lastUsed, periodKey: 'once' }]
  }

  const recipesFive = evaluateRecipeCountThreshold(foodLibrary, 5, fallbackDate)
  if (recipesFive) {
    awards.recipes_five = recipesFive
  }
  const recipesTen = evaluateRecipeCountThreshold(foodLibrary, 10, fallbackDate)
  if (recipesTen) {
    awards.recipes_ten = recipesTen
  }

  Object.assign(
    awards,
    evaluateCategoryThresholds(foodLibrary, customCategories, fallbackDate),
  )

  if (favoriteFoodIds.length > 0) {
    awards.first_favorite = [{ earnedAt: fallbackDate, periodKey: 'once' }]
  }
  Object.assign(awards, evaluateFavoriteThresholds(favoriteFoodIds, fallbackDate))

  const recipeIds = new Set(foodLibrary.filter((f) => f.isRecipe).map((f) => f.id))
  let firstRecipeLogDate: string | undefined
  let firstCustomRecipeDate: string | undefined

  for (const date of Object.keys(dailyLogs).sort()) {
    for (const entry of dailyLogs[date].foods) {
      if (!recipeIds.has(entry.foodId)) continue
      if (!firstRecipeLogDate) firstRecipeLogDate = date
      if (entry.overriddenComponents && !firstCustomRecipeDate) {
        firstCustomRecipeDate = date
      }
    }
  }

  if (firstRecipeLogDate) {
    awards.recipe_logged = [{ earnedAt: firstRecipeLogDate, periodKey: 'once' }]
  }
  if (firstCustomRecipeDate) {
    awards.custom_recipe = [{ earnedAt: firstCustomRecipeDate, periodKey: 'once' }]
  }

  awards.recipe_logs_10 = evaluateRecipeLogThresholds(dailyLogs, foodLibrary, 10)
  awards.recipe_logs_50 = evaluateRecipeLogThresholds(dailyLogs, foodLibrary, 50)
  awards.streak_3 = evaluateStreakMilestones(dailyLogs, 3, 'streak-3')
  awards.streak_7 = evaluateStreakMilestones(dailyLogs, 7, 'streak-7')
  awards.streak_14 = evaluateStreakMilestones(dailyLogs, 14, 'streak-14')
  awards.streak_21 = evaluateStreakMilestones(dailyLogs, 21, 'streak-21')
  awards.streak_30 = evaluateStreakMilestones(dailyLogs, 30, 'streak-30')
  awards.streak_45 = evaluateStreakMilestones(dailyLogs, 45, 'streak-45')
  awards.streak_60 = evaluateStreakMilestones(dailyLogs, 60, 'streak-60')
  awards.streak_90 = evaluateStreakMilestones(dailyLogs, 90, 'streak-90')
  awards.streak_100 = evaluateStreakMilestones(dailyLogs, 100, 'streak-100')
  awards.streak_200 = evaluateStreakMilestones(dailyLogs, 200, 'streak-200')
  awards.streak_365 = evaluateStreakMilestones(dailyLogs, 365, 'streak-365')

  awards.protein_day = evaluateDailyGoalBadges(input, 'protein_day')
  awards.calorie_day = evaluateDailyGoalBadges(input, 'calorie_day')
  awards.balance_day = evaluateDailyGoalBadges(input, 'balance_day')
  awards.fiber_day = evaluateDailyGoalBadges(input, 'fiber_day')
  awards.carbs_day = evaluateDailyGoalBadges(input, 'carbs_day')
  awards.fat_day = evaluateDailyGoalBadges(input, 'fat_day')
  awards.sugars_day = evaluateDailyGoalBadges(input, 'sugars_day')
  awards.deficit_day = evaluateDailyGoalBadges(input, 'deficit_day')
  awards.surplus_day = evaluateDailyGoalBadges(input, 'surplus_day')
  awards.macro_triple_day = evaluateDailyGoalBadges(input, 'macro_triple_day')
  awards.macro_quad_day = evaluateDailyGoalBadges(input, 'macro_quad_day')

  awards.protein_week = evaluateWeeklyBadges(input, 'protein_week')
  awards.calorie_week = evaluateWeeklyBadges(input, 'calorie_week')
  awards.balance_week = evaluateWeeklyBadges(input, 'balance_week')
  awards.fiber_week = evaluateWeeklyBadges(input, 'fiber_week')
  awards.carbs_week = evaluateWeeklyBadges(input, 'carbs_week')
  awards.fat_week = evaluateWeeklyBadges(input, 'fat_week')
  awards.sugars_week = evaluateWeeklyBadges(input, 'sugars_week')

  awards.protein_streak_7 = evaluateGoalStreakMilestones(input, 'protein', 7)
  awards.calorie_streak_7 = evaluateGoalStreakMilestones(input, 'calorie', 7)
  awards.fiber_streak_7 = evaluateGoalStreakMilestones(input, 'fiber', 7)
  awards.deficit_streak_3 = evaluateGoalStreakMilestones(input, 'deficit', 3)
  awards.deficit_streak_7 = evaluateGoalStreakMilestones(input, 'deficit', 7)

  awards.meal_complete = evaluateMealCompleteDays(input)
  awards.meal_complete_week = evaluateMealCompleteWeeks(input)
  awards.big_day_10 = evaluateBigDays(dailyLogs, 10)
  awards.big_day_15 = evaluateBigDays(dailyLogs, 15)
  awards.weekend_logger = evaluateWeekendLogger(dailyLogs)
  awards.weekday_warrior = evaluateWeekdayWarrior(dailyLogs)
  awards.full_week_logger = evaluateFullWeekLogger(dailyLogs)
  awards.burn_week = evaluateBurnWeeks(dailyLogs)
  awards.burn_streak_7 = evaluateBurnStreakMilestones(dailyLogs, 7)
  awards.burn_streak_14 = evaluateBurnStreakMilestones(dailyLogs, 14)
  awards.burn_streak_30 = evaluateBurnStreakMilestones(dailyLogs, 30)
  awards.net_deficit_500_day = evaluateNetDeficitDays(input, 500)
  awards.net_deficit_1000_day = evaluateNetDeficitDays(input, 1000)
  awards.net_deficit_week_5000 = evaluateNetDeficitWeeks(input, 5000)

  awards.breakfast_streak_7 = evaluateMealStreakByPosition(dailyLogs, input.settings, 0, 7)
  awards.lunch_streak_7 = evaluateMealStreakByPosition(dailyLogs, input.settings, 1, 7)
  awards.dinner_streak_7 = evaluateMealStreakByPosition(dailyLogs, input.settings, 2, 7)

  const firstNoteDate = Object.keys(dailyLogs)
    .filter((date) => dailyLogs[date].note.trim().length > 0)
    .sort()[0]
  if (firstNoteDate) {
    awards.note_writer = [{ earnedAt: firstNoteDate, periodKey: 'once' }]
  }
  const firstLongNoteDate = Object.keys(dailyLogs)
    .filter((date) => dailyLogs[date].note.trim().length >= 100)
    .sort()[0]
  if (firstLongNoteDate) {
    awards.note_long = [{ earnedAt: firstLongNoteDate, periodKey: 'once' }]
  }
  awards.note_streak_3 = evaluateNoteStreak(dailyLogs, 3)
  awards.note_streak_7 = evaluateNoteStreak(dailyLogs, 7)
  awards.note_streak_14 = evaluateNoteStreak(dailyLogs, 14)

  let firstUncategorizedDate: string | undefined
  for (const date of Object.keys(dailyLogs).sort()) {
    const log = dailyLogs[date]
    const meals = resolveMealsForLog(log, input.settings)
    for (const entry of log.foods) {
      if (!entry.meal?.trim() || !isConfiguredMeal(entry.meal, meals)) {
        firstUncategorizedDate = date
        break
      }
    }
    if (firstUncategorizedDate) break
  }
  if (firstUncategorizedDate) {
    awards.first_uncategorized = [{ earnedAt: firstUncategorizedDate, periodKey: 'once' }]
  }

  const firstBurnDate = datesWithBurn(dailyLogs)[0]
  if (firstBurnDate) {
    awards.burn_tracker = [{ earnedAt: firstBurnDate, periodKey: 'once' }]
  }
  awards.burn_month_days = evaluateDistinctCountThreshold(datesWithBurn(dailyLogs), 20, 'burn-days')
  awards.burn_logs_50 = evaluateDistinctCountThreshold(datesWithBurn(dailyLogs), 50, 'burn-logs')
  awards.burn_month_calendar = evaluateBurnMonthCalendar(dailyLogs)

  const weightDates = datesWithWeight(dailyLogs)
  const firstWeightDate = weightDates[0]
  if (firstWeightDate) {
    awards.first_weight = [{ earnedAt: firstWeightDate, periodKey: 'once' }]
  }
  awards.weight_logs_10 = evaluateDistinctCountThreshold(weightDates, 10, 'weight-days')
  awards.weight_logs_50 = evaluateDistinctCountThreshold(weightDates, 50, 'weight-days')

  awards.weight_streak_7 = evaluateWeightStreakMilestones(dailyLogs, 7)
  awards.weight_streak_14 = evaluateWeightStreakMilestones(dailyLogs, 14)
  awards.weight_streak_30 = evaluateWeightStreakMilestones(dailyLogs, 30)
  awards.weight_streak_60 = evaluateWeightStreakMilestones(dailyLogs, 60)
  awards.weight_streak_90 = evaluateWeightStreakMilestones(dailyLogs, 90)

  awards.logs_50 = evaluateCumulativeLogThresholds(dailyLogs, [50], 'logs')
  awards.logs_100 = evaluateCumulativeLogThresholds(dailyLogs, [], 'logs', 100)
  awards.logs_250 = evaluateCumulativeLogThresholds(dailyLogs, [250], 'logs')
  awards.logs_500 = evaluateCumulativeLogThresholds(dailyLogs, [500], 'logs')
  awards.logs_1000 = evaluateCumulativeLogThresholds(dailyLogs, [1000], 'logs')
  awards.logs_2000 = evaluateCumulativeLogThresholds(dailyLogs, [2000], 'logs')
  awards.logs_5000 = evaluateCumulativeLogThresholds(dailyLogs, [5000], 'logs')

  awards.days_logged_10 = evaluateDistinctDayThresholds(dailyLogs, [10])
  awards.days_logged_50 = evaluateDistinctDayThresholds(dailyLogs, [50])
  awards.days_logged_100 = evaluateDistinctDayThresholds(dailyLogs, [100])
  awards.days_logged_200 = evaluateDistinctDayThresholds(dailyLogs, [200])
  awards.days_logged_365 = evaluateDistinctDayThresholds(dailyLogs, [365])
  awards.days_logged_500 = evaluateDistinctDayThresholds(dailyLogs, [500])

  return awards
}

export function applyBadgeAwards(
  badgeState: BadgeState,
  awards: BadgeAwardMap,
): {
  nextState: BadgeState
  newAwards: Partial<Record<BadgeId, BadgeEarnedInstance[]>>
  newBadgeIds: BadgeId[]
} {
  const nextProgress = { ...badgeState.progress }
  const newAwards: Partial<Record<BadgeId, BadgeEarnedInstance[]>> = {}
  const newBadgeIds: BadgeId[] = []

  for (const badgeId of ALL_BADGE_IDS) {
    const found = awards[badgeId] ?? []
    if (found.length === 0) continue

    const existing = nextProgress[badgeId]?.instances ?? []
    const { merged, added } = mergeBadgeInstances(existing, found)
    if (added.length === 0) continue

    nextProgress[badgeId] = { instances: merged }
    newAwards[badgeId] = added
    newBadgeIds.push(badgeId)
  }

  return {
    nextState: { ...badgeState, progress: nextProgress },
    newAwards,
    newBadgeIds,
  }
}

export function appendUnviewedBadges(
  badgeState: BadgeState,
  badgeIds: BadgeId[],
): BadgeState {
  if (badgeIds.length === 0) return badgeState
  const unviewed = new Set(badgeState.unviewedBadgeIds ?? [])
  const newSection = new Set(badgeState.newSectionBadgeIds ?? [])
  for (const id of badgeIds) {
    unviewed.add(id)
    newSection.add(id)
  }
  return {
    ...badgeState,
    unviewedBadgeIds: [...unviewed],
    newSectionBadgeIds: [...newSection],
  }
}

export function createEmptyBadgeState(): BadgeState {
  return {
    initialized: false,
    progress: {},
    unviewedBadgeIds: [],
    newSectionBadgeIds: [],
  }
}

export function formatBadgeEarnedDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'MMM d, yyyy')
}