import { useEffect } from 'react'
import { useWalliAgentsStore } from '../store/walliAgents'

export interface AppleHealthData {
  date?:                string
  steps?:               number
  walk_distance_mi?:    number
  exercise_minutes?:    number
  active_energy_kcal?:  number
  flights_climbed?:     number
  resting_heart_rate?:  number
  weight?:              number
}

const WIDGET_ID = 'apollo-primary'

export function useAppleHealth() {
  const widgetState = useWalliAgentsStore((s) => s.widgets[WIDGET_ID])
  const setWidget   = useWalliAgentsStore((s) => s.setWidget)

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch('/api/walli/widgets')
        if (!res.ok) return
        const widgets: any[] = await res.json()
        const apollo = widgets.find((w) => w.widget_id === WIDGET_ID)
        if (apollo) setWidget(apollo)
      } catch {}
    }

    fetchLatest()
    const id = setInterval(fetchLatest, 5 * 60_000)
    return () => clearInterval(id)
  }, [setWidget])

  return {
    data:        (widgetState?.data ?? {}) as AppleHealthData,
    updatedAt:   widgetState?.updated_at,
    hasData:     !!widgetState && Object.keys(widgetState.data).length > 0,
  }
}
