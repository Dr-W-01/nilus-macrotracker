import { BottomNav } from '@/components/BottomNav'
import { DailyTab } from '@/features/daily/DailyTab'
import { LibraryTab } from '@/features/library/LibraryTab'
import { StatsTab } from '@/features/stats/StatsTab'
import { SettingsTab } from '@/features/settings/SettingsTab'
import { useMacroStore } from '@/store/useMacroStore'

export default function AppPage() {
  const currentTab = useMacroStore((s) => s.currentTab)

  return (
    <div className="app-viewport">
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