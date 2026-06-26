export type BadgeId =
  | 'first_food'
  | 'library_ten'
  | 'first_recipe'
  | 'streak_7'
  | 'streak_30'
  | 'protein_week'
  | 'calorie_week'
  | 'balance_week'
  | 'meal_complete'
  | 'note_writer'
  | 'burn_tracker'
  | 'first_weight'
  | 'weight_streak_7'
  | 'logs_100'

export interface BadgeEarnedInstance {
  /** Calendar date (yyyy-MM-dd) when the badge was earned. */
  earnedAt: string
  /** Stable key for recurring badges — prevents duplicate awards. */
  periodKey?: string
}

export interface BadgeProgress {
  instances: BadgeEarnedInstance[]
}

export interface BadgeState {
  initialized: boolean
  progress: Partial<Record<BadgeId, BadgeProgress>>
}

export interface BadgeDefinition {
  id: BadgeId
  name: string
  description: string
  howToEarn: string
  icon: string
  recurring: boolean
  weightBased?: boolean
}