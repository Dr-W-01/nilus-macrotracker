export type BadgeCategory =
  | 'one_time'
  | 'macro'
  | 'weight'
  | 'burned'
  | 'streak'
  | 'volume'
  | 'special'

export type BadgeId =
  // One-time
  | 'first_food'
  | 'library_five'
  | 'library_ten'
  | 'library_twentyfive'
  | 'library_fifty'
  | 'library_hundred'
  | 'first_recipe'
  | 'recipes_five'
  | 'recipes_ten'
  | 'recipe_logged'
  | 'note_writer'
  | 'note_long'
  | 'first_uncategorized'
  | 'weight_logs_10'
  | 'weight_logs_50'
  | 'burn_month_days'
  | 'burn_logs_50'
  | 'burn_month_calendar'
  | 'logs_50'
  | 'logs_250'
  | 'logs_500'
  | 'logs_1000'
  | 'logs_2000'
  | 'logs_5000'
  | 'days_logged_10'
  | 'days_logged_50'
  | 'days_logged_100'
  | 'days_logged_200'
  | 'days_logged_365'
  | 'days_logged_500'
  // Macro tracking
  | 'protein_day'
  | 'calorie_day'
  | 'balance_day'
  | 'fiber_day'
  | 'carbs_day'
  | 'fat_day'
  | 'sugars_day'
  | 'deficit_day'
  | 'surplus_day'
  | 'macro_triple_day'
  | 'macro_quad_day'
  | 'protein_week'
  | 'calorie_week'
  | 'balance_week'
  | 'fiber_week'
  | 'carbs_week'
  | 'fat_week'
  | 'sugars_week'
  | 'protein_streak_7'
  | 'calorie_streak_7'
  | 'fiber_streak_7'
  | 'deficit_streak_3'
  | 'deficit_streak_7'
  // Weight
  | 'first_weight'
  | 'weight_streak_7'
  | 'weight_streak_14'
  | 'weight_streak_30'
  | 'weight_streak_60'
  | 'weight_streak_90'
  // Burned calories & net energy
  | 'burn_tracker'
  | 'burn_week'
  | 'burn_streak_7'
  | 'burn_streak_14'
  | 'burn_streak_30'
  | 'net_deficit_500_day'
  | 'net_deficit_1000_day'
  | 'net_deficit_week_5000'
  // Streak & consistency
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_21'
  | 'streak_30'
  | 'streak_45'
  | 'streak_60'
  | 'streak_90'
  | 'streak_100'
  | 'streak_200'
  | 'streak_365'
  | 'breakfast_streak_7'
  | 'lunch_streak_7'
  | 'dinner_streak_7'
  | 'weekend_logger'
  | 'weekday_warrior'
  | 'full_week_logger'
  | 'meal_complete'
  | 'meal_complete_week'
  | 'big_day_10'
  | 'big_day_15'
  | 'big_day_20'
  | 'note_streak_3'
  | 'note_streak_7'
  | 'note_streak_14'
  // Volume & milestones (recurring)
  | 'logs_100'
  | 'recipe_logs_10'
  | 'recipe_logs_50'
  | 'favorite_logger'
  // Special & fun
  | 'first_favorite'
  | 'five_favorites'
  | 'ten_favorites'
  | 'custom_recipe'
  | 'categories_five'
  | 'category_tagger'
  | 'library_diverse'

export interface BadgeEarnedInstance {
  earnedAt: string
  periodKey?: string
}

export interface BadgeProgress {
  instances: BadgeEarnedInstance[]
}

export interface BadgeState {
  initialized: boolean
  progress: Partial<Record<BadgeId, BadgeProgress>>
  unviewedBadgeIds: BadgeId[]
}

export interface BadgeDefinition {
  id: BadgeId
  category: BadgeCategory
  name: string
  description: string
  howToEarn: string
  icon: string
  recurring: boolean
  weightBased?: boolean
  burnBased?: boolean
}

export interface BadgeCategoryMeta {
  id: BadgeCategory
  title: string
  description: string
}