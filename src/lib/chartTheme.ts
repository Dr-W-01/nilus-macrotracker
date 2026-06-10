/** Shared Recharts styling — reads CSS variables from globals.css for light/dark. */
export const CHART_GRID_STROKE = 'var(--chart-grid)'
export const CHART_AXIS_STROKE = 'var(--chart-axis)'
export const CHART_REFERENCE_STROKE = 'var(--chart-reference)'
export const CHART_GOAL_INTAKE = 'var(--chart-goal-intake)'
export const CHART_GOAL_NET = 'var(--chart-goal-net)'
export const CHART_TREND_LINE = 'var(--chart-trend-line)'
export const CHART_DEFICIT_BAR = 'var(--chart-deficit-bar)'

export const chartTooltipStyle: Record<string, string | number> = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  color: 'var(--chart-tooltip-text)',
  borderRadius: '8px',
  fontSize: 12,
}