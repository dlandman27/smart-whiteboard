import { useEffect } from 'react'

// Reload the page every 24 hours to keep the app fresh on always-on hardware
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000

export function useKioskRefresh() {
  useEffect(() => {
    const timer = setTimeout(() => window.location.reload(), REFRESH_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])
}
