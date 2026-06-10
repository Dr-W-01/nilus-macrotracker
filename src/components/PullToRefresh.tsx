import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const PULL_THRESHOLD = 72
const MAX_PULL = 108

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void> | void
  className?: string
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const scrollRef = useRef<HTMLElement>(null)
  const startY = useRef(0)
  const pulling = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const canPull = useCallback(() => {
    const el = scrollRef.current
    return el != null && el.scrollTop <= 0
  }, [])

  const runRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
      setPull(0)
      pulling.current = false
    }
  }, [onRefresh])

  const onTouchStart = (e: TouchEvent<HTMLElement>) => {
    if (refreshing || !canPull()) return
    startY.current = e.touches[0]?.clientY ?? 0
    pulling.current = true
  }

  const onTouchMove = (e: TouchEvent<HTMLElement>) => {
    if (!pulling.current || refreshing) return
    const y = e.touches[0]?.clientY ?? 0
    const delta = y - startY.current
    if (delta <= 0) {
      setPull(0)
      return
    }
    if (!canPull()) {
      pulling.current = false
      setPull(0)
      return
    }
    e.preventDefault()
    setPull(Math.min(delta * 0.45, MAX_PULL))
  }

  const onTouchEnd = () => {
    if (!pulling.current || refreshing) return
    pulling.current = false
    if (pull >= PULL_THRESHOLD) {
      void runRefresh()
      return
    }
    setPull(0)
  }

  const progress = Math.min(pull / PULL_THRESHOLD, 1)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-30 flex items-end justify-center overflow-hidden transition-[height] duration-150',
          refreshing ? 'duration-300' : '',
        )}
        style={{ height: refreshing ? 48 : pull }}
        aria-hidden
      >
        <div
          className={cn(
            'mb-2 flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur',
            refreshing && 'text-primary',
          )}
        >
          <RefreshCw
            className={cn('h-4 w-4', refreshing && 'animate-spin')}
            style={refreshing ? undefined : { transform: `rotate(${progress * 180}deg)` }}
          />
          {refreshing ? 'Checking for updates…' : pull >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      </div>

      <main
        ref={scrollRef}
        className={cn(className, refreshing && 'pointer-events-none')}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </main>
    </div>
  )
}