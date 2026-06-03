import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'

interface NetCaloriesSparklineProps {
  data: { net: number }[]
  color: string
}

export function NetCaloriesSparkline({ data, color }: NetCaloriesSparklineProps) {
  if (data.length === 0) return null

  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="net"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}