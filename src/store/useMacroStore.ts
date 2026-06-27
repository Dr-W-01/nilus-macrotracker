import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SEED_LIBRARY } from '@/data/seedLibrary'
import { getWeekRange, shiftDate, todayString } from '@/lib/dates'
import { computeComponentMacros } from '@/lib/macros'
import {
  addCategoryToItem,
  collectAllCategories,
  foodCategories,
  itemsInCategory,
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

import { pushRecentSearch } from '@/lib/foodSearch'
import {
  DEFAULT_MEALS,
  normalizeMealName,
  normalizeMeals,
  remapCollapsedMeals,
  remapMealReferences,
  resolveLoggedMeal,
  sanitizeOrphanedMealAssignments,
  uncategorizeMealFromDailyLogs,
} from '@/lib/meals'
import { DEFAULT_ACCENT_COLOR, DEFAULT_SECONDARY_TEXT_COLOR } from '@/lib/theme'
import { DEFAULT_WEIGHT_UNIT, normalizeWeightUnit } from '@/lib/weight'
import {
  ensureGoalSnapshot,
  findGoalTemplateById,
  snapshotGoalTemplate,
  snapshotLogsGoalTemplates,
} from '@/lib/goals'
import {
  ALL_BADGE_IDS,
} from '@/lib/badges/definitions'
import {
  appendUnviewedBadges,
  applyBadgeAwards,
  createEmptyBadgeState,
  scanAllBadgeInstances,
} from '@/lib/badges/evaluate'
import { toastBadgesUnlocked } from '@/lib/badges/badgeToast'
import type { BadgeId, BadgeState } from '@/lib/badges/types'
import { generateId } from '@/lib/utils'

function normalizeBadgeState(raw?: BadgeState): BadgeState {
  if (!raw || typeof raw !== 'object') return createEmptyBadgeState()
  const validIds = new Set(ALL_BADGE_IDS)
  const unviewed = Array.isArray(raw.unviewedBadgeIds)
    ? raw.unviewedBadgeIds.filter((id): id is BadgeId => validIds.has(id as BadgeId))
    : []
  return {
    initialized: raw.initialized === true,
    progress: raw.progress && typeof raw.progress === 'object' ? raw.progress : {},
    unviewedBadgeIds: unviewed,
  }
}

function runBadgeEvaluation(
  get: () => MacroStore,
  set: (partial: Partial<MacroStore>) => void,
  options: { silent?: boolean } = {},
) {
  const state = get()
  if (!state.badgeState.initialized) return

  const awards = scanAllBadgeInstances({
    dailyLogs: state.dailyLogs,
    foodLibrary: state.foodLibrary,
    settings: state.settings,
    badgeState: state.badgeState,
    favoriteFoodIds: state.favoriteFoodIds,
  })

  const { nextState, newBadgeIds } = applyBadgeAwards(state.badgeState, awards)
  if (newBadgeIds.length === 0) return

  const badgeState = appendUnviewedBadges(nextState, newBadgeIds)
  set({ badgeState })
  if (!options.silent) {
    toastBadgesUnlocked(newBadgeIds)
  }
}

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
  weightUnit: DEFAULT_WEIGHT_UNIT,
  meals: [...DEFAULT_MEALS],
  defaultMeal: DEFAULT_MEALS[0],
  trackCurrentWeight: true,
  trackBurnedCalories: true,
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

const PERSIST_VERSION = 13

const EMPTY_RECENT_SEARCHES = { library: [] as string[], picker: [] as string[] }

const EMPTY_COLLAPSED_MEALS: string[] = []

type PersistedSlice = {
  settings?: Settings
  foodLibrary?: FoodItem[]
  customCategories?: string[]
  dailyLogs?: Record<string, DailyLog>
  /** Per calendar day: meal names that are collapsed on the Daily tab */
  mealCollapseByDate?: Record<string, string[]>
  currentDate?: string
  currentTab?: AppTab
  librarySegment?: 'items' | 'categories' | 'recipes'
  statsPeriod?: 'week' | 'month' | 'custom'
  statsRangeStart?: string
  statsRangeEnd?: string
  statsView?: 'overview' | 'trends' | 'breakdowns' | 'weight' | 'table' | 'charts'
  statsAnchorDate?: string
  favoriteFoodIds?: string[]
  recentFoodSearches?: { library?: string[]; picker?: string[] }
  badgeState?: BadgeState
}

function normalizeMealCollapseByDate(
  raw?: Record<string, string[]>,
): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string[]> = {}
  for (const [date, meals] of Object.entries(raw)) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    if (!Array.isArray(meals)) continue
    const names = meals.filter((m): m is string => typeof m === 'string' && m.length > 0)
    if (names.length > 0) out[date] = names
  }
  return out
}

function normalizePersistedState(persisted: PersistedSlice): PersistedSlice {
  const week = getWeekRange()
  const meals = normalizeMeals(persisted.settings?.meals)
  const dailyLogs = sanitizeOrphanedMealAssignments(
    Object.fromEntries(
      Object.entries(persisted.dailyLogs ?? {}).map(([date, log]) => [
        date,
        {
          ...log,
          weightKg:
            log.weightKg != null && Number.isFinite(log.weightKg) && log.weightKg > 0
              ? log.weightKg
              : undefined,
        },
      ]),
    ),
    meals,
  )

  const { goalMode: _removedGoalMode, ...persistedSettings } = {
    ...(persisted.settings ?? {}),
  } as Settings & { goalMode?: string }

  const settings = {
      ...defaultSettings,
      ...persistedSettings,
      goalTemplates:
        persisted.settings?.goalTemplates?.length
          ? persisted.settings.goalTemplates.map((g) => ({
              ...g,
              targetDeficit:
                g.targetDeficit != null && g.targetDeficit !== 0
                  ? g.targetDeficit
                  : undefined,
            }))
          : defaultSettings.goalTemplates,
      defaultTemplateId:
        persisted.settings?.defaultTemplateId ?? defaultSettings.defaultTemplateId,
      theme: persisted.settings?.theme ?? defaultSettings.theme,
      accentColor: persisted.settings?.accentColor ?? defaultSettings.accentColor,
      secondaryTextColor:
        persisted.settings?.secondaryTextColor ?? defaultSettings.secondaryTextColor,
      weightUnit: normalizeWeightUnit(persisted.settings?.weightUnit),
      meals,
      defaultMeal: normalizeMealName(persisted.settings?.defaultMeal, meals),
      targetWeightKg:
        persisted.settings?.targetWeightKg != null &&
        Number.isFinite(persisted.settings.targetWeightKg) &&
        persisted.settings.targetWeightKg > 0
          ? persisted.settings.targetWeightKg
          : undefined,
      trackCurrentWeight: persisted.settings?.trackCurrentWeight !== false,
      trackBurnedCalories: persisted.settings?.trackBurnedCalories !== false,
    } as Settings

  return {
    ...persisted,
    settings,
    dailyLogs: snapshotLogsGoalTemplates(dailyLogs, settings),
    customCategories: Array.isArray(persisted.customCategories)
      ? persisted.customCategories
      : [],
    foodLibrary: (persisted.foodLibrary ?? []).map((item) =>
      normalizeLibraryItem(item, persisted.foodLibrary),
    ),
    mealCollapseByDate: normalizeMealCollapseByDate(persisted.mealCollapseByDate),

    statsRangeStart: persisted.statsRangeStart ?? week.start,
    statsRangeEnd: persisted.statsRangeEnd ?? week.end,
    badgeState: normalizeBadgeState(persisted.badgeState),
    currentTab:
      persisted.currentTab === 'daily' ||
      persisted.currentTab === 'library' ||
      persisted.currentTab === 'stats' ||
      persisted.currentTab === 'badges' ||
      persisted.currentTab === 'settings'
        ? persisted.currentTab
        : 'daily',
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
  /** Collapsed meal category names keyed by calendar date (yyyy-MM-dd) */
  mealCollapseByDate: Record<string, string[]>
  currentDate: string
  currentTab: AppTab
  librarySegment: 'items' | 'categories' | 'recipes'
  statsPeriod: 'week' | 'month' | 'custom'
  statsRangeStart: string
  statsRangeEnd: string
  statsView: 'overview' | 'trends' | 'breakdowns'
  statsAnchorDate: string
  /** Hide bottom nav while Library search is active (focused or filtering) */
  librarySearchEngaged: boolean
  /** Hide bottom nav while any text input is focused (keyboard open) */
  inputFocusEngaged: boolean
  /** Transient: Library "Add to Today" hands off to Daily add flow */
  pendingLibraryFoodId: string | null
  /** Food library item IDs marked as favorites for quick add */
  favoriteFoodIds: string[]
  /** Recent search queries for Library and Food Picker */
  recentFoodSearches: { library: string[]; picker: string[] }
  badgeState: BadgeState
  highlightedBadgeId: BadgeId | null
  openBadgeDetailId: BadgeId | null

  setHasHydrated: (v: boolean) => void
  setHighlightedBadgeId: (id: BadgeId | null) => void
  setOpenBadgeDetailId: (id: BadgeId | null) => void
  initializeBadges: () => void
  evaluateBadges: (silent?: boolean) => void
  markBadgesViewed: () => void
  setCurrentTab: (tab: AppTab) => void
  setLibrarySearchEngaged: (v: boolean) => void
  setInputFocusEngaged: (v: boolean) => void
  setPendingLibraryFoodId: (id: string | null) => void
  setCurrentDate: (date: string) => void
  setLibrarySegment: (s: 'items' | 'categories' | 'recipes') => void
  setStatsPeriod: (p: 'week' | 'month' | 'custom') => void
  setStatsRange: (start: string, end: string) => void
  setStatsView: (v: 'overview' | 'trends' | 'breakdowns') => void
  setStatsAnchorDate: (d: string) => void

  getDailyLog: (date?: string) => DailyLog
  updateDailyLog: (date: string, patch: Partial<DailyLog>) => void
  addLoggedFood: (logged: Omit<LoggedFood, 'id'>, date?: string) => void
  updateLoggedFood: (loggedId: string, patch: Partial<LoggedFood>, date?: string) => void
  bulkUpdateLoggedFoodMeal: (loggedIds: string[], meal: string, date?: string) => void
  bulkRemoveLoggedFood: (loggedIds: string[], date?: string) => void
  removeLoggedFood: (loggedId: string, date?: string) => void
  setBurnedCalories: (value: number, date?: string) => void
  setDailyWeight: (weightKg: number | undefined, date?: string) => void
  setDailyNote: (note: string, date?: string) => void
  toggleMealCollapsed: (meal: string, date?: string) => void
  duplicatePreviousDayLog: (date?: string) => number | null
  toggleFavoriteFood: (foodId: string) => void

  loadSeedLibrary: () => void
  mergeFoodLibrary: (items: FoodItem[], replace?: boolean) => void
  addFoodItem: (item: Omit<FoodItem, 'id' | 'lastUsed' | 'timesUsed'>) => string
  updateFoodItem: (id: string, patch: Partial<FoodItem>) => void
  deleteFoodItems: (ids: string[]) => void
  touchFoodUsage: (foodId: string) => void

  addLibraryCategory: (name: string) => boolean
  renameLibraryCategory: (oldName: string, newName: string) => boolean
  removeLibraryCategory: (name: string) => void
  deleteLibraryCategory: (name: string, deleteItems: boolean) => void
  applyCategoryMembership: (
    category: string,
    addIds: string[],
    removeIds: string[],
  ) => void
  getAllLibraryCategories: () => string[]

  updateSettings: (patch: Partial<Settings>) => void
  addMeal: (name: string) => boolean
  renameMeal: (from: string, to: string) => boolean
  removeMeal: (name: string) => boolean
  reorderMeals: (fromIndex: number, toIndex: number) => void
  recordFoodSearch: (scope: 'library' | 'picker', query: string) => void
  clearRecentFoodSearches: (scope: 'library' | 'picker') => void
  addGoalTemplate: (t: Omit<GoalTemplate, 'id'>) => string
  updateGoalTemplate: (id: string, patch: Partial<GoalTemplate>) => void
  deleteGoalTemplate: (id: string) => void
  restoreFullBackup: (backup: {
    settings?: Settings
    foodLibrary?: FoodItem[]
    dailyLogs?: Record<string, DailyLog>
    customCategories?: string[]
    badgeState?: BadgeState
  }) => void
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
      mealCollapseByDate: {},
      currentDate: todayString(),
      currentTab: 'daily',
      librarySegment: 'items',
      statsPeriod: 'week',
      statsRangeStart: getWeekRange().start,
      statsRangeEnd: getWeekRange().end,
      statsView: 'overview',
      statsAnchorDate: todayString(),
      librarySearchEngaged: false,
      inputFocusEngaged: false,
      pendingLibraryFoodId: null,
      favoriteFoodIds: [],
      recentFoodSearches: { ...EMPTY_RECENT_SEARCHES },
      badgeState: createEmptyBadgeState(),
      highlightedBadgeId: null,
      openBadgeDetailId: null,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setHighlightedBadgeId: (id) => set({ highlightedBadgeId: id }),
      setOpenBadgeDetailId: (id) => set({ openBadgeDetailId: id }),

      initializeBadges: () => {
        const state = get()
        if (state.badgeState.initialized) return
        const awards = scanAllBadgeInstances({
          dailyLogs: state.dailyLogs,
          foodLibrary: state.foodLibrary,
          settings: state.settings,
          badgeState: state.badgeState,
          favoriteFoodIds: state.favoriteFoodIds,
        })
        const { nextState, newBadgeIds } = applyBadgeAwards(state.badgeState, awards)
        const withUnviewed = appendUnviewedBadges(
          { ...nextState, initialized: true },
          newBadgeIds,
        )
        set({ badgeState: withUnviewed })
      },

      evaluateBadges: (silent = false) => {
        runBadgeEvaluation(get, set, { silent })
      },

      markBadgesViewed: () => {
        const { badgeState } = get()
        if (badgeState.unviewedBadgeIds.length === 0) return
        set({
          badgeState: { ...badgeState, unviewedBadgeIds: [] },
        })
      },
      setCurrentTab: (tab) =>
        set({
          currentTab: tab,
          librarySearchEngaged:
            tab === 'library' ? get().librarySearchEngaged : false,
        }),
      setLibrarySearchEngaged: (v) => set({ librarySearchEngaged: v }),
      setInputFocusEngaged: (v) => set({ inputFocusEngaged: v }),
      setPendingLibraryFoodId: (id) => set({ pendingLibraryFoodId: id }),
      setCurrentDate: (date) => set({ currentDate: date }),
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
        const settings = get().settings
        const logs = { ...get().dailyLogs }
        const base =
          logs[date] ?? createEmptyLog(date, settings.defaultTemplateId)
        let next: DailyLog = { ...base, ...patch, date }

        if ('goalTemplateId' in patch && patch.goalTemplateId) {
          const template = findGoalTemplateById(settings, patch.goalTemplateId)
          if (template) {
            next.goalSnapshot = snapshotGoalTemplate(template)
          }
        } else if (!next.goalSnapshot) {
          next = ensureGoalSnapshot(next, settings)
        }

        logs[date] = next
        set({ dailyLogs: logs })
        get().evaluateBadges()
      },

      addLoggedFood: (logged, date) => {
        const d = date ?? get().currentDate
        const log = get().getDailyLog(d)
        const meals = normalizeMeals(get().settings.meals)
        const entry: LoggedFood = {
          ...logged,
          id: generateId(),
          meal: resolveLoggedMeal(logged.meal, meals),
        }
        get().touchFoodUsage(logged.foodId)
        get().updateDailyLog(d, { foods: [...log.foods, entry] })
      },

      updateLoggedFood: (loggedId, patch, date) => {
        const d = date ?? get().currentDate
        const log = get().getDailyLog(d)
        const meals = normalizeMeals(get().settings.meals)
        get().updateDailyLog(d, {
          foods: log.foods.map((f) => {
            if (f.id !== loggedId) return f
            const next = { ...f, ...patch }
            if ('meal' in patch) {
              next.meal = resolveLoggedMeal(patch.meal, meals)
            }
            return next
          }),
        })
      },

      bulkUpdateLoggedFoodMeal: (loggedIds, meal, date) => {
        const d = date ?? get().currentDate
        const log = get().getDailyLog(d)
        const meals = normalizeMeals(get().settings.meals)
        const tag = resolveLoggedMeal(meal, meals) ?? meal.trim()
        const idSet = new Set(loggedIds)
        get().updateDailyLog(d, {
          foods: log.foods.map((f) =>
            idSet.has(f.id) ? { ...f, meal: tag } : f,
          ),
        })
      },

      duplicatePreviousDayLog: (date) => {
        const d = date ?? get().currentDate
        const prevDate = shiftDate(d, -1)
        const prevLog = get().dailyLogs[prevDate]
        if (!prevLog || prevLog.foods.length === 0) return null

        const log = get().getDailyLog(d)
        const meals = normalizeMeals(get().settings.meals)
        const copied = prevLog.foods.map((entry) => {
          get().touchFoodUsage(entry.foodId)
          return {
            ...entry,
            id: generateId(),
            meal: resolveLoggedMeal(entry.meal, meals),
          }
        })

        get().updateDailyLog(d, {
          foods: [...log.foods, ...copied],
          note: log.note.trim() ? log.note : prevLog.note,
        })
        return copied.length
      },

      toggleFavoriteFood: (foodId) => {
        const current = get().favoriteFoodIds
        const next = current.includes(foodId)
          ? current.filter((id) => id !== foodId)
          : [...current, foodId]
        set({ favoriteFoodIds: next })
        get().evaluateBadges()
      },

      bulkRemoveLoggedFood: (loggedIds, date) => {
        const d = date ?? get().currentDate
        const log = get().getDailyLog(d)
        const idSet = new Set(loggedIds)
        get().updateDailyLog(d, {
          foods: log.foods.filter((f) => !idSet.has(f.id)),
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

      setDailyWeight: (weightKg, date) => {
        const d = date ?? get().currentDate
        get().updateDailyLog(d, {
          weightKg:
            weightKg != null && Number.isFinite(weightKg) && weightKg > 0
              ? weightKg
              : undefined,
        })
      },

      setDailyNote: (note, date) => {
        const d = date ?? get().currentDate
        get().updateDailyLog(d, { note })
      },

      toggleMealCollapsed: (meal, date) => {
        const d = date ?? get().currentDate
        const name = meal.trim()
        if (!name) return
        set((state) => {
          const prev = state.mealCollapseByDate[d] ?? EMPTY_COLLAPSED_MEALS
          const nextSet = new Set(prev)
          if (nextSet.has(name)) nextSet.delete(name)
          else nextSet.add(name)
          const nextList = [...nextSet]
          const mealCollapseByDate = { ...state.mealCollapseByDate }
          if (nextList.length === 0) delete mealCollapseByDate[d]
          else mealCollapseByDate[d] = nextList
          return { mealCollapseByDate }
        })
      },

      loadSeedLibrary: () => {
        const lib = SEED_LIBRARY.map((item: FoodItem) =>
          item.isRecipe && item.recipeComponents
            ? enrichRecipe(normalizeScaleFoodItem(item), SEED_LIBRARY)
            : normalizeScaleFoodItem(item),
        )
        set({ foodLibrary: lib })
        get().evaluateBadges()
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
          get().evaluateBadges()
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
        get().evaluateBadges()
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
        get().evaluateBadges()
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

      deleteLibraryCategory: (name, deleteItems) => {
        if (deleteItems) {
          const ids = itemsInCategory(get().foodLibrary, name).map((f) => f.id)
          if (ids.length > 0) {
            set({
              foodLibrary: get().foodLibrary.filter((f) => !ids.includes(f.id)),
            })
          }
        }
        get().removeLibraryCategory(name)
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

      addMeal: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return false
        const meals = normalizeMeals(get().settings.meals)
        if (meals.some((m) => m.toLowerCase() === trimmed.toLowerCase())) return false
        set({
          settings: {
            ...get().settings,
            meals: [...meals, trimmed],
          },
        })
        return true
      },

      renameMeal: (from, to) => {
        const trimmed = to.trim()
        if (!trimmed || from.toLowerCase() === trimmed.toLowerCase()) return false
        const meals = normalizeMeals(get().settings.meals)
        if (!meals.some((m) => m.toLowerCase() === from.toLowerCase())) return false
        if (meals.some((m) => m.toLowerCase() === trimmed.toLowerCase())) return false

        const renameMap = new Map([[from.toLowerCase(), trimmed]])
        const nextMeals = meals.map((m) =>
          m.toLowerCase() === from.toLowerCase() ? trimmed : m,
        )
        const defaultMeal =
          get().settings.defaultMeal.toLowerCase() === from.toLowerCase()
            ? trimmed
            : get().settings.defaultMeal

        const dailyLogs = Object.fromEntries(
          Object.entries(get().dailyLogs).map(([date, log]) => [
            date,
            {
              ...log,
              foods: remapMealReferences(log.foods, renameMap, new Set()),
            },
          ]),
        )

        const mealCollapseByDate = Object.fromEntries(
          Object.entries(get().mealCollapseByDate).map(([date, collapsed]) => [
            date,
            remapCollapsedMeals(collapsed, renameMap, new Set()),
          ]),
        )

        set({
          settings: { ...get().settings, meals: nextMeals, defaultMeal },
          dailyLogs,
          mealCollapseByDate,
        })
        return true
      },

      reorderMeals: (fromIndex, toIndex) => {
        const meals = normalizeMeals(get().settings.meals)
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= meals.length ||
          toIndex >= meals.length ||
          fromIndex === toIndex
        ) {
          return
        }
        const next = [...meals]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        set({
          settings: {
            ...get().settings,
            meals: next,
            defaultMeal: next.includes(get().settings.defaultMeal)
              ? get().settings.defaultMeal
              : next[0],
          },
        })
      },

      removeMeal: (name) => {
        const meals = normalizeMeals(get().settings.meals)
        if (meals.length <= 1) return false
        const key = name.trim().toLowerCase()
        if (!key) return false
        const nextMeals = meals.filter((m) => m.toLowerCase() !== key)
        if (nextMeals.length === meals.length) return false

        const removedKeys = new Set([key])
        const dailyLogs = uncategorizeMealFromDailyLogs(get().dailyLogs, name)
        if (!dailyLogs) return false

        const defaultMeal = nextMeals.includes(get().settings.defaultMeal)
          ? get().settings.defaultMeal
          : nextMeals[0]

        const mealCollapseByDate = Object.fromEntries(
          Object.entries(get().mealCollapseByDate).map(([date, collapsed]) => [
            date,
            remapCollapsedMeals(collapsed, new Map(), removedKeys),
          ]),
        )

        set({
          settings: { ...get().settings, meals: nextMeals, defaultMeal },
          dailyLogs,
          mealCollapseByDate,
        })
        return true
      },

      recordFoodSearch: (scope, query) => {
        const current = get().recentFoodSearches
        set({
          recentFoodSearches: {
            ...current,
            [scope]: pushRecentSearch(current[scope], query),
          },
        })
      },

      clearRecentFoodSearches: (scope) => {
        set({
          recentFoodSearches: {
            ...get().recentFoodSearches,
            [scope]: [],
          },
        })
      },

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

      restoreFullBackup: (backup) => {
        const normalized = normalizePersistedState({
          settings: backup.settings,
          foodLibrary: backup.foodLibrary,
          dailyLogs: backup.dailyLogs,
          customCategories: backup.customCategories,
          badgeState: backup.badgeState,
        })
        const lib = normalized.foodLibrary ?? []
        set({
          settings: (normalized.settings ?? defaultSettings) as Settings,
          foodLibrary: lib,
          customCategories: normalized.customCategories ?? [],
          dailyLogs: normalized.dailyLogs ?? {},
          badgeState: normalized.badgeState ?? createEmptyBadgeState(),
        })
      },

      factoryReset: () => {
        set({
          settings: defaultSettings,
          foodLibrary: [],
          customCategories: [],
          dailyLogs: {},
          mealCollapseByDate: {},
          favoriteFoodIds: [],
          recentFoodSearches: { ...EMPTY_RECENT_SEARCHES },
          badgeState: { initialized: true, progress: {}, unviewedBadgeIds: [] },
          highlightedBadgeId: null,
          openBadgeDetailId: null,
          currentDate: todayString(),
          currentTab: 'daily',
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
        mealCollapseByDate: state.mealCollapseByDate,
        currentDate: state.currentDate,
        currentTab: state.currentTab,
        librarySegment: state.librarySegment,
        statsPeriod: state.statsPeriod,
        statsRangeStart: state.statsRangeStart,
        statsRangeEnd: state.statsRangeEnd,
        statsView: state.statsView,
        statsAnchorDate: state.statsAnchorDate,
        favoriteFoodIds: state.favoriteFoodIds,
        recentFoodSearches: state.recentFoodSearches,
        badgeState: state.badgeState,
      }),
      migrate: (persisted: unknown, version) => {
        const raw = (persisted ?? {}) as PersistedSlice
        if (version < 13) {
          raw.badgeState = normalizeBadgeState(raw.badgeState)
        }
        if (version < 11) {
          const settings = {
            ...defaultSettings,
            ...(raw.settings ?? {}),
          } as Settings
          raw.dailyLogs = snapshotLogsGoalTemplates(raw.dailyLogs ?? {}, settings)
        }
        if (version < 10) {
          const meals = normalizeMeals(raw.settings?.meals)
          raw.dailyLogs = sanitizeOrphanedMealAssignments(raw.dailyLogs ?? {}, meals)
        }
        if (version < 9) {
          raw.recentFoodSearches = {
            library: Array.isArray(raw.recentFoodSearches?.library)
              ? raw.recentFoodSearches.library.filter(
                  (s): s is string => typeof s === 'string',
                )
              : [],
            picker: Array.isArray(raw.recentFoodSearches?.picker)
              ? raw.recentFoodSearches.picker.filter(
                  (s): s is string => typeof s === 'string',
                )
              : [],
          }
        }
        if (version < 8) {
          raw.favoriteFoodIds = Array.isArray(raw.favoriteFoodIds)
            ? raw.favoriteFoodIds.filter((id): id is string => typeof id === 'string')
            : []
        }
        if (version < 6 && raw.settings) {
          const tw = raw.settings.targetWeightKg
          raw.settings = {
            ...raw.settings,
            targetWeightKg:
              tw != null && Number.isFinite(tw) && tw > 0 ? tw : undefined,
          }
        }
        if (version < 5 && raw.settings) {
          const meals = normalizeMeals(raw.settings.meals)
          raw.settings = {
            ...raw.settings,
            meals,
            defaultMeal: normalizeMealName(raw.settings.defaultMeal, meals),
          }
        }
        if (version < 4 && raw.settings) {
          raw.settings = {
            ...raw.settings,
            weightUnit: normalizeWeightUnit(raw.settings.weightUnit),
          }
        }
        if (version < 3 && raw.settings?.goalTemplates) {
          raw.settings = {
            ...raw.settings,
            goalTemplates: raw.settings.goalTemplates.map((g) => ({
              ...g,
              targetDeficit:
                g.targetDeficit != null && g.targetDeficit > 0
                  ? -g.targetDeficit
                  : g.targetDeficit,
            })),
          }
        }
        return normalizePersistedState(raw)
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const normalized = normalizePersistedState({
          settings: state.settings,
          foodLibrary: state.foodLibrary,
          customCategories: state.customCategories,
          dailyLogs: state.dailyLogs,
          badgeState: state.badgeState,
          currentDate: state.currentDate,
          currentTab: state.currentTab,
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
        state.badgeState = normalized.badgeState ?? createEmptyBadgeState()
        if (normalized.statsRangeStart) state.statsRangeStart = normalized.statsRangeStart
        if (normalized.statsRangeEnd) state.statsRangeEnd = normalized.statsRangeEnd
        const view = state.statsView as string
        if (
          view === 'table' ||
          view === 'charts' ||
          view === 'overview' ||
          view === 'trends' ||
          view === 'breakdowns' ||
          view === 'weight'
        ) {
          state.statsView =
            view === 'table'
              ? 'overview'
              : view === 'charts' || view === 'weight'
                ? 'trends'
                : (view as 'overview' | 'trends' | 'breakdowns')
        } else {
          state.statsView = 'overview'
        }
        state.setHasHydrated(true)
      },
    },
  ),
)