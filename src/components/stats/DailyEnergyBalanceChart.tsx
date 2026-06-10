import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CHART_AXIS_STROKE,
  CHART_DEFICIT_BAR,
  CHART_GRID_STROKE,
  CHART_REFERENCE_STROKE,
  chartTooltipStyle,
} from '@/lib/chartTheme'

interface DailyEnergyBalanceChartProps {
  data: { label: string; net: number }[]
  color: string
}

export function DailyEnergyBalanceChart({ data, color }: DailyEnergyBalanceChartProps) {
  if (data.length === 0) return null

  const maxAbs = Math.max(500, ...data.map((d) => Math.abs(d.net)))

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground leading-snug">
        Each bar is <span className="text-foreground">net calories</span> for that day (food
        calories minus burned). Above zero means surplus; below zero means deficit.
      </p>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" stroke={CHART_AXIS_STROKE} fontSize={10} tickLine={false} />
            <YAxis
              stroke={CHART_AXIS_STROKE}
              fontSize={10}
              width={42}
              domain={[-maxAbs, maxAbs]}
              tickFormatter={(v) => `${v}`}
            />
            <ReferenceLine y={0} stroke={CHART_REFERENCE_STROKE} strokeWidth={1} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${value ?? 0} cal`, 'Net']}
            />
            <Bar dataKey="net" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.net >= 0 ? color : CHART_DEFICIT_BAR}
                  fillOpacity={entry.net >= 0 ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Deficit ↓</span>
        <span>0</span>
        <span>Surplus ↑</span>
      </div>
    </div>
  )
}