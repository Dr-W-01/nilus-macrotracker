import type { BadgeDefinition, BadgeId } from '@/lib/badges/types'

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_food',
    name: 'First Bite',
    description: 'You started your tracking journey.',
    howToEarn: 'Log your first food on the Daily tab.',
    icon: '🍽️',
    recurring: false,
  },
  {
    id: 'library_ten',
    name: 'Pantry Builder',
    description: 'Your food library is growing.',
    howToEarn: 'Add 10 foods to your Library.',
    icon: '📚',
    recurring: false,
  },
  {
    id: 'first_recipe',
    name: 'Recipe Creator',
    description: 'You built a reusable meal from ingredients.',
    howToEarn: 'Create your first recipe in the Library.',
    icon: '🍱',
    recurring: false,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Seven days of consistent logging.',
    howToEarn: 'Log food on 7 consecutive days.',
    icon: '🔥',
    recurring: true,
  },
  {
    id: 'streak_30',
    name: 'Monthly Machine',
    description: 'A full month of daily tracking.',
    howToEarn: 'Log food on 30 consecutive days.',
    icon: '💪',
    recurring: true,
  },
  {
    id: 'protein_week',
    name: 'Protein Pro',
    description: 'You nailed your protein targets all week.',
    howToEarn:
      'Hit your protein goal on every logged day in a calendar week (Sun–Sat), with at least 5 logged days.',
    icon: '🥩',
    recurring: true,
  },
  {
    id: 'calorie_week',
    name: 'Calorie Commander',
    description: 'Calorie targets met across the board.',
    howToEarn:
      'Hit your calorie goal on every logged day in a calendar week (Sun–Sat), with at least 5 logged days.',
    icon: '🎯',
    recurring: true,
  },
  {
    id: 'balance_week',
    name: 'Energy Expert',
    description: 'Net calories on target all week.',
    howToEarn:
      'Hit your energy balance (net calorie) goal on every logged day in a calendar week, with at least 5 logged days.',
    icon: '⚡',
    recurring: true,
  },
  {
    id: 'meal_complete',
    name: 'Full Plate',
    description: 'Every meal category filled in one day.',
    howToEarn: 'Log at least one food in every configured meal on a single day.',
    icon: '🥗',
    recurring: true,
  },
  {
    id: 'note_writer',
    name: 'Day Diarist',
    description: 'You left yourself a note for the day.',
    howToEarn: 'Write a daily note on the Daily tab.',
    icon: '📝',
    recurring: false,
  },
  {
    id: 'burn_tracker',
    name: 'Burn Tracker',
    description: 'You logged calories burned.',
    howToEarn: 'Record burned calories for a day.',
    icon: '🔥',
    recurring: false,
  },
  {
    id: 'first_weight',
    name: 'Scale Starter',
    description: 'Your first weight entry is in the books.',
    howToEarn: 'Log your body weight on the Daily tab.',
    icon: '⚖️',
    recurring: false,
    weightBased: true,
  },
  {
    id: 'weight_streak_7',
    name: 'Weight Watcher',
    description: 'A week of weight check-ins.',
    howToEarn: 'Log your weight on 7 consecutive days.',
    icon: '📉',
    recurring: true,
    weightBased: true,
  },
  {
    id: 'logs_100',
    name: 'Century Logger',
    description: 'One hundred foods logged — keep going!',
    howToEarn: 'Log 100 total food entries across all days (repeats every 100).',
    icon: '💯',
    recurring: true,
  },
]

export const BADGE_BY_ID: Record<BadgeId, BadgeDefinition> = Object.fromEntries(
  BADGE_DEFINITIONS.map((b) => [b.id, b]),
) as Record<BadgeId, BadgeDefinition>

export const ALL_BADGE_IDS = BADGE_DEFINITIONS.map((b) => b.id)