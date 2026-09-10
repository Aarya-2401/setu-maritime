import { useState, useEffect } from 'react'

/**
 * Hook to detect if current viewport width corresponds to a mobile device (<= 768px).
 * Tracks window resize and matchMedia events with clean unmounting.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= breakpoint
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const updateMatch = (e) => {
      setIsMobile(e.matches)
    }

    // Set initial
    setIsMobile(mql.matches)

    if (mql.addEventListener) {
      mql.addEventListener('change', updateMatch)
      return () => mql.removeEventListener('change', updateMatch)
    } else {
      mql.addListener(updateMatch)
      return () => mql.removeListener(updateMatch)
    }
  }, [breakpoint])

  return isMobile
}
