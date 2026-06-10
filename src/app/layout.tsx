import { useEffect, useRef } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { todayString } from '@/lib/dates'
import { applyThemeColors, withDefaultSettings } from '@/lib/theme'
import { useMacroStore } from '@/store/useMacroStore'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const settings = useMacroStore((s) => s.settings)
  const _hasHydrated = useMacroStore((s) => s._hasHydrated)
  const setHasHydrated = useMacroStore((s) => s.setHasHydrated)
  const didSyncDailyDate = useRef(false)

  useEffect(() => {
    const finish = () => setHasHydrated(true)
    const unsub = useMacroStore.persist.onFinishHydration(finish)
    if (useMacroStore.persist.hasHydrated()) {
      finish()
    } else {
      void useMacroStore.persist.rehydrate()
    }
    const timeout = window.setTimeout(finish, 2000)
    return () => {
      unsub()
      window.clearTimeout(timeout)
    }
  }, [setHasHydrated])

  useEffect(() => {
    if (settings) {
      applyThemeColors(withDefaultSettings(settings))
    }
  }, [settings?.theme, settings?.accentColor, settings?.secondaryTextColor])

  useEffect(() => {
    if (!_hasHydrated || didSyncDailyDate.current) return
    didSyncDailyDate.current = true
    if (useMacroStore.getState().currentTab === 'daily') {
      useMacroStore.getState().setCurrentDate(todayString())
    }
  }, [_hasHydrated])

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <>
      <div className="app-shell mx-auto flex max-w-lg flex-col overflow-hidden bg-background">
        {children}
      </div>
      <Toaster position="top-center" richColors closeButton duration={2800} />
    </>
  )
}