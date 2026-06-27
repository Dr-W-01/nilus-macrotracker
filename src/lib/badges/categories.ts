import { BADGE_DEFINITIONS } from '@/lib/badges/definitions'
import type { BadgeCategory, BadgeCategoryMeta, BadgeDefinition } from '@/lib/badges/types'

export const BADGE_CATEGORY_META: BadgeCategoryMeta[] = [
  {
    id: 'one_time',
    title: 'One-Time Badges',
    description: 'Milestones you earn once and keep forever.',
  },
  {
    id: 'macro',
    title: 'Macro Tracking',
    description: 'Hit your protein, carbs, fat, fiber, sugars, and calorie goals.',
  },
  {
    id: 'weight',
    title: 'Weight Tracking',
    description: 'Badges for logging and staying consistent with body weight.',
  },
  {
    id: 'burned',
    title: 'Burned Calories',
    description: 'Track and stay consistent with calories burned.',
  },
  {
    id: 'streak',
    title: 'Streaks & Consistency',
    description: 'Keep showing up — daily logging habits and meal routines.',
  },
  {
    id: 'volume',
    title: 'Volume & Milestones',
    description: 'Cumulative achievements from total logs and long-term activity.',
  },
  {
    id: 'special',
    title: 'Special & Fun',
    description: 'Library, recipes, favorites, and unique first-time moments.',
  },
]

export function badgesByCategory(): Record<BadgeCategory, BadgeDefinition[]> {
  const grouped = Object.fromEntries(
    BADGE_CATEGORY_META.map((c) => [c.id, [] as BadgeDefinition[]]),
  ) as Record<BadgeCategory, BadgeDefinition[]>

  for (const badge of BADGE_DEFINITIONS) {
    grouped[badge.category].push(badge)
  }

  return grouped
}