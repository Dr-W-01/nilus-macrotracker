import {
  MACRO_NUTRIENT_ORDER,
  MACRO_SHORT_LABELS,
} from '@/lib/macroColors'
import { getLoggedServingMultiplier } from './scale'
import type { FoodItem, LoggedFood, MacroTotals } from './types'

export const emptyMacros = (): MacroTotals => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugars: 0,
})

export function scaleMacros(
  item: Pick<
    FoodItem,
    'caloriesPerServing' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugars'
  >,
  quantity: number,
): MacroTotals {
  return {
    calories: item.caloriesPerServing * quantity,
    protein: item.protein * quantity,
    carbs: item.carbs * quantity,
    fat: item.fat * quantity,
    fiber: item.fiber * quantity,
    sugars: item.sugars * quantity,
  }
}

export function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
    sugars: a.sugars + b.sugars,
  }
}

export function computeComponentMacros(
  library: FoodItem[],
  components: { foodId: string; quantity: number }[],
): MacroTotals {
  return components.reduce((acc, comp) => {
    const food = library.find((f) => f.id === comp.foodId)
    if (!food || food.isRecipe) return acc
    return addMacros(acc, scaleMacros(food, comp.quantity))
  }, emptyMacros())
}

export function getLoggedFoodMacros(
  library: FoodItem[],
  logged: LoggedFood,
): MacroTotals {
  const food = library.find((f) => f.id === logged.foodId)
  if (!food) return emptyMacros()

  if (food.isRecipe && food.recipeComponents) {
    const components =
      logged.overriddenComponents ?? food.recipeComponents
    return computeComponentMacros(library, components)
  }

  return scaleMacros(food, getLoggedServingMultiplier(food, logged))
}

export function computeDayMacros(
  library: FoodItem[],
  foods: LoggedFood[],
): MacroTotals {
  return foods.reduce(
    (acc, logged) => addMacros(acc, getLoggedFoodMacros(library, logged)),
    emptyMacros(),
  )
}

export function roundMacro(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function formatMacroSequence(
  formatValue: (key: (typeof MACRO_NUTRIENT_ORDER)[number]) => string,
): string {
  return MACRO_NUTRIENT_ORDER.map((key) => formatValue(key)).join(' • ')
}

/** Compact macro line for logged food rows, e.g. P: 42g • C: 8g • F: 12g */
export function formatCompactMacroLine(m: MacroTotals): string {
  return formatMacroSequence(
    (key) => `${MACRO_SHORT_LABELS[key]}: ${roundMacro(m[key])}g`,
  )
}

/** Meal group header totals, e.g. Cal 620 • P 45g • C 60g • F 22g • Fib 8g • S 12g */
export function formatMealGroupTotals(m: MacroTotals): string {
  return `Cal ${roundMacro(m.calories, 0)} • ${formatMacroSequence(
    (key) => `${MACRO_SHORT_LABELS[key]} ${roundMacro(m[key])}g`,
  )}`
}