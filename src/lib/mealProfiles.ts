import type { DailyLog, MealProfile, Settings } from '@/lib/types'
import { normalizeMealName, normalizeMeals } from '@/lib/meals'

/** Frozen meal profile captured when a day is first logged or when its profile is changed. */
export type MealSnapshot = MealProfile

export function snapshotMealProfile(profile: MealProfile): MealSnapshot {
  return {
    id: profile.id,
    name: profile.name,
    meals: [...profile.meals],
    defaultMeal: profile.defaultMeal,
  }
}

export function resolveDefaultMealProfile(settings: Settings): MealProfile {
  return (
    settings.mealProfiles.find((p) => p.id === settings.defaultMealProfileId) ??
    settings.mealProfiles[0]
  )
}

export function findMealProfileById(
  settings: Settings,
  profileId: string,
): MealProfile | undefined {
  return settings.mealProfiles.find((p) => p.id === profileId)
}

/** Meal profile used for a day — prefers the frozen snapshot over live profiles. */
export function resolveMealProfileForLog(log: DailyLog, settings: Settings): MealProfile {
  if (log.mealSnapshot) return log.mealSnapshot
  const defaultProfile = resolveDefaultMealProfile(settings)
  return findMealProfileById(settings, log.mealProfileId) ?? defaultProfile
}

export function resolveMealsForLog(log: DailyLog, settings: Settings): string[] {
  return normalizeMeals(resolveMealProfileForLog(log, settings).meals)
}

export function resolveDefaultMealForLog(log: DailyLog, settings: Settings): string {
  const profile = resolveMealProfileForLog(log, settings)
  return normalizeMealName(profile.defaultMeal, profile.meals)
}

export function ensureMealSnapshot(log: DailyLog, settings: Settings): DailyLog {
  if (log.mealSnapshot) return log
  const profile = resolveMealProfileForLog(log, settings)
  return { ...log, mealSnapshot: snapshotMealProfile(profile) }
}

export function snapshotLogsMealProfiles(
  dailyLogs: Record<string, DailyLog>,
  settings: Settings,
): Record<string, DailyLog> {
  const defaultId = settings.defaultMealProfileId
  const next: Record<string, DailyLog> = {}
  for (const [date, log] of Object.entries(dailyLogs)) {
    const withProfileId: DailyLog = {
      ...log,
      mealProfileId: log.mealProfileId ?? defaultId,
    }
    next[date] =
      withProfileId.foods.length > 0 || withProfileId.mealSnapshot
        ? ensureMealSnapshot(withProfileId, settings)
        : withProfileId
  }
  return next
}

/** Count daily logs that reference a meal profile (blocks deletion when in use). */
export function countDaysUsingMealProfile(
  dailyLogs: Record<string, DailyLog>,
  profileId: string,
): number {
  return Object.values(dailyLogs).filter((log) => log.mealProfileId === profileId).length
}

export function createStandardMealProfile(
  meals?: string[],
  defaultMeal?: string,
): MealProfile {
  const normalizedMeals = normalizeMeals(meals)
  return {
    id: 'standard',
    name: 'Standard',
    meals: normalizedMeals,
    defaultMeal: normalizeMealName(defaultMeal, normalizedMeals),
  }
}

export function ensureMealProfilesInSettings(
  settings: Partial<Settings> & { meals?: string[]; defaultMeal?: string },
): Pick<Settings, 'mealProfiles' | 'defaultMealProfileId'> {
  if (settings.mealProfiles?.length) {
    const mealProfiles = settings.mealProfiles.map((p) => {
      const meals = normalizeMeals(p.meals)
      return {
        ...p,
        meals,
        defaultMeal: normalizeMealName(p.defaultMeal, meals),
      }
    })
    const defaultMealProfileId =
      mealProfiles.some((p) => p.id === settings.defaultMealProfileId)
        ? settings.defaultMealProfileId!
        : mealProfiles[0].id
    return { mealProfiles, defaultMealProfileId }
  }

  const standard = createStandardMealProfile(settings.meals, settings.defaultMeal)
  return {
    mealProfiles: [standard],
    defaultMealProfileId: standard.id,
  }
}