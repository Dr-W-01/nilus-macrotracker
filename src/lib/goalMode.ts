import type { GoalMode, GoalTemplate } from '@/lib/types'

export type { GoalMode }

type GoalRowLike = { goal: { targetDeficit?: number } }

export function inferGoalModeFromTargetDeficit(targetDeficit?: number): GoalMode {
  if (targetDeficit == null || targetDeficit === 0) return 'maintain'
  if (targetDeficit < 0) return 'cut'
  return 'bulk'
}

export function inferGoalModeFromTemplate(template: GoalTemplate | undefined): GoalMode {
  return inferGoalModeFromTargetDeficit(template?.targetDeficit)
}

/** Infer cut / bulk / maintain from goals used on logged days in the stats period. */
export function inferGoalModeFromDayRows(rows: GoalRowLike[]): GoalMode {
  if (rows.length === 0) return 'maintain'

  let hasDeficit = false
  let hasSurplus = false

  for (const row of rows) {
    const target = row.goal.targetDeficit ?? 0
    if (target < 0) hasDeficit = true
    if (target > 0) hasSurplus = true
  }

  if (hasDeficit && !hasSurplus) return 'cut'
  if (hasSurplus && !hasDeficit) return 'bulk'
  return 'maintain'
}