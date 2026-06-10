import type { DailyLog } from '@/lib/types'

export const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const

export function normalizeMeals(meals?: string[]): string[] {
  const list = (meals ?? []).map((m) => m.trim()).filter(Boolean)
  if (list.length === 0) return [...DEFAULT_MEALS]

  const seen = new Set<string>()
  const out: string[] = []
  for (const m of list) {
    const key = m.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(m)
    }
  }
  return out
}

export function remapMealReferences<T extends { meal?: string }>(
  entries: T[],
  renameMap: Map<string, string>,
  removedKeys: Set<string>,
): T[] {
  return entries.map((entry) => {
    if (!entry.meal?.trim()) return entry
    const key = entry.meal.trim().toLowerCase()
    if (removedKeys.has(key)) return { ...entry, meal: undefined }
    const renamed = renameMap.get(key)
    if (renamed) return { ...entry, meal: renamed }
    return entry
  })
}

export function remapCollapsedMeals(
  collapsed: string[],
  renameMap: Map<string, string>,
  removedKeys: Set<string>,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const meal of collapsed) {
    const key = meal.toLowerCase()
    if (removedKeys.has(key)) continue
    const next = renameMap.get(key) ?? meal
    const nextKey = next.toLowerCase()
    if (seen.has(nextKey)) continue
    seen.add(nextKey)
    out.push(next)
  }
  return out
}

export function isConfiguredMeal(meal: string | undefined, meals: string[]): boolean {
  if (!meal?.trim()) return false
  const key = meal.trim().toLowerCase()
  return meals.some((m) => m.toLowerCase() === key)
}

/** Resolve a user-chosen meal name to a configured meal, or undefined if empty. */
export function resolveLoggedMeal(
  meal: string | undefined,
  meals: string[],
): string | undefined {
  if (!meal?.trim()) return undefined
  const key = meal.trim().toLowerCase()
  const found = meals.find((m) => m.toLowerCase() === key)
  return found ?? meal.trim()
}

/** @deprecated Use resolveLoggedMeal; kept for settings default meal resolution */
export function normalizeMealName(meal: string | undefined, meals: string[]): string {
  return resolveLoggedMeal(meal, meals) ?? meals[0] ?? DEFAULT_MEALS[0]
}

/** Clear meal assignments that no longer match configured meals (e.g. after category deletion). */
export function sanitizeOrphanedMealAssignments(
  dailyLogs: Record<string, DailyLog>,
  meals: string[],
): Record<string, DailyLog> {
  const configured = new Set(meals.map((m) => m.toLowerCase()))
  let changed = false

  const next = Object.fromEntries(
    Object.entries(dailyLogs).map(([date, log]) => {
      const foods = log.foods.map((entry) => {
        if (!entry.meal?.trim()) return entry
        const key = entry.meal.trim().toLowerCase()
        if (configured.has(key)) return entry
        changed = true
        return { ...entry, meal: undefined }
      })
      return [date, foods === log.foods ? log : { ...log, foods }]
    }),
  )

  return changed ? next : dailyLogs
}

export function mealSortIndex(meal: string, meals: string[]): number {
  const key = meal.toLowerCase()
  const idx = meals.findIndex((m) => m.toLowerCase() === key)
  if (idx >= 0) return idx
  return meals.length + 1
}