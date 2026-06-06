import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  buildWeightChartData,
  countWeightLogsInRange,
  extendWeightChartRange,
  getWeightChartRange,
  weightChartAxisTick,
  WEIGHT_RANGE_OPTIONS,
  type WeightChartPoint,
  type WeightRangePreset,
} from '@/lib/weightStats'
import { weightFromKg, weightUnitLabel } from '@/lib/weight'
import type { DailyLog, Settings } from '@/lib/types'

interface TrendsWeightSectionProps {
  dailyLogs: Record<string, DailyLog>
  settings: Settings
  accentColor: string
  onDayClick: (date: string) => void
}

function WeightChartLegend({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-0.5 w-3 rounded-sm"
          style={{ backgroundColor: accentColor }}
        />
        Weight
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-0 w-3 border-t-2 border-dashed border-[#94a3b8]"
        />
        7-day avg
      </span>
    </div>
  )
}

export function TrendsWeightSection({
  dailyLogs,
  settings,
  accentColor,
  onDayClick,
}: TrendsWeightSectionProps) {
  const unit = settings.weightUnit ?? 'lbs'
  const [preset, setPreset] = useState<WeightRangePreset>('all')

  const range = useMemo(
    () => getWeightChartRange(preset, dailyLogs),
    [preset, dailyLogs],
  )

  const chartData = useMemo(() => {
    const paddedRange = extendWeightChartRange(range)
    return buildWeightChartData(paddedRange, dailyLogs, unit, 7)
  }, [range, dailyLogs, unit])

  const logCount = useMemo(
    () => countWeightLogsInRange(range, dailyLogs),
    [range, dailyLogs],
  )

  const targetDisplay =
    settings.targetWeightKg != null && settings.targetWeightKg > 0
      ? weightFromKg(settings.targetWeightKg, unit)
      : null

  const latestLogged = useMemo(() => {
    const points = chartData.filter((p) => p.weight != null)
    return points.length > 0 ? points[points.length - 1] : null
  }, [chartData])

  const spanDays = chartData.length

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 space-y-3">
        <div>
          <CardTitle className="text-sm">Weight over time</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {logCount === 0
              ? 'Log weight on the Daily tab to see your chart.'
              : `${logCount} ${logCount === 1 ? 'entry' : 'entries'} in range · gaps where no weight was logged · 7-day average always shown`}
          </p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
          {WEIGHT_RANGE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={preset === value ? 'default' : 'outline'}
              className="shrink-0 h-8 text-xs"
              onClick={() => setPreset(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        {latestLogged?.weight != null && (
          <p className="text-xs text-muted-foreground">
            Latest:{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {latestLogged.weight} {weightUnitLabel(unit)}
            </span>
            {targetDisplay != null && (
              <span className="ml-1.5">
                · Target {targetDisplay.toFixed(1)} {weightUnitLabel(unit)}
              </span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <div className="h-56 sm:h-64 min-h-[14rem]">
          {logCount === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No weight data in this range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 24, left: 4, bottom: 4 }}
                onClick={(state) => {
                  const idx =
                    typeof state?.activeTooltipIndex === 'number'
                      ? state.activeTooltipIndex
                      : -1
                  const row = chartData[idx]
                  if (row?.weight != null) onDayClick(row.date)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#888"
                  fontSize={10}
                  tickFormatter={(d) => weightChartAxisTick(String(d), spanDays)}
                  interval={spanDays <= 16 ? 0 : 'preserveStartEnd'}
                  minTickGap={8}
                  padding={{ left: 28, right: 28 }}
                />
                <YAxis
                  stroke="#888"
                  fontSize={11}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{ background: '#141414', border: '1px solid #333' }}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as WeightChartPoint | undefined
                    if (!row?.date) return ''
                    return format(parseISO(row.date), 'MMM d, yyyy')
                  }}
                  formatter={(value, name) => {
                    if (value == null || value === '') return ['—', name]
                    return [`${value} ${weightUnitLabel(unit)}`, name]
                  }}
                />
                <Legend content={<WeightChartLegend accentColor={accentColor} />} />
                {targetDisplay != null && (
                  <ReferenceLine
                    y={targetDisplay}
                    stroke="#22c55e"
                    strokeDasharray="8 4"
                    label={{
                      value: `Target ${targetDisplay.toFixed(1)}`,
                      position: 'insideTopRight',
                      fill: '#22c55e',
                      fontSize: 11,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="Weight"
                  legendType="none"
                  stroke={accentColor}
                  strokeWidth={2.5}
                  dot={{ r: 4, cursor: 'pointer' }}
                  connectNulls={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="7-day avg"
                  legendType="none"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}