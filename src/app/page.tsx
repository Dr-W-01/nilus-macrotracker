import { BottomNav } from '@/components/BottomNav'
import { InputFocusTracker } from '@/components/InputFocusTracker'
import { PullToRefresh } from '@/components/PullToRefresh'
import { PwaUpdateManager } from '@/components/PwaUpdateManager'
import { DailyTab } from '@/features/daily/DailyTab'
import { LibraryTab } from '@/features/library/LibraryTab'
import { StatsTab } from '@/features/stats/StatsTab'
import { SettingsTab } from '@/features/settings/SettingsTab'
import { checkForAppUpdate } from '@/lib/pwaUpdate'
import { useMacroStore } from '@/store/useMacroStore'

export default function AppPage() {
  const currentTab = useMacroStore((s) => s.currentTab)

  return (
    <div className="app-viewport">
      <PwaUpdateManager />
      <InputFocusTracker />
      <PullToRefresh
        className="app-main"
        onRefresh={async () => {
          await checkForAppUpdate(true)
        }}
      >
        {currentTab === 'daily' && <DailyTab />}
        {currentTab === 'library' && <LibraryTab />}
        {currentTab === 'stats' && <StatsTab />}
        {currentTab === 'settings' && <SettingsTab />}
      </PullToRefresh>
      <BottomNav />
    </div>
  )
}