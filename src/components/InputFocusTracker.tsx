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

/** Tracks focused text inputs app-wide to hide bottom nav while the keyboard is open. */
export function InputFocusTracker() {
  const setInputFocusEngaged = useMacroStore((s) => s.setInputFocusEngaged)

  useEffect(() => {
    let blurTimer: ReturnType<typeof setTimeout> | undefined

    const sync = () => {
      const focused = isTextInput(document.activeElement)
      const engaged = focused && keyboardLikelyOpen()
      setInputFocusEngaged(engaged)
    }

    const scheduleSync = (delay = 0) => {
      if (blurTimer) clearTimeout(blurTimer)
      blurTimer = setTimeout(sync, delay)
    }

    const onFocusIn = (e: FocusEvent) => {
      if (isTextInput(e.target as Element)) {
        setInputFocusEngaged(true)
      }
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