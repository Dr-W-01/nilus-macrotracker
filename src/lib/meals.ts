export const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const
export const UNCATEGORIZED_MEAL = 'Other'

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

export function normalizeMealName(meal: string | undefined, meals: string[]): string {
  if (!meal?.trim()) return meals[0] ?? DEFAULT_MEALS[0]
  const key = meal.trim().toLowerCase()
  const found = meals.find((m) => m.toLowerCase() === key)
  return found ?? meal.trim()
}

export function mealSortIndex(meal: string, meals: string[]): number {
  const key = meal.toLowerCase()
  const idx = meals.findIndex((m) => m.toLowerCase() === key)
  if (idx >= 0) return idx
  if (key === UNCATEGORIZED_MEAL.toLowerCase()) return meals.length
  return meals.length + 1
}