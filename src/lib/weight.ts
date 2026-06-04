export type WeightUnit = 'lbs' | 'kg'

export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'lbs'

const LBS_PER_KG = 2.2046226218

export function normalizeWeightUnit(value: unknown): WeightUnit {
  return value === 'kg' ? 'kg' : 'lbs'
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'kg' ? 'kg' : 'lbs'
}

/** Convert display-unit value to kg for storage. */
export function weightToKg(value: number, unit: WeightUnit): number {
  if (unit === 'kg') return value
  return value / LBS_PER_KG
}

/** Convert stored kg to display unit. */
export function weightFromKg(kg: number, unit: WeightUnit): number {
  if (unit === 'kg') return kg
  return kg * LBS_PER_KG
}

export function formatWeight(kg: number | undefined, unit: WeightUnit, decimals = 1): string {
  if (kg == null || !Number.isFinite(kg)) return ''
  const v = weightFromKg(kg, unit)
  return `${v.toFixed(decimals)} ${weightUnitLabel(unit)}`
}

export function parseWeightInput(raw: string, unit: WeightUnit): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  const n = parseFloat(trimmed)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return weightToKg(n, unit)
}