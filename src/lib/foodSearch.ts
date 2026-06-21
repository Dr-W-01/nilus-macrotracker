import { foodCategories, itemHasCategory } from '@/lib/categories'
import type { FoodItem } from '@/lib/types'

const RECENT_SEARCH_MAX = 5

export type FoodSearchScope = 'library' | 'picker'

export interface ParsedFoodQuery {
  text: string
  categoryFilter?: string
}

/** Parse `category:protein`, `#protein`, or `@protein` prefix filters. */
export function parseFoodSearchQuery(raw: string): ParsedFoodQuery {
  const trimmed = raw.trim()
  if (!trimmed) return { text: '' }

  const prefixed = trimmed.match(/^(?:category:|#|@)(\S+)(?:\s+(.*))?$/i)
  if (prefixed) {
    return {
      categoryFilter: prefixed[1],
      text: (prefixed[2] ?? '').trim(),
    }
  }

  return { text: trimmed }
}

/** Lightweight fuzzy score — higher is better; 0 means no match. */
export function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return 1
  if (!t) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 92
  if (t.includes(q)) return 75

  let ti = 0
  let score = 0
  let consecutive = 0
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return 0
    consecutive = found === ti ? consecutive + 1 : 1
    score += consecutive * 3
    ti = found + 1
  }

  const lengthPenalty = Math.max(0, t.length - q.length) * 0.15
  return Math.max(10, 35 + score - lengthPenalty)
}

function recencyBoost(food: FoodItem): number {
  let boost = Math.min(food.timesUsed ?? 0, 20) * 0.5
  if (food.lastUsed) {
    const days = Math.floor(
      (Date.now() - new Date(food.lastUsed + 'T12:00:00').getTime()) / 86_400_000,
    )
    if (days <= 0) boost += 12
    else if (days <= 3) boost += 8
    else if (days <= 7) boost += 4
    else if (days <= 30) boost += 1
  }
  return boost
}

export function scoreFoodMatch(food: FoodItem, parsed: ParsedFoodQuery): number {
  if (parsed.categoryFilter && !itemHasCategory(food, parsed.categoryFilter)) {
    return 0
  }

  const q = parsed.text
  if (!q) return 1 + recencyBoost(food)

  const nameScore = fuzzyScore(food.name, q) * 1.2
  const servingScore = fuzzyScore(food.servingDesc ?? '', q) * 0.6
  const categoryScore = Math.max(
    0,
    ...foodCategories(food).map((c) => fuzzyScore(c, q) * 0.85),
  )

  const best = Math.max(nameScore, servingScore, categoryScore)
  if (best <= 0) return 0

  return best + recencyBoost(food) * 0.35
}

export function searchFoodItems(
  items: FoodItem[],
  query: string,
): { results: FoodItem[]; parsed: ParsedFoodQuery } {
  const parsed = parseFoodSearchQuery(query)
  const trimmed = query.trim()

  if (!trimmed) {
    const sorted = [...items].sort((a, b) => {
      const boostDiff = recencyBoost(b) - recencyBoost(a)
      if (boostDiff !== 0) return boostDiff
      return a.name.localeCompare(b.name)
    })
    return { results: sorted, parsed }
  }

  const scored = items
    .map((food) => ({ food, score: scoreFoodMatch(food, parsed) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.food.name.localeCompare(b.food.name)
    })

  return { results: scored.map((s) => s.food), parsed }
}

export function getRecentFoods(items: FoodItem[], limit = 10): FoodItem[] {
  return [...items]
    .filter((f) => f.lastUsed || (f.timesUsed ?? 0) > 0)
    .sort((a, b) => {
      const usedDiff = (b.timesUsed ?? 0) - (a.timesUsed ?? 0)
      if (usedDiff !== 0) return usedDiff
      const aDate = a.lastUsed ?? ''
      const bDate = b.lastUsed ?? ''
      return bDate.localeCompare(aDate)
    })
    .slice(0, limit)
}

export function normalizeRecentSearch(query: string): string | null {
  const trimmed = query.trim()
  if (trimmed.length < 2) return null
  return trimmed
}

export function pushRecentSearch(
  list: string[],
  query: string,
  max = RECENT_SEARCH_MAX,
): string[] {
  const normalized = normalizeRecentSearch(query)
  if (!normalized) return list

  const key = normalized.toLowerCase()
  const next = [
    normalized,
    ...list.filter((s) => s.toLowerCase() !== key),
  ].slice(0, max)
  return next
}

export function foodSearchHint(parsed: ParsedFoodQuery): string | null {
  if (parsed.categoryFilter) {
    return `Category: ${parsed.categoryFilter}`
  }
  return null
}