import type { Settings } from '@/lib/types'

/** Defaults to true when unset so existing installs keep current behavior. */
export function isTrackBurnedCaloriesEnabled(settings: Settings): boolean {
  return settings.trackBurnedCalories !== false
}

/** Defaults to true when unset so existing installs keep current behavior. */
export function isTrackCurrentWeightEnabled(settings: Settings): boolean {
  return settings.trackCurrentWeight !== false
}