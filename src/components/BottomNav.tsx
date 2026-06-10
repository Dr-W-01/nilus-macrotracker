import { CalendarDays, BarChart3, BookOpen, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { todayString } from '@/lib/dates'
import type { AppTab } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

const TABS: { id: AppTab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'daily', label: 'Daily', icon: CalendarDays },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const currentTab = useMacroStore((s) => s.currentTab)
  const inputFocusEngaged = useMacroStore((s) => s.inputFocusEngaged)
  const setCurrentTab = useMacroStore((s) => s.setCurrentTab)
  const setCurrentDate = useMacroStore((s) => s.setCurrentDate)

  if (inputFocusEngaged) {
    return null
  }

  return (
    <nav
      className="z-50 shrink-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 safe-bottom"
      style={{ paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = currentTab === id
          return (
            <button
              key={id}
              type="button"
              className={cn(
                'flex min-h-[56px] min-w-[72px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
              onClick={() => {
                if (active) {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                  if (id === 'daily') {
                    setCurrentDate(todayString())
                  }
                  setCurrentTab(id)
                }
              }}
            >
              <Icon className={cn('h-6 w-6', active && 'stroke-[2.5]')} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}