import type { FoodItem } from './types'

export function normalizeCategoryName(name: string): string {
  return name.trim()
}

export function normalizeCategoryList(categories: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of categories) {
    const tag = normalizeCategoryName(raw)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

export function foodCategories(food: Pick<FoodItem, 'categories'>): string[] {
  return Array.isArray(food.categories) ? food.categories : []
}

export function collectAllCategories(
  library: FoodItem[],
  customCategories: string[] = [],
): string[] {
  const safeCustom = Array.isArray(customCategories) ? customCategories : []
  const fromItems = library.flatMap((f) => foodCategories(f))
  return normalizeCategoryList([...safeCustom, ...fromItems]).sort((a, b) =>
    a.localeCompare(b),
  )
}

export function itemHasCategory(food: FoodItem, category: string): boolean {
  const key = category.toLowerCase()
  return foodCategories(food).some((c) => c.toLowerCase() === key)
}

export function itemsInCategory(
  library: FoodItem[],
  category: string,
  includeRecipes = false,
): FoodItem[] {
  return library
    .filter((f) => (includeRecipes ? true : !f.isRecipe))
    .filter((f) => itemHasCategory(f, category))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function addCategoryToItem(
  categories: string[] | undefined,
  category: string,
): string[] {
  const base = foodCategories({ categories: categories ?? [] })
  const tag = normalizeCategoryName(category)
  if (!tag) return normalizeCategoryList(base)
  if (itemHasCategory({ categories: base } as FoodItem, tag)) {
    return normalizeCategoryList(base)
  }
  return normalizeCategoryList([...base, tag])
}

export function removeCategoryFromItem(
  categories: string[] | undefined,
  category: string,
): string[] {
  const key = category.toLowerCase()
  return normalizeCategoryList(
    foodCategories({ categories: categories ?? [] }).filter(
      (c) => c.toLowerCase() !== key,
    ),
  )
}

export function parseImportedCategories(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return normalizeCategoryList(
    raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean),
  )
}