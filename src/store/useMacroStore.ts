import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SEED_LIBRARY } from '@/data/seedLibrary'
import { getWeekRange, todayString } from '@/lib/dates'
import { computeComponentMacros } from '@/lib/macros'
import { macroStorage, STORAGE_KEY } from '@/lib/storage'
import type {
  AppTab,
  DailyLog,
  FoodItem,
  GoalTemplate,
  LoggedFood,
  Settings,
} from '@/lib/types'
import { DEFAULT_ACCENT_COLOR, DEFAULT_SECONDARY_TEXT_COLOR } from '@/lib/theme'
import { generateId } from '@/lib/utils'

const defaultGoal: GoalTemplate = {
  id: 'default',
  name: 'Maintenance',
  calories: 2200,
  protein: 150,
  carbs: 220,
  fat: 70,
  fiber: 30,
  sugars: 50,
}

const defaultSettings: Settings = {
  goalTemplates: [defaultGoal],
  defaultTemplateId: 'default',
  theme: 'dark',
  accentColor: DEFAULT_ACCENT_COLOR,
  secondaryTextColor: DEFAULT_SECONDARY_TEXT_COLOR,
}

function createEmptyLog(date: string, templateId: string): DailyLog {
  return {
    date,
    goalTemplateId: templateId,
    foods: [],
    burnedCalories: 0,
    note: '',
  }
}

function enrichRecipe(item: FoodItem, library: FoodItem[]): FoodItem {
  if (!item.isRecipe || !item.recipeComponents) return item
  const macros = computeComponentMacros(library, item.recipeComponents)
  return {
    ...item,
    caloriesPerServing: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    fiber: macros.fiber,
    sugars: macros.sugars,
  }
}

interface MacroStore {
  _hasHydrated: boolean
  settings: Settings
  foodLibrary: FoodItem[]
  dailyLogs: Record<string, DailyLog>
  currentDate: string
  currentTab: AppTab
  editDayMode: boolean
  librarySegment: 'items' | 'categories' | 'recipes'
  statsPeriod: 'week' | 'month' | 'custom'
  statsRangeStart: string
  statsRangeEnd: string
  statsView: 'table' | 'charts'
  statsAnchorDate: string

  setHasHydrated: (v: boolean) => void
  setCurrentTab: (tab: AppTab) => void
  setCurrentDate: (date: string) => void
  setEditDayMode: (v: boolean) => void
  setLibrarySegment: (s: 'items' | 'categories' | 'recipes') => void
  setStatsPeriod: (p: 'week' | 'month' | 'custom') => void
  setStatsRange: (start: string, end: string) => void
  setStatsView: (v: 'table' | 'charts') => void
  setStatsAnchorDate: (d: string) => void

  getDailyLog: (date?: string) => DailyLog
  updateDailyLog: (date: string, patch: Partial<DailyLog>) => void
  addLoggedFood: (logged: Omit<LoggedFood, 'id'>, date?: string) => void
  updateLoggedFood: (loggedId: string, patch: Partial<LoggedFood>, date?: string) => void
  removeLoggedFood: (loggedId: string, date?: string) => void
  setBurnedCalories: (value: number, date?: string) => void
  setDailyNote: (note: string, date?: string) => void

  loadSeedLibrary: () => void
  mergeFoodLibrary: (items: FoodItem[], replace?: boolean) => void
  addFoodItem: (item: Omit<FoodItem, 'id' | 'lastUsed' | 'timesUsed'>) => string
  updateFoodItem: (id: string, patch: Partial<FoodItem>) => void
  deleteFoodItems: (ids: string[]) => void
  touchFoodUsage: (foodId: string) => void

  updateSettings: (patch: Partial<Settings>) => void
  addGoalTemplate: (t: Omit<GoalTemplate, 'id'>) => string
  updateGoalTemplate: (id: string, patch: Partial<GoalTemplate>) => void
  deleteGoalTemplate: (id: string) => void
  factoryReset: () => void
}

export const useMacroStore = create<MacroStore>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      settings: defaultSettings,
      foodLibrary: [],
      dailyLogs: {},
      currentDate: todayString(),
      currentTab: 'daily',
      editDayMode: false,
      librarySegment: 'items',
      statsPeriod: 'week',
      statsRangeStart: getWeekRange().start,
      statsRangeEnd: getWeekRange().end,
      statsView: 'charts',
      statsAnchorDate: todayString(),

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setCurrentTab: (tab) => set({ currentTab: tab }),
      setCurrentDate: (date) => set({ currentDate: date }),
      setEditDayMode: (v) => set({ editDayMode: v }),
      setLibrarySegment: (s) => set({ librarySegment: s }),
      setStatsPeriod: (p) => set({ statsPeriod: p }),
      setStatsRange: (start, end) =>
        set({ statsRangeStart: start, statsRangeEnd: end }),
      setStatsView: (v) => set({ statsView: v }),
      setStatsAnchorDate: (d) => set({ statsAnchorDate: d }),

      getDailyLog: (date) => {
        const d = date ?? get().currentDate
        const existing = get().dailyLogs[d]
        if (existing) return existing
        const templateId = get().settings.defaultTemplateId
        return createEmptyLog(d, templateId)
      },

      updateDailyLog: (date, patch) => {
        const logs = { ...get().dailyLogs }
        const base =
          logs[date] ??
          createEmptyLog(date, get().settings.defaultTemplateId)
        logs[date] = { ...base, ...patch, date }
        set({ dailyLogs: logs })
      },

      addLoggedFood: (logged, date) => {
        const d = date ?? get().currentDate
        const log = get().getDailyLog(d)
        const entry: LoggedFood = { ...logged, id: generateId() }
        get().touchFoodUsage(logged.foodId)
        get().updateDailyLog(d, { foods: [...log.foods, entry] })
      },

      updateLoggedFood: (loggedId, patch, date) => {
        const d = date ?? get().currentDate
        const log = get().getDailyLog(d)
        get().updateDailyLog(d, {
          foods: log.foods.map((f) =>
            f.id === loggedId ? { ...f, ...patch } : f,
          ),
        })
      },

      removeLoggedFood: (loggedId, date) => {
        const d = date ?? get().currentDate
        const log = get().getDailyLog(d)
        get().updateDailyLog(d, {
          foods: log.foods.filter((f) => f.id !== loggedId),
        })
      },

      setBurnedCalories: (value, date) => {
        const d = date ?? get().currentDate
        get().updateDailyLog(d, { burnedCalories: Math.max(0, value) })
      },

      setDailyNote: (note, date) => {
        const d = date ?? get().currentDate
        get().updateDailyLog(d, { note })
      },

      loadSeedLibrary: () => {
        const lib = SEED_LIBRARY.map((item: FoodItem) => {
          if (item.isRecipe && item.recipeComponents) {
            return enrichRecipe(item, SEED_LIBRARY)
          }
          return { ...item }
        })
        set({ foodLibrary: lib })
      },

      mergeFoodLibrary: (items, replace = false) => {
        const normalized = items.map((item) => ({
          ...item,
          id: item.id || generateId(),
          lastUsed: item.lastUsed || todayString(),
          timesUsed: item.timesUsed ?? 0,
        }))
        if (replace) {
          const lib = normalized.map((item) =>
            item.isRecipe && item.recipeComponents
              ? enrichRecipe(item, normalized)
              : item,
          )
          set({ foodLibrary: lib })
          return
        }
        const map = new Map(get().foodLibrary.map((f) => [f.id, f]))
        normalized.forEach((item) => {
          const enriched =
            item.isRecipe && item.recipeComponents
              ? enrichRecipe(item, [...map.values(), ...normalized])
              : item
          map.set(enriched.id, enriched)
        })
        set({ foodLibrary: [...map.values()] })
      },

      addFoodItem: (item) => {
        const id = generateId()
        const newItem: FoodItem = {
          ...item,
          id,
          lastUsed: todayString(),
          timesUsed: 0,
        }
        const lib = [...get().foodLibrary, newItem]
        const enriched =
          newItem.isRecipe && newItem.recipeComponents
            ? enrichRecipe(newItem, lib)
            : newItem
        set({
          foodLibrary: lib.map((f) => (f.id === id ? enriched : f)),
        })
        return id
      },

      updateFoodItem: (id, patch) => {
        const lib = get().foodLibrary.map((f) => {
          if (f.id !== id) return f
          const updated = { ...f, ...patch }
          return updated.isRecipe && updated.recipeComponents
            ? enrichRecipe(updated, get().foodLibrary)
            : updated
        })
        set({ foodLibrary: lib })
      },

      deleteFoodItems: (ids) => {
        set({
          foodLibrary: get().foodLibrary.filter((f) => !ids.includes(f.id)),
        })
      },

      touchFoodUsage: (foodId) => {
        set({
          foodLibrary: get().foodLibrary.map((f) =>
            f.id === foodId
              ? {
                  ...f,
                  lastUsed: todayString(),
                  timesUsed: f.timesUsed + 1,
                }
              : f,
          ),
        })
      },

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      addGoalTemplate: (t) => {
        const id = generateId()
        set({
          settings: {
            ...get().settings,
            goalTemplates: [...get().settings.goalTemplates, { ...t, id }],
          },
        })
        return id
      },

      updateGoalTemplate: (id, patch) => {
        set({
          settings: {
            ...get().settings,
            goalTemplates: get().settings.goalTemplates.map((g) =>
              g.id === id ? { ...g, ...patch } : g,
            ),
          },
        })
      },

      deleteGoalTemplate: (id) => {
        const templates = get().settings.goalTemplates.filter((g) => g.id !== id)
        if (templates.length === 0) return
        const defaultTemplateId =
          get().settings.defaultTemplateId === id
            ? templates[0].id
            : get().settings.defaultTemplateId
        set({
          settings: { ...get().settings, goalTemplates: templates, defaultTemplateId },
        })
      },

      factoryReset: () => {
        set({
          settings: defaultSettings,
          foodLibrary: [],
          dailyLogs: {},
          currentDate: todayString(),
          currentTab: 'daily',
          editDayMode: false,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => macroStorage),
      partialize: (state) => ({
        settings: state.settings,
        foodLibrary: state.foodLibrary,
        dailyLogs: state.dailyLogs,
        currentDate: state.currentDate,
        currentTab: state.currentTab,
        editDayMode: state.editDayMode,
        librarySegment: state.librarySegment,
        statsPeriod: state.statsPeriod,
        statsRangeStart: state.statsRangeStart,
        statsRangeEnd: state.statsRangeEnd,
        statsView: state.statsView,
        statsAnchorDate: state.statsAnchorDate,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)