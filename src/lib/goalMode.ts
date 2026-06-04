import type { GoalMode } from '@/lib/types'

export type { GoalMode }

export const GOAL_MODE_OPTIONS: { value: GoalMode; label: string }[] = [
  { value: 'cut', label: 'Cut' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'bulk', label: 'Bulk' },
]

export const DEFAULT_GOAL_MODE: GoalMode = 'cut'

export function normalizeGoalMode(value: unknown): GoalMode {
  if (value === 'cut' || value === 'maintain' || value === 'bulk') return value
  return DEFAULT_GOAL_MODE
}

export function goalModeOverviewTitle(mode: GoalMode): string {
  if (mode === 'cut') return 'Cut — deficit focus'
  if (mode === 'bulk') return 'Bulk — surplus focus'
  return 'Maintain — consistency focus'
}

export function goalModeOverviewDescription(mode: GoalMode): string {
  if (mode === 'cut') {
    return 'Overview highlights net calories and how closely you hit your deficit goal. Templates are unchanged — pick any goal profile on Daily.'
  }
  if (mode === 'bulk') {
    return 'Overview highlights net calories and surplus performance toward your bulk goal. Templates are unchanged — pick any goal profile on Daily.'
  }
  return 'Overview highlights intake and net calorie consistency. Templates are unchanged — pick any goal profile on Daily.'
}

export type TrendsMetricKey = 'net' | 'calories' | 'protein' | 'carbs' | 'fat'

export function defaultTrendMetricsForMode(mode: GoalMode): TrendsMetricKey[] {
  if (mode === 'cut' || mode === 'bulk') return ['net']
  return ['calories']
}