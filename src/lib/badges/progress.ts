import { collectAllCategories, foodCategories } from '@/lib/categories'
import { getWeekRangeForDate, shiftDate, todayString } from '@/lib/dates'
import { dayHasLoggedFood, computeLoggingStreak } from '@/lib/loggingStreak'
import { isConfiguredMeal, resolveLoggedMeal } from '@/lib/meals'
import { resolveMealsForLog } from '@/lib/mealProfiles'
import { getStatsDayRowForDate } from '@/lib/stats'
import type { DailyLog, FoodItem, Settings } from '@/lib/types'
import type { BadgeId } from '@/lib/badges/types'

const ADHERENCE_TOLERANCE = 0.15

export type BadgeProgressToward = {
  current: number
  target: number
  /** Ready-to-show line, e.g. "23 / 50 days logged so far" */
  text: string
  /** 0–1 for progress bar fill */
  fraction: number
}

export type BadgeProgressInput = {
  dailyLogs: Record<string, DailyLog>
  foodLibrary: FoodItem[]
  settings: Settings
  favoriteFoodIds: string[]
  customCategories: string[]
}

function clampFraction(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 1 : 0
  return Math.min(1, Math.max(0, current / target))
}

function formatCount(n: number): string {
  return Math.round(n).toLocaleString()
}

function makeProgress(
  current: number,
  target: number,
  text: string,
): BadgeProgressToward {
  const c = Math.max(0, current)
  const t = Math.max(1, target)
  return {
    current: c,
    target: t,
    text,
    fraction: clampFraction(c, t),
  }
}

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

function sortedLogDates(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.keys(dailyLogs)
    .filter((date) => dayHasLoggedFood(dailyLogs[date]))
    .sort()
}

function totalFoodLogs(dailyLogs: Record<string, DailyLog>): number {
  return Object.values(dailyLogs).reduce((sum, log) => sum + log.foods.length, 0)
}

function datesWithWeight(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.keys(dailyLogs)
    .filter((date) => {
      const w = dailyLogs[date]?.weightKg
      return w != null && w > 0
    })
    .sort()
}

function datesWithBurn(dailyLogs: Record<string, DailyLog>): string[] {
  return Object.keys(dailyLogs)
    .filter((date) => (dailyLogs[date]?.burnedCalories ?? 0) > 0)
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

function computeNoteStreak(
  dailyLogs: Record<string, DailyLog>,
  anchorDate: string,
): number {
  let streak = 0
  let date = anchorDate
  while ((dailyLogs[date]?.note.trim().length ?? 0) > 0) {
    streak += 1
    date = shiftDate(date, -1)
  }
  return streak
}

type GoalStreakKind = 'protein' | 'calorie' | 'fiber' | 'deficit'

function hitsGoalKind(
  input: BadgeProgressInput,
  kind: GoalStreakKind,
  date: string,
): boolean {
  if (!dayHasLoggedFood(input.dailyLogs[date])) return false
  const row = getStatsDayRowForDate(
    date,
    input.dailyLogs,
    input.foodLibrary,
    input.settings,
  )
  if (!row) return false
  if (kind === 'protein') return isProteinOnTarget(row.protein, row.goal.protein)
  if (kind === 'calorie') return isWithinTarget(row.calories, row.goal.calories)
  if (kind === 'fiber') return isWithinTarget(row.fiber, row.goal.fiber)
  const target = row.goal.targetDeficit ?? 0
  return target < 0 && isEnergyBalanceOnTarget(row.net, target)
}

function computeGoalStreak(
  input: BadgeProgressInput,
  kind: GoalStreakKind,
  anchorDate: string,
): number {
  let streak = 0
  let d = anchorDate
  while (hitsGoalKind(input, kind, d)) {
    streak += 1
    d = shiftDate(d, -1)
  }
  return streak
}

function computeMealStreak(
  input: BadgeProgressInput,
  position: number,
  anchorDate: string,
): number {
  const hasMeal = (date: string) => {
    const log = input.dailyLogs[date]
    if (!log || !dayHasLoggedFood(log)) return false
    const meals = resolveMealsForLog(log, input.settings)
    const targetMeal = meals[position]
    if (!targetMeal) return false
    const mealLower = targetMeal.toLowerCase()
    return log.foods.some((entry) => {
      if (!entry.meal?.trim()) return false
      if (!isConfiguredMeal(entry.meal, meals)) return false
      return resolveLoggedMeal(entry.meal, meals)!.toLowerCase() === mealLower
    })
  }
  let streak = 0
  let d = anchorDate
  while (hasMeal(d)) {
    streak += 1
    d = shiftDate(d, -1)
  }
  return streak
}

function recipeLogCount(
  dailyLogs: Record<string, DailyLog>,
  foodLibrary: FoodItem[],
): number {
  const recipeIds = new Set(foodLibrary.filter((f) => f.isRecipe).map((f) => f.id))
  let count = 0
  for (const log of Object.values(dailyLogs)) {
    for (const entry of log.foods) {
      if (recipeIds.has(entry.foodId)) count += 1
    }
  }
  return count
}

function countProgress(
  current: number,
  target: number,
  noun: string,
): BadgeProgressToward {
  const capped = Math.min(current, target)
  return makeProgress(
    current,
    target,
    `${formatCount(capped)} / ${formatCount(target)} ${noun}`,
  )
}

function streakProgress(
  current: number,
  target: number,
  label = 'Current streak',
): BadgeProgressToward {
  const capped = Math.min(current, target)
  return makeProgress(
    current,
    target,
    `${label}: ${formatCount(capped)} / ${formatCount(target)} days`,
  )
}

function recurringCycleProgress(
  total: number,
  every: number,
  noun: string,
): BadgeProgressToward {
  if (every <= 0) return makeProgress(0, 1, 'No progress data')
  const inCycle = total % every
  // When total is exact multiple and > 0, user just hit a milestone → show full cycle
  const current = total > 0 && inCycle === 0 ? every : inCycle
  return makeProgress(
    current,
    every,
    `Progress: ${formatCount(current)} / ${formatCount(every)} ${noun}`,
  )
}

function todayHitProgress(hit: boolean, label: string): BadgeProgressToward {
  return makeProgress(
    hit ? 1 : 0,
    1,
    hit ? `Today: ${label} ✓` : `Today: ${label} not yet`,
  )
}

function weeklyDaysProgress(
  daysHit: number,
  needed: number,
  label: string,
): BadgeProgressToward {
  return makeProgress(
    daysHit,
    needed,
    `${label}: ${formatCount(Math.min(daysHit, needed))} / ${formatCount(needed)} days this week`,
  )
}

function thisWeekLoggedDays(dailyLogs: Record<string, DailyLog>, today: string): number {
  const week = getWeekRangeForDate(today)
  let count = 0
  let d = week.start
  while (d <= week.end) {
    if (dayHasLoggedFood(dailyLogs[d])) count += 1
    d = shiftDate(d, 1)
  }
  return count
}

function thisWeekGoalHitDays(
  input: BadgeProgressInput,
  today: string,
  predicate: (date: string) => boolean,
): number {
  const week = getWeekRangeForDate(today)
  let count = 0
  let d = week.start
  while (d <= week.end) {
    if (dayHasLoggedFood(input.dailyLogs[d]) && predicate(d)) count += 1
    d = shiftDate(d, 1)
  }
  return count
}

function thisWeekBurnDays(dailyLogs: Record<string, DailyLog>, today: string): number {
  const week = getWeekRangeForDate(today)
  let count = 0
  let d = week.start
  while (d <= week.end) {
    if ((dailyLogs[d]?.burnedCalories ?? 0) > 0) count += 1
    d = shiftDate(d, 1)
  }
  return count
}

function thisWeekNetDeficit(input: BadgeProgressInput, today: string): number {
  const week = getWeekRangeForDate(today)
  let total = 0
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
    if (row && row.net < 0) total += -row.net
    d = shiftDate(d, 1)
  }
  return total
}

function todayNetDeficit(input: BadgeProgressInput, today: string): number {
  const log = input.dailyLogs[today]
  if (!log || (log.burnedCalories ?? 0) <= 0) return 0
  const row = getStatsDayRowForDate(
    today,
    input.dailyLogs,
    input.foodLibrary,
    input.settings,
  )
  if (!row || row.net >= 0) return 0
  return -row.net
}

function isMealCompleteDay(input: BadgeProgressInput, date: string): boolean {
  const log = input.dailyLogs[date]
  if (!log || !dayHasLoggedFood(log)) return false
  const meals = resolveMealsForLog(log, input.settings)
  if (meals.length === 0) return false
  const covered = new Set<string>()
  for (const entry of log.foods) {
    if (!entry.meal?.trim()) continue
    if (!isConfiguredMeal(entry.meal, meals)) continue
    covered.add(resolveLoggedMeal(entry.meal, meals)!.toLowerCase())
  }
  return meals.every((meal) => covered.has(meal.toLowerCase()))
}

function dayHitsDailyGoal(
  input: BadgeProgressInput,
  date: string,
  kind: string,
): boolean {
  if (!dayHasLoggedFood(input.dailyLogs[date])) return false
  const row = getStatsDayRowForDate(
    date,
    input.dailyLogs,
    input.foodLibrary,
    input.settings,
  )
  if (!row) return false
  switch (kind) {
    case 'protein_day':
      return isProteinOnTarget(row.protein, row.goal.protein)
    case 'calorie_day':
      return isWithinTarget(row.calories, row.goal.calories)
    case 'fiber_day':
      return isWithinTarget(row.fiber, row.goal.fiber)
    case 'carbs_day':
      return isWithinTarget(row.carbs, row.goal.carbs)
    case 'fat_day':
      return isWithinTarget(row.fat, row.goal.fat)
    case 'sugars_day':
      return isWithinTarget(row.sugars, row.goal.sugars)
    case 'balance_day':
      return (
        (row.goal.targetDeficit ?? 0) !== 0 &&
        isEnergyBalanceOnTarget(row.net, row.goal.targetDeficit)
      )
    case 'deficit_day': {
      const target = row.goal.targetDeficit ?? 0
      return target < 0 && isEnergyBalanceOnTarget(row.net, target)
    }
    case 'surplus_day': {
      const target = row.goal.targetDeficit ?? 0
      return target > 0 && isEnergyBalanceOnTarget(row.net, target)
    }
    case 'macro_triple_day':
      return (
        isProteinOnTarget(row.protein, row.goal.protein) &&
        isWithinTarget(row.calories, row.goal.calories) &&
        isWithinTarget(row.fiber, row.goal.fiber)
      )
    case 'macro_quad_day':
      return (
        isProteinOnTarget(row.protein, row.goal.protein) &&
        isWithinTarget(row.calories, row.goal.calories) &&
        isWithinTarget(row.carbs, row.goal.carbs) &&
        isWithinTarget(row.fat, row.goal.fat)
      )
    default:
      return false
  }
}

/**
 * Live progress toward earning (or re-earning) a badge.
 * Shown for both locked and unlocked badges.
 */
export function getBadgeProgressToward(
  badgeId: BadgeId,
  input: BadgeProgressInput,
  asOfDate: string = todayString(),
): BadgeProgressToward {
  const { dailyLogs, foodLibrary, favoriteFoodIds, customCategories } = input
  const logDays = sortedLogDates(dailyLogs)
  const foodCount = foodLibrary.filter((f) => !f.isRecipe).length
  const recipeCount = foodLibrary.filter((f) => f.isRecipe).length
  const totalLogs = totalFoodLogs(dailyLogs)
  const weightDays = datesWithWeight(dailyLogs)
  const burnDays = datesWithBurn(dailyLogs)
  const loggingStreak = computeLoggingStreak(dailyLogs, asOfDate)
  // If today has no log, streak may still count from yesterday for display continuity
  const streakAnchor = dayHasLoggedFood(dailyLogs[asOfDate])
    ? asOfDate
    : shiftDate(asOfDate, -1)
  const effectiveLoggingStreak = dayHasLoggedFood(dailyLogs[asOfDate])
    ? loggingStreak
    : computeLoggingStreak(dailyLogs, streakAnchor)

  switch (badgeId) {
    // —— One-time binary ——
    case 'first_food':
      return countProgress(logDays.length > 0 ? 1 : 0, 1, 'foods logged')
    case 'first_recipe':
      return countProgress(recipeCount > 0 ? 1 : 0, 1, 'recipes created')
    case 'recipe_logged': {
      const recipeIds = new Set(foodLibrary.filter((f) => f.isRecipe).map((f) => f.id))
      const hasLog = Object.values(dailyLogs).some((log) =>
        log.foods.some((e) => recipeIds.has(e.foodId)),
      )
      return countProgress(hasLog ? 1 : 0, 1, 'recipes logged')
    }
    case 'note_writer': {
      const has = Object.values(dailyLogs).some((l) => l.note.trim().length > 0)
      return countProgress(has ? 1 : 0, 1, 'notes written')
    }
    case 'note_long': {
      const has = Object.values(dailyLogs).some((l) => l.note.trim().length >= 100)
      const best = Math.max(
        0,
        ...Object.values(dailyLogs).map((l) => l.note.trim().length),
      )
      if (has) return countProgress(1, 1, 'long notes written')
      return makeProgress(best, 100, `Longest note: ${formatCount(best)} / 100 characters`)
    }
    case 'first_uncategorized': {
      let found = false
      for (const date of Object.keys(dailyLogs).sort()) {
        const log = dailyLogs[date]
        const meals = resolveMealsForLog(log, input.settings)
        if (
          log.foods.some(
            (entry) => !entry.meal?.trim() || !isConfiguredMeal(entry.meal, meals),
          )
        ) {
          found = true
          break
        }
      }
      return countProgress(found ? 1 : 0, 1, 'uncategorized logs')
    }
    case 'first_weight':
      return countProgress(weightDays.length > 0 ? 1 : 0, 1, 'weight entries')
    case 'burn_tracker':
      return countProgress(burnDays.length > 0 ? 1 : 0, 1, 'burn entries')
    case 'first_favorite':
      return countProgress(favoriteFoodIds.length > 0 ? 1 : 0, 1, 'favorites')
    case 'custom_recipe': {
      const has = Object.values(dailyLogs).some((log) =>
        log.foods.some((e) => e.overriddenComponents),
      )
      return countProgress(has ? 1 : 0, 1, 'customized recipes')
    }

    // —— Library / count thresholds ——
    case 'library_five':
      return countProgress(foodCount, 5, 'foods in library')
    case 'library_ten':
      return countProgress(foodCount, 10, 'foods in library')
    case 'library_twentyfive':
      return countProgress(foodCount, 25, 'foods in library')
    case 'library_fifty':
      return countProgress(foodCount, 50, 'foods in library')
    case 'library_hundred':
      return countProgress(foodCount, 100, 'foods in library')
    case 'recipes_five':
      return countProgress(recipeCount, 5, 'recipes created')
    case 'recipes_ten':
      return countProgress(recipeCount, 10, 'recipes created')
    case 'five_favorites':
      return countProgress(favoriteFoodIds.length, 5, 'favorites')
    case 'ten_favorites':
      return countProgress(favoriteFoodIds.length, 10, 'favorites')
    case 'categories_five': {
      const cats = collectAllCategories(foodLibrary, customCategories)
      return countProgress(cats.length, 5, 'categories')
    }
    case 'category_tagger': {
      const tagged = foodLibrary.filter(
        (f) => !f.isRecipe && foodCategories(f).length > 0,
      ).length
      return countProgress(tagged, 10, 'categorized foods')
    }
    case 'weight_logs_10':
      return countProgress(weightDays.length, 10, 'days weight logged')
    case 'weight_logs_50':
      return countProgress(weightDays.length, 50, 'days weight logged')
    case 'burn_month_days':
      return countProgress(burnDays.length, 20, 'days burned calories logged')
    case 'burn_logs_50':
      return countProgress(burnDays.length, 50, 'days burned calories logged')
    case 'burn_month_calendar': {
      // Best month burn-day count toward 20
      const byMonth = new Map<string, number>()
      for (const date of burnDays) {
        const key = date.slice(0, 7)
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
      }
      const best = Math.max(0, ...byMonth.values(), 0)
      return countProgress(best, 20, 'burn days in best month')
    }
    case 'logs_50':
      return countProgress(totalLogs, 50, 'food entries logged')
    case 'logs_250':
      return countProgress(totalLogs, 250, 'food entries logged')
    case 'logs_500':
      return countProgress(totalLogs, 500, 'food entries logged')
    case 'logs_1000':
      return countProgress(totalLogs, 1000, 'food entries logged')
    case 'logs_2000':
      return countProgress(totalLogs, 2000, 'food entries logged')
    case 'logs_5000':
      return countProgress(totalLogs, 5000, 'food entries logged')
    case 'days_logged_10':
      return countProgress(logDays.length, 10, 'days logged so far')
    case 'days_logged_50':
      return countProgress(logDays.length, 50, 'days logged so far')
    case 'days_logged_100':
      return countProgress(logDays.length, 100, 'days logged so far')
    case 'days_logged_200':
      return countProgress(logDays.length, 200, 'days logged so far')
    case 'days_logged_365':
      return countProgress(logDays.length, 365, 'days logged so far')
    case 'days_logged_500':
      return countProgress(logDays.length, 500, 'days logged so far')

    // —— Logging streaks ——
    case 'streak_3':
      return streakProgress(effectiveLoggingStreak, 3)
    case 'streak_7':
      return streakProgress(effectiveLoggingStreak, 7)
    case 'streak_14':
      return streakProgress(effectiveLoggingStreak, 14)
    case 'streak_21':
      return streakProgress(effectiveLoggingStreak, 21)
    case 'streak_30':
      return streakProgress(effectiveLoggingStreak, 30)
    case 'streak_45':
      return streakProgress(effectiveLoggingStreak, 45)
    case 'streak_60':
      return streakProgress(effectiveLoggingStreak, 60)
    case 'streak_90':
      return streakProgress(effectiveLoggingStreak, 90)
    case 'streak_100':
      return streakProgress(effectiveLoggingStreak, 100)
    case 'streak_200':
      return streakProgress(effectiveLoggingStreak, 200)
    case 'streak_365':
      return streakProgress(effectiveLoggingStreak, 365)

    // —— Weight / burn streaks ——
    case 'weight_streak_7':
      return streakProgress(
        computeWeightStreak(dailyLogs, asOfDate) ||
          computeWeightStreak(dailyLogs, shiftDate(asOfDate, -1)),
        7,
      )
    case 'weight_streak_14':
      return streakProgress(
        computeWeightStreak(dailyLogs, asOfDate) ||
          computeWeightStreak(dailyLogs, shiftDate(asOfDate, -1)),
        14,
      )
    case 'weight_streak_30':
      return streakProgress(
        computeWeightStreak(dailyLogs, asOfDate) ||
          computeWeightStreak(dailyLogs, shiftDate(asOfDate, -1)),
        30,
      )
    case 'weight_streak_60':
      return streakProgress(
        computeWeightStreak(dailyLogs, asOfDate) ||
          computeWeightStreak(dailyLogs, shiftDate(asOfDate, -1)),
        60,
      )
    case 'weight_streak_90':
      return streakProgress(
        computeWeightStreak(dailyLogs, asOfDate) ||
          computeWeightStreak(dailyLogs, shiftDate(asOfDate, -1)),
        90,
      )
    case 'burn_streak_7':
      return streakProgress(
        computeBurnStreak(dailyLogs, asOfDate) ||
          computeBurnStreak(dailyLogs, shiftDate(asOfDate, -1)),
        7,
      )
    case 'burn_streak_14':
      return streakProgress(
        computeBurnStreak(dailyLogs, asOfDate) ||
          computeBurnStreak(dailyLogs, shiftDate(asOfDate, -1)),
        14,
      )
    case 'burn_streak_30':
      return streakProgress(
        computeBurnStreak(dailyLogs, asOfDate) ||
          computeBurnStreak(dailyLogs, shiftDate(asOfDate, -1)),
        30,
      )
    case 'note_streak_3':
      return streakProgress(
        computeNoteStreak(dailyLogs, asOfDate) ||
          computeNoteStreak(dailyLogs, shiftDate(asOfDate, -1)),
        3,
      )
    case 'note_streak_7':
      return streakProgress(
        computeNoteStreak(dailyLogs, asOfDate) ||
          computeNoteStreak(dailyLogs, shiftDate(asOfDate, -1)),
        7,
      )
    case 'note_streak_14':
      return streakProgress(
        computeNoteStreak(dailyLogs, asOfDate) ||
          computeNoteStreak(dailyLogs, shiftDate(asOfDate, -1)),
        14,
      )
    case 'breakfast_streak_7':
      return streakProgress(computeMealStreak(input, 0, asOfDate), 7)
    case 'lunch_streak_7':
      return streakProgress(computeMealStreak(input, 1, asOfDate), 7)
    case 'dinner_streak_7':
      return streakProgress(computeMealStreak(input, 2, asOfDate), 7)

    // —— Macro goal streaks ——
    case 'protein_streak_7':
      return streakProgress(computeGoalStreak(input, 'protein', asOfDate), 7)
    case 'calorie_streak_7':
      return streakProgress(computeGoalStreak(input, 'calorie', asOfDate), 7)
    case 'fiber_streak_7':
      return streakProgress(computeGoalStreak(input, 'fiber', asOfDate), 7)
    case 'deficit_streak_3':
      return streakProgress(computeGoalStreak(input, 'deficit', asOfDate), 3)
    case 'deficit_streak_7':
      return streakProgress(computeGoalStreak(input, 'deficit', asOfDate), 7)

    // —— Daily macro goals (today) ——
    case 'protein_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'protein_day'), 'protein goal')
    case 'calorie_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'calorie_day'), 'calorie goal')
    case 'balance_day':
      return todayHitProgress(
        dayHitsDailyGoal(input, asOfDate, 'balance_day'),
        'energy balance goal',
      )
    case 'fiber_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'fiber_day'), 'fiber goal')
    case 'carbs_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'carbs_day'), 'carbs goal')
    case 'fat_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'fat_day'), 'fat goal')
    case 'sugars_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'sugars_day'), 'sugars goal')
    case 'deficit_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'deficit_day'), 'deficit goal')
    case 'surplus_day':
      return todayHitProgress(dayHitsDailyGoal(input, asOfDate, 'surplus_day'), 'surplus goal')
    case 'macro_triple_day':
      return todayHitProgress(
        dayHitsDailyGoal(input, asOfDate, 'macro_triple_day'),
        'protein + calories + fiber',
      )
    case 'macro_quad_day':
      return todayHitProgress(
        dayHitsDailyGoal(input, asOfDate, 'macro_quad_day'),
        'protein + cal + carbs + fat',
      )
    case 'meal_complete':
      return todayHitProgress(isMealCompleteDay(input, asOfDate), 'all meals logged')
    case 'big_day_10': {
      const n = dailyLogs[asOfDate]?.foods.length ?? 0
      return makeProgress(n, 10, `Today: ${formatCount(Math.min(n, 10))} / 10 entries`)
    }
    case 'big_day_15': {
      const n = dailyLogs[asOfDate]?.foods.length ?? 0
      return makeProgress(n, 15, `Today: ${formatCount(Math.min(n, 15))} / 15 entries`)
    }

    // —— Weekly badges ——
    case 'protein_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) =>
          dayHitsDailyGoal(input, d, 'protein_day'),
        ),
        5,
        'Protein hits',
      )
    case 'calorie_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) =>
          dayHitsDailyGoal(input, d, 'calorie_day'),
        ),
        5,
        'Calorie hits',
      )
    case 'balance_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) =>
          dayHitsDailyGoal(input, d, 'balance_day'),
        ),
        5,
        'Balance hits',
      )
    case 'fiber_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) =>
          dayHitsDailyGoal(input, d, 'fiber_day'),
        ),
        5,
        'Fiber hits',
      )
    case 'carbs_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) =>
          dayHitsDailyGoal(input, d, 'carbs_day'),
        ),
        5,
        'Carb hits',
      )
    case 'fat_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) => dayHitsDailyGoal(input, d, 'fat_day')),
        5,
        'Fat hits',
      )
    case 'sugars_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) =>
          dayHitsDailyGoal(input, d, 'sugars_day'),
        ),
        5,
        'Sugars hits',
      )
    case 'burn_week':
      return weeklyDaysProgress(thisWeekBurnDays(dailyLogs, asOfDate), 5, 'Burn days')
    case 'meal_complete_week':
      return weeklyDaysProgress(
        thisWeekGoalHitDays(input, asOfDate, (d) => isMealCompleteDay(input, d)),
        5,
        'Full-plate days',
      )
    case 'full_week_logger':
      return weeklyDaysProgress(thisWeekLoggedDays(dailyLogs, asOfDate), 7, 'Days logged')
    case 'weekday_warrior': {
      const week = getWeekRangeForDate(asOfDate)
      let hit = 0
      let d = week.start
      while (d <= week.end) {
        const wd = new Date(d + 'T12:00:00').getDay()
        if (wd >= 1 && wd <= 5 && dayHasLoggedFood(dailyLogs[d])) hit += 1
        d = shiftDate(d, 1)
      }
      return weeklyDaysProgress(hit, 5, 'Weekdays logged')
    }
    case 'weekend_logger': {
      const week = getWeekRangeForDate(asOfDate)
      let hit = 0
      let d = week.start
      while (d <= week.end) {
        const wd = new Date(d + 'T12:00:00').getDay()
        if ((wd === 0 || wd === 6) && dayHasLoggedFood(dailyLogs[d])) hit += 1
        d = shiftDate(d, 1)
      }
      return makeProgress(hit, 2, `Weekend days logged: ${hit} / 2`)
    }

    // —— Volume / recurring cycles ——
    case 'logs_100':
      return recurringCycleProgress(totalLogs, 100, 'food entries toward next 100')
    case 'recipe_logs_10':
      return recurringCycleProgress(
        recipeLogCount(dailyLogs, foodLibrary),
        10,
        'recipe logs toward next 10',
      )
    case 'recipe_logs_50':
      return recurringCycleProgress(
        recipeLogCount(dailyLogs, foodLibrary),
        50,
        'recipe logs toward next 50',
      )

    // —— Net deficit ——
    case 'net_deficit_500_day': {
      const deficit = todayNetDeficit(input, asOfDate)
      return makeProgress(
        deficit,
        500,
        `Today's net deficit: ${formatCount(Math.min(deficit, 500))} / 500 cal`,
      )
    }
    case 'net_deficit_1000_day': {
      const deficit = todayNetDeficit(input, asOfDate)
      return makeProgress(
        deficit,
        1000,
        `Today's net deficit: ${formatCount(Math.min(deficit, 1000))} / 1,000 cal`,
      )
    }
    case 'net_deficit_week_5000': {
      const deficit = thisWeekNetDeficit(input, asOfDate)
      return makeProgress(
        deficit,
        5000,
        `Progress: ${formatCount(Math.min(deficit, 5000))} / 5,000 cal deficit this week`,
      )
    }

    default:
      return makeProgress(0, 1, 'Keep logging to earn this badge')
  }
}
