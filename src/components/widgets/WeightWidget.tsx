import { useWeightLog } from '../../hooks/useNotion'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Text } from '../../ui/web'

const DB_ID = '325b3daa10f080a0819cc8c9dc4098a8'

export interface WeightSettings {
  goalWeight: number
}

const DEFAULTS: WeightSettings = {
  goalWeight: 170,
}

interface Entry {
  date: string
  weight: number
}

function parseEntries(results: any[]): Entry[] {
  return results
    .map((p) => ({
      date: p.properties.Date?.date?.start ?? '',
      weight: p.properties.Weight?.number ?? null,
    }))
    .filter((e) => e.date && e.weight !== null) as Entry[]
}

export function WeightWidget({ widgetId }: { widgetId: string }) {
  console.log('[WeightWidget] rendering, widgetId:', widgetId)
  const [settings] = useWidgetSettings<WeightSettings>(widgetId, DEFAULTS)
  const { data, isLoading, error } = useWeightLog(DB_ID)
  console.log('[WeightWidget] data:', data, 'isLoading:', isLoading, 'error:', error)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text variant="caption" color="muted">Loading…</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text variant="caption" className="text-red-400">{(error as Error).message}</Text>
      </div>
    )
  }

  const entries = parseEntries(data?.results ?? [])

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text variant="caption" color="muted">No entries yet</Text>
      </div>
    )
  }

  const current = entries[entries.length - 1].weight
  const first   = entries[0].weight
  const goal    = settings.goalWeight
  const lost    = +(first - current).toFixed(1)
  const toGo    = +(current - goal).toFixed(1)

  // Progress: how far from start toward goal (clamped 0–100)
  const totalNeeded = first - goal
  const progress = totalNeeded > 0
    ? Math.min(100, Math.max(0, ((first - current) / totalNeeded) * 100))
    : 0

  return (
    <div className="flex flex-col justify-center h-full px-5 py-4 gap-3 select-none" style={{ color: 'var(--wt-text)' }}>
      {/* Current weight */}
      <div>
        <p className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Current</p>
        <p className="text-5xl font-bold leading-none" style={{ color: 'var(--wt-text)' }}>
          {current}
          <span className="text-lg font-normal opacity-40 ml-1">lbs</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--wt-border, #e5e7eb)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'var(--wt-accent)' }}
        />
      </div>

      {/* Stats row */}
      <div className="flex gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Goal</p>
          <p className="text-xl font-semibold">{goal} <span className="text-xs font-normal opacity-40">lbs</span></p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50 mb-0.5">To go</p>
          <p className="text-xl font-semibold" style={{ color: toGo <= 0 ? 'var(--wt-accent)' : 'var(--wt-text)' }}>
            {toGo <= 0 ? '🎯 Done' : `${toGo} lbs`}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Lost</p>
          <p className="text-xl font-semibold" style={{ color: 'var(--wt-accent)' }}>
            {lost > 0 ? `−${lost}` : lost} <span className="text-xs font-normal opacity-40">lbs</span>
          </p>
        </div>
      </div>
    </div>
  )
}
