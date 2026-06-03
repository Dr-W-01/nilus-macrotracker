import type { FoodItem, LoggedFood } from './types'

/** Parse a numeric base serving from text like "4 oz", "85g", "3.5 oz cooked" */
export function inferBaseAmountFromServing(
  servingDesc: string,
  unit?: 'g' | 'oz',
): number {
  const ozMatch = servingDesc.match(/(\d+(?:\.\d+)?)\s*oz\b/i)
  if (ozMatch) return parseFloat(ozMatch[1])

  const gMatch = servingDesc.match(/(\d+(?:\.\d+)?)\s*g\b/i)
  if (gMatch) return parseFloat(gMatch[1])

  if (unit === 'oz' || unit === 'g') {
    const lead = servingDesc.match(/(\d+(?:\.\d+)?)/)
    if (lead) return parseFloat(lead[1])
  }

  return 1
}

export function getFoodBaseAmount(
  food: Pick<FoodItem, 'baseAmount' | 'servingDesc' | 'baseUnit' | 'unit' | 'scaleType'>,
): number {
  if (food.scaleType !== 'scale') return 1
  if (food.baseAmount != null && food.baseAmount > 0) return food.baseAmount
  return inferBaseAmountFromServing(food.servingDesc, getFoodBaseUnit(food))
}

export function getFoodBaseUnit(
  food: Pick<FoodItem, 'baseUnit' | 'unit' | 'scaleType'>,
): 'g' | 'oz' {
  if (food.scaleType !== 'scale') return 'g'
  const u = food.baseUnit ?? food.unit
  return u === 'oz' ? 'oz' : 'g'
}

export function formatBaseServing(food: FoodItem): string {
  const amount = getFoodBaseAmount(food)
  const unit = getFoodBaseUnit(food)
  return `${roundAmount(amount)} ${unit}`
}

export function servingsFromAmountEaten(baseAmount: number, amountEaten: number): number {
  if (baseAmount <= 0) return amountEaten
  return roundAmount(amountEaten / baseAmount)
}

export function amountEatenFromServings(baseAmount: number, servings: number): number {
  return roundAmount(baseAmount * servings)
}

/** Effective macro multiplier for a logged scale or count item */
export function getLoggedServingMultiplier(
  food: FoodItem,
  logged: LoggedFood,
): number {
  if (food.scaleType === 'count') {
    return Math.max(1, Math.round(logged.quantity) || 1)
  }

  const base = getFoodBaseAmount(food)

  if (logged.scaleAmountEaten != null && logged.scaleAmountEaten > 0) {
    return servingsFromAmountEaten(base, logged.scaleAmountEaten)
  }

  // Legacy: quantity stored as serving multiplier
  return logged.quantity > 0 ? logged.quantity : 1
}

export function formatServingsLabel(multiplier: number): string {
  const rounded = roundAmount(multiplier)
  if (rounded === 1) return '1 serving'
  return `${rounded} servings`
}

export function formatScaleEatenSummary(
  food: FoodItem,
  amountEaten: number,
): string {
  const unit = getFoodBaseUnit(food)
  const mult = roundAmount(servingsFromAmountEaten(getFoodBaseAmount(food), amountEaten))
  const servingPhrase = mult === 1 ? '1 × base serving' : `${mult} × base serving`
  return `${roundAmount(amountEaten)} ${unit} = ${servingPhrase}`
}

/** Daily log line, e.g. "Realgood Chicken — 8 oz" */
export function formatLoggedFoodQuantity(food: FoodItem, logged: LoggedFood): string {
  if (food.isRecipe) {
    return logged.overriddenComponents ? 'Customized recipe' : food.servingDesc
  }

  if (food.scaleType === 'scale') {
    const unit = getFoodBaseUnit(food)
    if (logged.scaleAmountEaten != null && logged.scaleAmountEaten > 0) {
      return `${roundAmount(logged.scaleAmountEaten)} ${unit}`
    }
    const base = formatBaseServing(food)
    const mult = getLoggedServingMultiplier(food, logged)
    if (mult === 1) return base
    return `${formatServingsLabel(mult)} × ${base}`
  }

  const qty = Math.max(1, Math.round(logged.quantity))
  return qty === 1 ? food.servingDesc : `${qty} × ${food.servingDesc}`
}

type ScaleFields = Pick<
  FoodItem,
  'scaleType' | 'unit' | 'baseUnit' | 'baseAmount' | 'servingDesc'
>

export function normalizeScaleFoodItem<T extends ScaleFields>(food: T): T {
  if (food.scaleType !== 'scale') return food

  const baseUnit = getFoodBaseUnit(food)
  const baseAmount =
    food.baseAmount != null && food.baseAmount > 0
      ? food.baseAmount
      : inferBaseAmountFromServing(food.servingDesc, baseUnit)

  return { ...food, unit: baseUnit, baseUnit, baseAmount }
}

export function roundAmount(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildScaleLogPayload(
  food: FoodItem,
  amountEaten: number,
): Pick<LoggedFood, 'quantity' | 'scaleAmountEaten'> {
  const base = getFoodBaseAmount(food)
  const multiplier = servingsFromAmountEaten(base, amountEaten)
  return {
    quantity: multiplier,
    scaleAmountEaten: roundAmount(amountEaten),
  }
}