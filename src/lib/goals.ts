import type { DailyLog, GoalTemplate, Settings } from '@/lib/types'

/** Frozen goal values captured when a day is first logged or when its template is changed. */
export type GoalSnapshot = GoalTemplate

export function snapshotGoalTemplate(template: GoalTemplate): GoalSnapshot {
  return {
    id: template.id,
    name: template.name,
    calories: template.calories,
    targetDeficit: template.targetDeficit,
    protein: template.protein,
    carbs: template.carbs,
    fat: template.fat,
    fiber: template.fiber,
    sugars: template.sugars,
  }
}

export function resolveDefaultGoalTemplate(settings: Settings): GoalTemplate {
  return (
    settings.goalTemplates.find((g) => g.id === settings.defaultTemplateId) ??
    settings.goalTemplates[0]
  )
}

export function findGoalTemplateById(
  settings: Settings,
  templateId: string,
): GoalTemplate | undefined {
  return settings.goalTemplates.find((g) => g.id === templateId)
}

/** Goal used for a day's stats and adherence — prefers the frozen snapshot over live templates. */
export function resolveGoalForLog(log: DailyLog, settings: Settings): GoalTemplate {
  if (log.goalSnapshot) return log.goalSnapshot
  const defaultGoal = resolveDefaultGoalTemplate(settings)
  return findGoalTemplateById(settings, log.goalTemplateId) ?? defaultGoal
}

export function ensureGoalSnapshot(log: DailyLog, settings: Settings): DailyLog {
  if (log.goalSnapshot) return log
  const template = resolveGoalForLog(log, settings)
  return { ...log, goalSnapshot: snapshotGoalTemplate(template) }
}

export function snapshotLogsGoalTemplates(
  dailyLogs: Record<string, DailyLog>,
  settings: Settings,
): Record<string, DailyLog> {
  const next: Record<string, DailyLog> = {}
  for (const [date, log] of Object.entries(dailyLogs)) {
    next[date] =
      log.foods.length > 0 || log.goalSnapshot
        ? ensureGoalSnapshot(log, settings)
        : log
  }
  return next
}