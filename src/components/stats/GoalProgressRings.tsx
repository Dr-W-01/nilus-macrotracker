import { roundMacro } from '@/lib/macros'

interface GoalProgressRingsProps {
  calories: { current: number; goal: number }
  protein: { current: number; goal: number }
}

function ringStrokeColor(percent: number, metric: 'calories' | 'protein'): string {
  if (metric === 'protein') {
    if (percent >= 100) return 'stroke-emerald-500'
    if (percent >= 70) return 'stroke-amber-400'
    return 'stroke-red-500'
  }
  if (percent >= 85 && percent <= 115) return 'stroke-emerald-500'
  if (percent >= 65) return 'stroke-amber-400'
  return 'stroke-red-500'
}

function ringTextColor(percent: number, metric: 'calories' | 'protein'): string {
  if (metric === 'protein') {
    if (percent >= 100) return 'text-emerald-400'
    if (percent >= 70) return 'text-amber-400'
    return 'text-red-400'
  }
  if (percent >= 85 && percent <= 115) return 'text-emerald-400'
  if (percent >= 65) return 'text-amber-400'
  return 'text-red-400'
}

function ProgressRing({
  label,
  current,
  goal,
  unit,
  metric,
}: {
  label: string
  current: number
  goal: number
  unit: string
  metric: 'calories' | 'protein'
}) {
  const percent = goal > 0 ? (current / goal) * 100 : 0
  const displayPercent = roundMacro(percent, 0)
  const fillPercent = Math.min(100, Math.max(0, percent))
  const size = 72
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (fillPercent / 100) * circumference
  const decimals = metric === 'protein' ? 0 : 0

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-[stroke-dashoffset] duration-500 ${ringStrokeColor(percent, metric)}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-sm font-bold tabular-nums leading-none ${ringTextColor(percent, metric)}`}
          >
            {displayPercent}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {roundMacro(current, decimals)}
          {unit} / {roundMacro(goal, decimals)}
          {unit}
        </p>
      </div>
    </div>
  )
}

export function GoalProgressRings({ calories, protein }: GoalProgressRingsProps) {
  if (calories.goal <= 0 && protein.goal <= 0) return null

  return (
    <div className="flex items-start justify-center gap-8 py-1">
      {calories.goal > 0 && (
        <ProgressRing
          label="Calories"
          current={calories.current}
          goal={calories.goal}
          unit=" cal"
          metric="calories"
        />
      )}
      {protein.goal > 0 && (
        <ProgressRing
          label="Protein"
          current={protein.current}
          goal={protein.goal}
          unit="g"
          metric="protein"
        />
      )}
    </div>
  )
}