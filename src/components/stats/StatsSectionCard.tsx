import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const STATS_SECTION_CARD_CLASS =
  'border-primary/20 bg-gradient-to-b from-primary/8 to-card'

export const STATS_SECTION_CONTENT_CLASS = 'space-y-4 pt-4 pb-4'

interface StatsSectionCardProps {
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function StatsSectionCard({
  children,
  className,
  contentClassName,
}: StatsSectionCardProps) {
  return (
    <Card className={cn(STATS_SECTION_CARD_CLASS, className)}>
      <CardContent className={cn(STATS_SECTION_CONTENT_CLASS, contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

interface StatsSectionHeaderProps {
  title: string
  description?: string
  className?: string
}

export function StatsSectionHeader({
  title,
  description,
  className,
}: StatsSectionHeaderProps) {
  return (
    <div className={className}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function StatsSubsectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-muted-foreground">{children}</p>
}