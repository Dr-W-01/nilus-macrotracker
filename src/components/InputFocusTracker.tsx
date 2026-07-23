import { useEffect } from 'react'
import { useMacroStore } from '@/store/useMacroStore'

function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!el || el === document.body) return false
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  )
}

function keyboardLikelyOpen(): boolean {
  const vv = window.visualViewport
  if (!vv) return false
  return vv.height < window.innerHeight * 0.85
}

function shouldKeepBottomNavVisible(el: Element | null): boolean {
  if (!el) return false
  if (el.closest('.library-tab')) return false
  return Boolean(el.closest('.settings-tab'))
}

/** Tracks focused text inputs app-wide to hide bottom nav while the keyboard is open. */
export function InputFocusTracker() {
  const setInputFocusEngaged = useMacroStore((s) => s.setInputFocusEngaged)

  useEffect(() => {
    let blurTimer: ReturnType<typeof setTimeout> | undefined

    const sync = () => {
      const active = document.activeElement
      const focused = isTextInput(active)
      // Only hide nav when a real text field is focused and keyboard is (likely) open.
      // Never leave engaged=true after focus is gone (prevents stuck-hidden nav).
      const engaged =
        focused &&
        keyboardLikelyOpen() &&
        !shouldKeepBottomNavVisible(active)
      setInputFocusEngaged(engaged)
    }

    const scheduleSync = (delay = 0) => {
      if (blurTimer) clearTimeout(blurTimer)
      blurTimer = setTimeout(sync, delay)
    }

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element
      if (!isTextInput(target)) return
      if (shouldKeepBottomNavVisible(target)) {
        setInputFocusEngaged(false)
        return
      }
      // Engage immediately so the nav clears for the keyboard; sync confirms keyboard state.
      setInputFocusEngaged(true)
      scheduleSync(80)
    }

    const onFocusOut = () => {
      // Clear optimistically so unmounting sheet inputs cannot leave nav stuck hidden.
      setInputFocusEngaged(false)
      scheduleSync(120)
    }

    const onViewportChange = () => {
      scheduleSync(50)
    }

    const onPointerUp = () => scheduleSync(0)

    // Capture phase so we still see focusout when a focused node is removed from the DOM.
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    // After modal/sheet close, activeElement often settles on body without a clean blur path.
    document.addEventListener('pointerup', onPointerUp)
    sync()

    return () => {
      if (blurTimer) clearTimeout(blurTimer)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
      document.removeEventListener('pointerup', onPointerUp)
      setInputFocusEngaged(false)
    }
  }, [setInputFocusEngaged])

  return null
}
