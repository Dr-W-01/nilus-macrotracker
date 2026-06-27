import { useEffect, type RefObject } from 'react'

/** Publishes the live fixed nav height to --bottom-nav-measured for layout clearance. */
export function useBottomNavHeight(
  navRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) {
      document.documentElement.style.removeProperty('--bottom-nav-measured')
      return
    }

    const el = navRef.current
    if (!el) return

    const sync = () => {
      const height = Math.ceil(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--bottom-nav-measured', `${height}px`)
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    window.addEventListener('orientationchange', sync)
    window.addEventListener('resize', sync)

    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', sync)
      window.removeEventListener('resize', sync)
      document.documentElement.style.removeProperty('--bottom-nav-measured')
    }
  }, [navRef, active])
}