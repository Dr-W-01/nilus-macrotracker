/**
 * Physical scroll spacer that keeps tab content above the fixed bottom nav.
 * Owned by the app shell — individual tabs must not add their own bottom padding.
 */
export function NavBottomClearance() {
  return <div className="nav-bottom-spacer" aria-hidden="true" />
}