export const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const

export function normalizeMeals(meals?: string[]): string[] {
  const list = (meals ?? []).map((m) => m.trim()).filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of [...DEFAULT_MEALS, ...list]) {
    const key = m.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(m)
    }
  }
  return out
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

export function mealSortIndex(meal: string, meals: string[]): number {
  const key = meal.toLowerCase()
  const idx = meals.findIndex((m) => m.toLowerCase() === key)
  if (idx >= 0) return idx
  return meals.length + 1
}