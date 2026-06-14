import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Info,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { InsightBullet, InsightSummary, InsightTone } from '@/lib/stats'
import { cn } from '@/lib/utils'

const TONE_STYLES: Record<InsightTone, { iconClass: string; rowClass: string }> = {
  positive: {
    iconClass: 'text-emerald-400',
    rowClass: 'border-emerald-500/20 bg-emerald-500/5',
  },
  warning: {
    iconClass: 'text-amber-400',
    rowClass: 'border-amber-500/25 bg-amber-500/5',
  },
  neutral: {
    iconClass: 'text-muted-foreground',
    rowClass: 'border-border/60 bg-secondary/30',
  },
}

function bulletIcon(id: string, tone: InsightTone): LucideIcon {
  if (id === 'streak') return Flame
  if (id === 'protein') return Target
  if (id.startsWith('net')) return TrendingUp
  if (id === 'intake') return Utensils
  if (id === 'range') return TrendingDown
  if (tone === 'positive') return CheckCircle2
  if (tone === 'warning') return AlertTriangle
  return Info
}

function InsightRow({ bullet }: { bullet: InsightBullet }) {
  const tone = TONE_STYLES[bullet.tone]
  const Icon = bulletIcon(bullet.id, bullet.tone)

  return (
    <li
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5',
        tone.rowClass,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.iconClass)} aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">{bullet.text}</p>
    </li>
  )
}

interface InsightsCardProps {
  summary: InsightSummary
}

export function InsightsCard({ summary }: InsightsCardProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-b from-primary/8 to-card">
      <CardContent className="space-y-4 pt-4 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Insights
          </p>
          <p className="mt-1.5 text-base font-medium leading-snug text-foreground">
            {summary.headline}
          </p>
        </div>

        <ul className="space-y-2">
          {summary.bullets.map((bullet) => (
            <InsightRow key={bullet.id} bullet={bullet} />
          ))}
        </ul>

        <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Key takeaway
            </p>
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">{summary.takeaway}</p>
        </div>
      </CardContent>
    </Card>
  )
}