import { BottomNav } from '@/components/BottomNav'
import { InputFocusTracker } from '@/components/InputFocusTracker'
import { PwaUpdateManager } from '@/components/PwaUpdateManager'
import { DailyTab } from '@/features/daily/DailyTab'
import { LibraryTab } from '@/features/library/LibraryTab'
import { StatsTab } from '@/features/stats/StatsTab'
import { SettingsTab } from '@/features/settings/SettingsTab'
import { useMacroStore } from '@/store/useMacroStore'

export default function AppPage() {
  const currentTab = useMacroStore((s) => s.currentTab)

  return (
    <div className="app-viewport flex min-h-0 flex-1 flex-col">
      <PwaUpdateManager />
      <InputFocusTracker />
      <main className="app-main">
        {currentTab === 'daily' && <DailyTab />}
        {currentTab === 'library' && <LibraryTab />}
        {currentTab === 'stats' && <StatsTab />}
        {currentTab === 'settings' && <SettingsTab />}
      </main>
      <BottomNav />
    </div>
  )
}