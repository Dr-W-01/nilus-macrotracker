export type MacroNutrientKey = 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugars'

/** Canonical display order for macros across the app. */
export const MACRO_NUTRIENT_ORDER: readonly MacroNutrientKey[] = [
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugars',
] as const

/** Nutrition-label order for food edit/add forms only — not for display elsewhere. */
export const FORM_MACRO_NUTRIENT_ORDER: readonly MacroNutrientKey[] = [
  'fat',
  'carbs',
  'fiber',
  'sugars',
  'protein',
] as const

export const MACRO_DISPLAY_LABELS: Record<MacroNutrientKey, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sugars: 'Sugars',
}

export const MACRO_SHORT_LABELS: Record<MacroNutrientKey, 'P' | 'C' | 'F' | 'Fib' | 'S'> = {
  protein: 'P',
  carbs: 'C',
  fat: 'F',
  fiber: 'Fib',
  sugars: 'S',
}

/** Chart stroke/fill colors — distinct in dark mode (protein orange vs fiber emerald). */
export const MACRO_CHART_COLORS: Record<MacroNutrientKey, string> = {
  protein: '#f97316',
  carbs: '#3b82f6',
  fat: '#a855f7',
  fiber: '#10b981',
  sugars: '#ec4899',
}

/** Tailwind classes for macro labels on the Daily tab and elsewhere. */
export const MACRO_LABEL_TAILWIND: Record<'P' | 'C' | 'F' | 'Fib' | 'S', string> = {
  P: 'font-semibold text-orange-400',
  C: 'font-semibold text-blue-400',
  F: 'font-semibold text-purple-400',
  Fib: 'font-semibold text-emerald-500',
  S: 'font-semibold text-pink-400',
}

export function macroChartColor(key: MacroNutrientKey): string {
  return MACRO_CHART_COLORS[key]
}

export function macroMetricOptions(): { key: MacroNutrientKey; label: string }[] {
  return MACRO_NUTRIENT_ORDER.map((key) => ({
    key,
    label: MACRO_DISPLAY_LABELS[key],
  }))
}