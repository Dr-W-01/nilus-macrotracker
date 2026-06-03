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
  unit?: 'g' | 'oz'
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
  note?: string
  overriddenComponents?: { foodId: string; quantity: number }[]
}

export interface DailyLog {
  date: string
  goalTemplateId: string
  foods: LoggedFood[]
  burnedCalories: number
  note: string
}

export interface GoalTemplate {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugars: number
}

export interface Settings {
  goalTemplates: GoalTemplate[]
  defaultTemplateId: string
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
  statsView: 'table' | 'charts'
}