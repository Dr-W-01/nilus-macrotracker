import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SEED_LIBRARY } from '@/data/seedLibrary'
import { getWeekRange, todayString } from '@/lib/dates'
import { computeComponentMacros } from '@/lib/macros'
import {
  addCategoryToItem,
  collectAllCategories,
  foodCategories,
  normalizeCategoryList,
  removeCategoryFromItem,
} from '@/lib/categories'
import { normalizeScaleFoodItem } from '@/lib/scale'
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

function sanitizeFoodItem(item: FoodItem): FoodItem {
  return {
    ...item,
    categories: Array.isArray(item.categories) ? item.categories : [],
  }
}

function normalizeLibraryItem(item: FoodItem, library?: FoodItem[]): FoodItem {
  const base = normalizeScaleFoodItem(sanitizeFoodItem(item))
  if (base.isRecipe && base.recipeComponents) {
    return enrichRecipe(base, library ?? [])
  }
  return base
}

const PERSIST_VERSION = 2

type PersistedSlice = {
  settings?: Settings
  foodLibrary?: FoodItem[]
  customCategories?: string[]
  dailyLogs?: Record<string, DailyLog>
  currentDate?: string
  currentTab?: AppTab
  editDayMode?: boolean
  librarySegment?: 'items' | 'categories' | 'recipes'
  statsPeriod?: 'week' | 'month' | 'custom'
  statsRangeStart?: string
  statsRangeEnd?: string
  statsView?: 'table' | 'charts'
  statsAnchorDate?: string
}

function normalizePersistedState(persisted: PersistedSlice): PersistedSlice {
  const week = getWeekRange()
  return {
    ...persisted,
    settings: {
      ...defaultSettings,
      ...persisted.settings,
      goalTemplates:
        persisted.settings?.goalTemplates?.length
          ? persisted.settings.goalTemplates
          : defaultSettings.goalTemplates,
      defaultTemplateId:
        persisted.settings?.defaultTemplateId ?? defaultSettings.defaultTemplateId,
      theme: persisted.settings?.theme ?? defaultSettings.theme,
      accentColor: persisted.settings?.accentColor ?? defaultSettings.accentColor,
      secondaryTextColor:
        persisted.settings?.secondaryTextColor ?? defaultSettings.secondaryTextColor,
    },
    customCategories: Array.isArray(persisted.customCategories)
      ? persisted.customCategories
      : [],
    foodLibrary: (persisted.foodLibrary ?? []).map((item) =>
      normalizeLibraryItem(item, persisted.foodLibrary),
    ),
    dailyLogs: persisted.dailyLogs ?? {},
    statsRangeStart: persisted.statsRangeStart ?? week.start,
    statsRangeEnd: persisted.statsRangeEnd ?? week.end,
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
  /** User-created category names (may exist before any item uses them) */
  customCategories: string[]
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

  addLibraryCategory: (name: string) => boolean
  renameLibraryCategory: (oldName: string, newName: string) => boolean
  removeLibraryCategory: (name: string) => void
  applyCategoryMembership: (
    category: string,
    addIds: string[],
    removeIds: string[],
  ) => void
  getAllLibraryCategories: () => string[]

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
      customCategories: [],
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
        const lib = SEED_LIBRARY.map((item: FoodItem) =>
          item.isRecipe && item.recipeComponents
            ? enrichRecipe(normalizeScaleFoodItem(item), SEED_LIBRARY)
            : normalizeScaleFoodItem(item),
        )
        set({ foodLibrary: lib })
      },

      mergeFoodLibrary: (items, replace = false) => {
        const normalized = items.map((item) =>
          normalizeLibraryItem({
            ...item,
            id: item.id || generateId(),
            lastUsed: item.lastUsed || todayString(),
            timesUsed: item.timesUsed ?? 0,
          }),
        )
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
        const newItem = normalizeLibraryItem({
          ...item,
          id,
          lastUsed: todayString(),
          timesUsed: 0,
        })
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
          const updated = normalizeLibraryItem({ ...f, ...patch })
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

      getAllLibraryCategories: () =>
        collectAllCategories(get().foodLibrary, get().customCategories ?? []),

      addLibraryCategory: (name) => {
        const tag = normalizeCategoryList([name])[0]
        if (!tag) return false
        const custom = get().customCategories ?? []
        const existing = collectAllCategories(get().foodLibrary, custom)
        if (existing.some((c) => c.toLowerCase() === tag.toLowerCase())) {
          return false
        }
        set({ customCategories: [...custom, tag] })
        return true
      },

      renameLibraryCategory: (oldName, newName) => {
        const tag = normalizeCategoryList([newName])[0]
        if (!tag) return false
        const oldKey = oldName.toLowerCase()
        const custom = get().customCategories ?? []
        const all = collectAllCategories(get().foodLibrary, custom)
        if (all.some((c) => c.toLowerCase() === tag.toLowerCase() && c.toLowerCase() !== oldKey)) {
          return false
        }
        set({
          customCategories: custom.map((c) =>
            c.toLowerCase() === oldKey ? tag : c,
          ),
          foodLibrary: get().foodLibrary.map((f) => ({
            ...f,
            categories: foodCategories(f).map((c) =>
              c.toLowerCase() === oldKey ? tag : c,
            ),
          })),
        })
        return true
      },

      removeLibraryCategory: (name) => {
        const key = name.toLowerCase()
        set({
          customCategories: (get().customCategories ?? []).filter(
            (c) => c.toLowerCase() !== key,
          ),
          foodLibrary: get().foodLibrary.map((f) => ({
            ...f,
            categories: removeCategoryFromItem(f.categories, name),
          })),
        })
      },

      applyCategoryMembership: (category, addIds, removeIds) => {
        const addSet = new Set(addIds)
        const removeSet = new Set(removeIds)
        set({
          foodLibrary: get().foodLibrary.map((f) => {
            if (addSet.has(f.id)) {
              return {
                ...f,
                categories: addCategoryToItem(f.categories, category),
              }
            }
            if (removeSet.has(f.id)) {
              return {
                ...f,
                categories: removeCategoryFromItem(f.categories, category),
              }
            }
            return f
          }),
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
          customCategories: [],
          dailyLogs: {},
          currentDate: todayString(),
          currentTab: 'daily',
          editDayMode: false,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => macroStorage),
      merge: (persisted, currentState) => ({
        ...currentState,
        ...(normalizePersistedState(
          (persisted ?? {}) as PersistedSlice,
        ) as Partial<MacroStore>),
      }),
      partialize: (state) => ({
        settings: state.settings,
        foodLibrary: state.foodLibrary,
        customCategories: state.customCategories,
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
      migrate: (persisted: unknown, version) => {
        const state = normalizePersistedState((persisted ?? {}) as PersistedSlice)
        if (version < PERSIST_VERSION) {
          return state
        }
        return state
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const normalized = normalizePersistedState({
          settings: state.settings,
          foodLibrary: state.foodLibrary,
          customCategories: state.customCategories,
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
        })
        state.customCategories = normalized.customCategories ?? []
        state.foodLibrary = normalized.foodLibrary ?? []
        state.settings = normalized.settings ?? defaultSettings
        state.dailyLogs = normalized.dailyLogs ?? {}
        if (normalized.statsRangeStart) state.statsRangeStart = normalized.statsRangeStart
        if (normalized.statsRangeEnd) state.statsRangeEnd = normalized.statsRangeEnd
        state.setHasHydrated(true)
      },
    },
  ),
)