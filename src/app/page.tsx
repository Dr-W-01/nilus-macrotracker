import { AppBackNavigation } from '@/components/AppBackNavigation'
import { BottomNav } from '@/components/BottomNav'
import { InputFocusTracker } from '@/components/InputFocusTracker'
import { PwaUpdateManager } from '@/components/PwaUpdateManager'
import { DailyTab } from '@/features/daily/DailyTab'
import { LibraryTab } from '@/features/library/LibraryTab'
import { StatsTab } from '@/features/stats/StatsTab'
import { BadgesTab } from '@/features/badges/BadgesTab'
import { SettingsTab } from '@/features/settings/SettingsTab'
import { BadgeUnlockListener } from '@/components/BadgeUnlockListener'
import { cn } from '@/lib/utils'
import { useMacroStore } from '@/store/useMacroStore'

export default function AppPage() {
  const currentTab = useMacroStore((s) => s.currentTab)
  const inputFocusEngaged = useMacroStore((s) => s.inputFocusEngaged)
  const librarySearchEngaged = useMacroStore((s) => s.librarySearchEngaged)
  const bottomNavHidden =
    inputFocusEngaged || (currentTab === 'library' && librarySearchEngaged)

  return (
    <div className="app-viewport flex min-h-0 flex-1 flex-col">
      <AppBackNavigation />
      <PwaUpdateManager />
      <InputFocusTracker />
      <BadgeUnlockListener />
      <main className={cn('app-main', bottomNavHidden && 'app-main--nav-hidden')}>
        {currentTab === 'daily' && <DailyTab />}
        {currentTab === 'library' && <LibraryTab />}
        {currentTab === 'stats' && <StatsTab />}
        {currentTab === 'badges' && <BadgesTab />}
        {currentTab === 'settings' && <SettingsTab />}
      </main>
      <BottomNav />
    </div>
  )
}