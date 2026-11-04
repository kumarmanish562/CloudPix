import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}

function getSnapshot() { return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches }
function subscribe(callback: () => void) {
  const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  query.addEventListener("change", callback)
  return () => query.removeEventListener("change", callback)
}
