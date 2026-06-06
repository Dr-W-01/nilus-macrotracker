export type MacroNutrientKey = 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugars'

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