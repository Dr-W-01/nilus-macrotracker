import { Award, CalendarDays, BarChart3, BookOpen, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { todayString } from '@/lib/dates'
import type { AppTab } from '@/lib/types'
import { getUnviewedBadgeCount } from '@/lib/badges/evaluate'
import { useMacroStore } from '@/store/useMacroStore'

const TABS: { id: AppTab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'daily', label: 'Daily', icon: CalendarDays },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const currentTab = useMacroStore((s) => s.currentTab)
  const inputFocusEngaged = useMacroStore((s) => s.inputFocusEngaged)
  const librarySearchEngaged = useMacroStore((s) => s.librarySearchEngaged)
  const setCurrentTab = useMacroStore((s) => s.setCurrentTab)
  const setCurrentDate = useMacroStore((s) => s.setCurrentDate)
  const badgeState = useMacroStore((s) => s.badgeState)
  const unviewedBadgeCount = getUnviewedBadgeCount(badgeState)

  const hideForKeyboard =
    inputFocusEngaged || (currentTab === 'library' && librarySearchEngaged)

  if (hideForKeyboard) {
    return null
  }

  return (
    <nav
      className="bottom-nav z-50 shrink-0 border-t border-border bg-card"
      style={{ paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}
    >
      <div className="bottom-nav-inner mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = currentTab === id
          return (
            <button
              key={id}
              type="button"
              className={cn(
                'flex min-h-[56px] min-w-[60px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors sm:min-w-[68px] sm:text-xs',
                active ? 'text-primary' : 'text-foreground/55',
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
              <span className="relative inline-flex">
                <Icon className={cn('h-6 w-6', active && 'stroke-[2.5]')} />
                {id === 'badges' && unviewedBadgeCount > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground"
                    aria-label={`${unviewedBadgeCount} new badge${unviewedBadgeCount === 1 ? '' : 's'}`}
                  >
                    {unviewedBadgeCount > 9 ? '9+' : unviewedBadgeCount}
                  </span>
                )}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}