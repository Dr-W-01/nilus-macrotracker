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
      setInputFocusEngaged(true)
    }

    const onFocusOut = () => {
      scheduleSync(120)
    }

    const onViewportChange = () => {
      scheduleSync(50)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    sync()

    return () => {
      if (blurTimer) clearTimeout(blurTimer)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
      setInputFocusEngaged(false)
    }
  }, [setInputFocusEngaged])

  return null
}