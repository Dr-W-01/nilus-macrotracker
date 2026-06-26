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
  const dates = sortedLogDates(dailyLogs)
  for (const date of dates) {
    const streak = computeLoggingStreak(dailyLogs, date)
    const prevStreak = computeLoggingStreak(dailyLogs, shiftDate(date, -1))
    if (streak >= milestone && prevStreak < milestone) {
      instances.push({
        earnedAt: date,
        periodKey: `${prefix}-${date}`,
      })
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

    instances.push({
      earnedAt: week.end,
      periodKey: `${kind}-${week.start}`,
    })
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
    const allCovered = meals.every((meal) =>
      covered.has(meal.toLowerCase()),
    )
    if (allCovered) {
      instances.push({
        earnedAt: date,
        periodKey: `meal-complete-${date}`,
      })
    }
  }
  return instances
}

function evaluateLogs100(dailyLogs: Record<string, DailyLog>): BadgeEarnedInstance[] {
  const instances: BadgeEarnedInstance[] = []
  const awarded = new Set<number>()
  let cumulative = 0

  for (const date of Object.keys(dailyLogs).sort()) {
    cumulative += dailyLogs[date].foods.length
    for (let threshold = 100; threshold <= cumulative; threshold += 100) {
      if (awarded.has(threshold)) continue
      awarded.add(threshold)
      instances.push({
        earnedAt: date,
        periodKey: `logs-${threshold}`,
      })
    }
  }
  return instances
}

/** Scan all historical data and return every badge instance the user qualifies for. */
export function scanAllBadgeInstances(input: BadgeScanInput): BadgeAwardMap {
  const { dailyLogs, foodLibrary } = input
  const awards: BadgeAwardMap = {}

  const firstFoodDate = sortedLogDates(dailyLogs)[0]
  if (firstFoodDate) {
    awards.first_food = [{ earnedAt: firstFoodDate, periodKey: 'once' }]
  }

  const libraryFoodCount = foodLibrary.filter((f) => !f.isRecipe).length
  if (libraryFoodCount >= 10) {
    awards.library_ten = [
      {
        earnedAt: firstFoodDate ?? foodLibrary[0]?.lastUsed ?? '1970-01-01',
        periodKey: 'once',
      },
    ]
  }

  const firstRecipe = foodLibrary
    .filter((f) => f.isRecipe)
    .sort((a, b) => a.lastUsed.localeCompare(b.lastUsed))[0]
  if (firstRecipe) {
    awards.first_recipe = [{ earnedAt: firstRecipe.lastUsed, periodKey: 'once' }]
  }

  awards.streak_7 = evaluateStreakMilestones(dailyLogs, 7, 'streak-7')
  awards.streak_30 = evaluateStreakMilestones(dailyLogs, 30, 'streak-30')

  awards.protein_week = evaluateWeeklyBadges(input, 'protein_week')
  awards.calorie_week = evaluateWeeklyBadges(input, 'calorie_week')
  awards.balance_week = evaluateWeeklyBadges(input, 'balance_week')

  awards.meal_complete = evaluateMealCompleteDays(input)

  const firstNoteDate = Object.keys(dailyLogs)
    .filter((date) => dailyLogs[date].note.trim().length > 0)
    .sort()[0]
  if (firstNoteDate) {
    awards.note_writer = [{ earnedAt: firstNoteDate, periodKey: 'once' }]
  }

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
  awards.logs_100 = evaluateLogs100(dailyLogs)

  return awards
}

export function applyBadgeAwards(
  badgeState: BadgeState,
  awards: BadgeAwardMap,
): {
  nextState: BadgeState
  newAwards: Partial<Record<BadgeId, BadgeEarnedInstance[]>>
} {
  const nextProgress = { ...badgeState.progress }
  const newAwards: Partial<Record<BadgeId, BadgeEarnedInstance[]>> = {}

  for (const badgeId of ALL_BADGE_IDS) {
    const found = awards[badgeId] ?? []
    if (found.length === 0) continue

    const existing = nextProgress[badgeId]?.instances ?? []
    const { merged, added } = mergeBadgeInstances(existing, found)
    if (added.length === 0) continue

    nextProgress[badgeId] = { instances: merged }
    newAwards[badgeId] = added
  }

  return {
    nextState: { ...badgeState, progress: nextProgress },
    newAwards,
  }
}

export function createEmptyBadgeState(): BadgeState {
  return { initialized: false, progress: {} }
}

export function formatBadgeEarnedDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'MMM d, yyyy')
}