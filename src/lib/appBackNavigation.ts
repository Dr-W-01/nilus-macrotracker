import type { AppTab } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

const NAV_MARKER = 'nilus-nav'

export type AppLocationSnapshot = {
  tab: AppTab
  librarySegment: 'items' | 'categories' | 'recipes'
  statsView: 'overview' | 'trends' | 'breakdowns'
}

type OverlayEntry = {
  close: () => void
}

let locationStack: AppLocationSnapshot[] = []
let overlayStack: OverlayEntry[] = []
let syncingHistory = false
let restoringLocation = false
let initialized = false

export function snapshotAppLocation(): AppLocationSnapshot {
  const s = useMacroStore.getState()
  return {
    tab: s.currentTab,
    librarySegment: s.librarySegment,
    statsView: s.statsView,
  }
}

function locationsEqual(a: AppLocationSnapshot, b: AppLocationSnapshot): boolean {
  return (
    a.tab === b.tab &&
    a.librarySegment === b.librarySegment &&
    a.statsView === b.statsView
  )
}

function restoreAppLocation(snapshot: AppLocationSnapshot) {
  restoringLocation = true
  const s = useMacroStore.getState()
  if (s.currentTab !== snapshot.tab) s.setCurrentTab(snapshot.tab)
  if (s.librarySegment !== snapshot.librarySegment) s.setLibrarySegment(snapshot.librarySegment)
  if (s.statsView !== snapshot.statsView) s.setStatsView(snapshot.statsView)
  restoringLocation = false
}

function pushHistoryEntry() {
  if (!initialized || syncingHistory) return
  window.history.pushState({ [NAV_MARKER]: true }, '')
}

function handlePopState() {
  if (syncingHistory) {
    syncingHistory = false
    return
  }

  if (overlayStack.length > 0) {
    const entry = overlayStack.pop()!
    syncingHistory = true
    try {
      entry.close()
    } finally {
      syncingHistory = false
    }
    return
  }

  if (locationStack.length > 1) {
    locationStack.pop()
    const prev = locationStack[locationStack.length - 1]!
    restoreAppLocation(prev)
  }
}

export function initAppBackNavigation(): () => void {
  if (initialized) return () => {}
  initialized = true

  locationStack = [snapshotAppLocation()]
  window.history.replaceState({ [NAV_MARKER]: true, root: true }, '')
  window.addEventListener('popstate', handlePopState)

  const unsub = useMacroStore.subscribe((state, prevState) => {
    if (restoringLocation) return

    const changed =
      state.currentTab !== prevState.currentTab ||
      state.librarySegment !== prevState.librarySegment ||
      state.statsView !== prevState.statsView

    if (!changed) return

    const next = snapshotAppLocation()
    const top = locationStack[locationStack.length - 1]
    if (top && locationsEqual(top, next)) return

    locationStack.push(next)
    pushHistoryEntry()
  })

  return () => {
    window.removeEventListener('popstate', handlePopState)
    unsub()
    initialized = false
    locationStack = []
    overlayStack = []
  }
}

export function registerAppOverlay(close: () => void): () => void {
  const entry: OverlayEntry = { close }
  overlayStack.push(entry)
  pushHistoryEntry()

  return () => {
    const idx = overlayStack.indexOf(entry)
    if (idx === -1) return
    overlayStack.splice(idx, 1)
    if (!syncingHistory && initialized) {
      syncingHistory = true
      window.history.back()
    }
  }
}