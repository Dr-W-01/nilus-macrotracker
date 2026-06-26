export interface FoodItem {
  id: string
  name: string
  caloriesPerServing: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugars: number
  scaleType: 'count' | 'scale'
  /** @deprecated Use baseUnit; kept for backward compatibility */
  unit?: 'g' | 'oz'
  /** Base serving size for scale items (macros are per this amount) */
  baseAmount?: number
  baseUnit?: 'g' | 'oz'
  servingDesc: string
  categories: string[]
  isRecipe: boolean
  recipeComponents?: { foodId: string; quantity: number }[]
  lastUsed: string
  timesUsed: number
}

export interface LoggedFood {
  id: string
  foodId: string
  quantity: number
  /** Actual amount eaten (scale items), in the food's unit */
  scaleAmountEaten?: number
  /** Meal grouping label (e.g. Breakfast, Lunch) */
  meal?: string
  note?: string
  overriddenComponents?: { foodId: string; quantity: number }[]
}

export interface DailyLog {
  date: string
  goalTemplateId: string
  /** Frozen goal values from when this day was logged or its template was last set. */
  goalSnapshot?: GoalTemplate
  foods: LoggedFood[]
  burnedCalories: number
  /** Body weight stored in kilograms (optional). */
  weightKg?: number
  note: string
}

export interface GoalTemplate {
  id: string
  name: string
  /** Daily target calorie intake */
  calories: number
  /**
   * Signed target net calories per day (optional): eaten − burned.
   * Negative = deficit goal (e.g. -1000), positive = surplus goal (e.g. +500).
   */
  targetDeficit?: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugars: number
}

export type GoalMode = 'cut' | 'maintain' | 'bulk'
export type WeightUnit = 'lbs' | 'kg'

export interface Settings {
  goalTemplates: GoalTemplate[]
  defaultTemplateId: string
  /** Display unit for body weight logging. */
  weightUnit: WeightUnit
  /** Meal names for grouping foods on the Daily tab. */
  meals: string[]
  /** Default meal when logging new food. */
  defaultMeal: string
  /** Goal body weight in kilograms (optional). */
  targetWeightKg?: number
  /** When false, weight UI is hidden; logged data is kept. Default: true. */
  trackCurrentWeight?: boolean
  /** When false, burned-calorie UI is hidden; logged data is kept. Default: true. */
  trackBurnedCalories?: boolean
  theme: 'dark' | 'light'
  accentColor: string
  /** Secondary / muted text (labels, hints, grey copy) */
  secondaryTextColor: string
}

export type AppTab = 'daily' | 'library' | 'stats' | 'settings'

export interface MacroTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugars: number
}

export interface PersistedState {
  settings: Settings
  foodLibrary: FoodItem[]
  dailyLogs: Record<string, DailyLog>
  currentDate: string
  currentTab: AppTab
  editDayMode: boolean
  librarySegment: 'items' | 'categories' | 'recipes'
  statsPeriod: 'week' | 'month' | 'custom'
  statsCustomStart: string
  statsCustomEnd: string
  statsView: 'overview' | 'trends' | 'breakdowns'
}