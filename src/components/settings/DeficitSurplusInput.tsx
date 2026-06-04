import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  combineTargetDeficit,
  splitTargetDeficit,
  type EnergyBalanceMode,
} from '@/lib/energyBalanceGoal'
import { cn } from '@/lib/utils'

interface DeficitSurplusInputProps {
  value?: number
  onChange: (value: number | undefined) => void
  className?: string
}

export function DeficitSurplusInput({
  value,
  onChange,
  className,
}: DeficitSurplusInputProps) {
  const initial = splitTargetDeficit(value)
  const [mode, setMode] = useState<EnergyBalanceMode>(initial.mode)
  const [amount, setAmount] = useState(initial.amount)

  const apply = (nextMode: EnergyBalanceMode, nextAmount: string) => {
    const digitsOnly = nextAmount.replace(/[^\d.]/g, '')
    const parts = digitsOnly.split('.')
    const sanitized =
      parts.length <= 1 ? digitsOnly : `${parts[0]}.${parts.slice(1).join('')}`
    setMode(nextMode)
    setAmount(sanitized)
    onChange(combineTargetDeficit(nextMode, sanitized))
  }

  const setBalanceMode = (nextMode: EnergyBalanceMode) => {
    apply(nextMode, amount)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/50 p-1"
        role="group"
        aria-label="Deficit or surplus"
      >
        <Button
          type="button"
          size="sm"
          variant={mode === 'deficit' ? 'default' : 'ghost'}
          className="h-10"
          onClick={() => setBalanceMode('deficit')}
        >
          Deficit
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'surplus' ? 'default' : 'ghost'}
          className="h-10"
          onClick={() => setBalanceMode('surplus')}
        >
          Surplus
        </Button>
      </div>
      <Input
        type="number"
        min={0}
        inputMode="decimal"
        enterKeyHint="done"
        placeholder={mode === 'deficit' ? 'e.g. 1000' : 'e.g. 500'}
        value={amount}
        onChange={(e) => apply(mode, e.target.value)}
      />
      {(() => {
        const stored = combineTargetDeficit(mode, amount)
        if (stored == null) return null
        return (
          <p className="text-[10px] text-muted-foreground">
            Saved as{' '}
            <span className="text-foreground font-medium tabular-nums">
              {stored > 0 ? '+' : ''}
              {stored} cal/day
            </span>{' '}
            ({mode} goal)
          </p>
        )
      })()}
    </div>
  )
}