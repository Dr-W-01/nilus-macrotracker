import { format, parseISO } from 'date-fns'
import { getWeekRangeForDate, shiftDate } from '@/lib/dates'
import { isConfiguredMeal, normalizeMeals, resolveLoggedMeal } from '@/lib/meals'
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

function evaluateWeeklyBadges(
  input: BadgeScanInput,
  kind: 'protein_week' | 'calorie_week' | 'balance_week',
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

    const allHit = rows.every((row) => {
      if (kind === 'protein_week') {
        return isProteinOnTarget(row.protein, row.goal.protein)
      }
      if (kind === 'calorie_week') {
        return isWithinTarget(row.calories, row.goal.calories)
      }
      if ((row.goal.targetDeficit ?? 0) === 0) return false
      return isEnergyBalanceOnTarget(row.net, row.goal.targetDeficit)
    })

    if (!allHit) continue
    if (kind === 'balance_week' && rows.every((r) => (r.goal.targetDeficit ?? 0) === 0)) {
      continue
    }

    instances.push({ earnedAt: week.end, periodKey: `${kind}-${week.start}` })
  }

  return instances
}

function evaluateDailyGoalBadges(
  input: BadgeScanInput,
  kind: 'protein_day' | 'calorie_day' | 'balance_day' | 'fiber_day',
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
    } else if ((row.goal.targetDeficit ?? 0) !== 0) {
      hit = isEnergyBalanceOnTarget(row.net, row.goal.targetDeficit)
    }

    if (hit) {
      instances.push({ earnedAt: date, periodKey: `${kind}-${date}` })
    }
  }

  return instances
}

function evaluateMealCompleteDays(input: BadgeScanInput): BadgeEarnedInstance[] {
  const meals = normalizeMeals(input.settings.meals)
  if (meals.length === 0) return []

  const instances: BadgeEarnedInstance[] = []
  for (const [date, log] of Object.entries(input.dailyLogs)) {
    if (!dayHasLoggedFood(log)) continue
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
    10: 'library_ten',
    25: 'library_twentyfive',
    50: 'library_fifty',
  }

  for (const threshold of thresholds) {
    const id = map[threshold]
    if (id && count >= threshold) {
      awards[id] = [{ earnedAt: fallbackDate, periodKey: 'once' }]
    }
  }

  return awards
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

function evaluateMealStreak(
  dailyLogs: Record<string, DailyLog>,
  meals: string[],
  targetMeal: string,
  milestone: number,
): BadgeEarnedInstance[] {
  const mealLower = targetMeal.toLowerCase()
  const instances: BadgeEarnedInstance[] = []

  const hasMeal = (date: string) => {
    const log = dailyLogs[date]
    if (!log || !dayHasLoggedFood(log)) return false
    return log.foods.some((entry) => {
      if (!entry.meal?.trim()) return false
      if (!isConfiguredMeal(entry.meal, meals)) return false
      return resolveLoggedMeal(entry.meal, meals)!.toLowerCase() === mealLower
    })
  }

  for (const date of sortedLogDates(dailyLogs)) {
    if (!hasMeal(date)) continue
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

function countRecipeLogs(
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
  const { dailyLogs, foodLibrary, favoriteFoodIds } = input
  const awards: BadgeAwardMap = {}

  const firstFoodDate = sortedLogDates(dailyLogs)[0]
  const fallbackDate = firstFoodDate ?? foodLibrary[0]?.lastUsed ?? '1970-01-01'

  if (firstFoodDate) {
    awards.first_food = [{ earnedAt: firstFoodDate, periodKey: 'once' }]
  }

  Object.assign(
    awards,
    evaluateLibraryThresholds(foodLibrary, [10, 25, 50], fallbackDate),
  )

  const firstRecipe = foodLibrary
    .filter((f) => f.isRecipe)
    .sort((a, b) => a.lastUsed.localeCompare(b.lastUsed))[0]
  if (firstRecipe) {
    awards.first_recipe = [{ earnedAt: firstRecipe.lastUsed, periodKey: 'once' }]
  }

  if (favoriteFoodIds.length > 0) {
    awards.first_favorite = [{ earnedAt: fallbackDate, periodKey: 'once' }]
  }

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

  if (countRecipeLogs(dailyLogs, foodLibrary) > 0) {
    awards.recipe_logs_10 = evaluateRecipeLogThresholds(dailyLogs, foodLibrary, 10)
  }

  awards.streak_3 = evaluateStreakMilestones(dailyLogs, 3, 'streak-3')
  awards.streak_7 = evaluateStreakMilestones(dailyLogs, 7, 'streak-7')
  awards.streak_14 = evaluateStreakMilestones(dailyLogs, 14, 'streak-14')
  awards.streak_30 = evaluateStreakMilestones(dailyLogs, 30, 'streak-30')
  awards.streak_60 = evaluateStreakMilestones(dailyLogs, 60, 'streak-60')
  awards.streak_100 = evaluateStreakMilestones(dailyLogs, 100, 'streak-100')

  awards.protein_day = evaluateDailyGoalBadges(input, 'protein_day')
  awards.calorie_day = evaluateDailyGoalBadges(input, 'calorie_day')
  awards.balance_day = evaluateDailyGoalBadges(input, 'balance_day')
  awards.fiber_day = evaluateDailyGoalBadges(input, 'fiber_day')

  awards.protein_week = evaluateWeeklyBadges(input, 'protein_week')
  awards.calorie_week = evaluateWeeklyBadges(input, 'calorie_week')
  awards.balance_week = evaluateWeeklyBadges(input, 'balance_week')

  awards.meal_complete = evaluateMealCompleteDays(input)
  awards.big_day_10 = evaluateBigDays(dailyLogs, 10)
  awards.weekend_logger = evaluateWeekendLogger(dailyLogs)
  awards.burn_week = evaluateBurnWeeks(dailyLogs)

  const meals = normalizeMeals(input.settings.meals)
  const breakfast = meals[0]
  if (breakfast) {
    awards.breakfast_streak_7 = evaluateMealStreak(dailyLogs, meals, breakfast, 7)
  }

  const firstNoteDate = Object.keys(dailyLogs)
    .filter((date) => dailyLogs[date].note.trim().length > 0)
    .sort()[0]
  if (firstNoteDate) {
    awards.note_writer = [{ earnedAt: firstNoteDate, periodKey: 'once' }]
  }
  awards.note_streak_3 = evaluateNoteStreak(dailyLogs, 3)

  const firstBurnDate = Object.keys(dailyLogs)
    .filter((date) => dailyLogs[date].burnedCalories > 0)
    .sort()[0]
  if (firstBurnDate) {
    awards.burn_tracker = [{ earnedAt: firstBurnDate, periodKey: 'once' }]
  }

  const firstWeightDate = datesWithWeight(dailyLogs)[0]
  if (firstWeightDate) {
    awards.first_weight = [{ earnedAt: firstWeightDate, periodKey: 'once' }]
  }

  awards.weight_streak_7 = evaluateWeightStreakMilestones(dailyLogs, 7)
  awards.weight_streak_30 = evaluateWeightStreakMilestones(dailyLogs, 30)

  awards.logs_50 = evaluateCumulativeLogThresholds(dailyLogs, [50], 'logs')
  awards.logs_100 = evaluateCumulativeLogThresholds(dailyLogs, [], 'logs', 100)
  awards.logs_500 = evaluateCumulativeLogThresholds(dailyLogs, [500], 'logs')
  awards.logs_1000 = evaluateCumulativeLogThresholds(dailyLogs, [1000], 'logs')

  awards.days_logged_10 = evaluateDistinctDayThresholds(dailyLogs, [10])
  awards.days_logged_50 = evaluateDistinctDayThresholds(dailyLogs, [50])
  awards.days_logged_100 = evaluateDistinctDayThresholds(dailyLogs, [100])

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
  const existing = new Set(badgeState.unviewedBadgeIds ?? [])
  for (const id of badgeIds) existing.add(id)
  return { ...badgeState, unviewedBadgeIds: [...existing] }
}

export function createEmptyBadgeState(): BadgeState {
  return { initialized: false, progress: {}, unviewedBadgeIds: [] }
}

export function formatBadgeEarnedDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'MMM d, yyyy')
}