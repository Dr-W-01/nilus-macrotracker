export type BadgeId =
  | 'first_food'
  | 'library_ten'
  | 'library_twentyfive'
  | 'library_fifty'
  | 'first_recipe'
  | 'recipe_logged'
  | 'recipe_logs_10'
  | 'custom_recipe'
  | 'first_favorite'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'streak_60'
  | 'streak_100'
  | 'protein_day'
  | 'calorie_day'
  | 'balance_day'
  | 'fiber_day'
  | 'protein_week'
  | 'calorie_week'
  | 'balance_week'
  | 'meal_complete'
  | 'big_day_10'
  | 'breakfast_streak_7'
  | 'weekend_logger'
  | 'note_writer'
  | 'note_streak_3'
  | 'burn_tracker'
  | 'burn_week'
  | 'first_weight'
  | 'weight_streak_7'
  | 'weight_streak_30'
  | 'logs_50'
  | 'logs_100'
  | 'logs_500'
  | 'logs_1000'
  | 'days_logged_10'
  | 'days_logged_50'
  | 'days_logged_100'

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
  /** Badge IDs earned but not yet seen on the Badges tab. */
  unviewedBadgeIds: BadgeId[]
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