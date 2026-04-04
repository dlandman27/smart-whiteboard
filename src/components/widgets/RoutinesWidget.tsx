import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoutinesWidgetSettings {
  databaseId:      string
  morningEnd:      number  // hour (24h), default 12
  eveningStart:    number  // hour (24h), default 18
}

const DEFAULTS: RoutinesWidgetSettings = {
  databaseId:   '',
  morningEnd:   12,
  eveningStart: 18,
}

interface Routine {
  id:       string
  name:     string
  category: string
  done:     boolean
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function currentPeriod(morningEnd: number, eveningStart: number): 'Morning' | 'Fitness' | 'Evening' {
  const h = new Date().getHours()
  if (h < morningEnd)    return 'Morning'
  if (h < eveningStart)  return 'Fitness'
  return 'Evening'
}

function periodLabel(period: string, h = new Date().getHours()): string {
  if (period === 'Morning') return `Good ${h < 12 ? 'morning' : 'afternoon'}`
  if (period === 'Evening') return 'Good evening'
  return 'Fitness'
}

function extractTitle(props: any): string {
  const titleProp = Object.values(props as Record<string, any>).find((p: any) => p.type === 'title') as any
  return titleProp?.title?.map((t: any) => t.plain_text).join('') ?? ''
}

function extractProp(props: any, name: string): any {
  const p = props[name]
  if (!p) return null
  if (p.type === 'checkbox')   return p.checkbox
  if (p.type === 'select')     return p.select?.name ?? null
  if (p.type === 'status')     return p.status?.name ?? null
  if (p.type === 'rich_text')  return p.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
  return null
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function RoutinesWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<RoutinesWidgetSettings>(widgetId, DEFAULTS)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading,  setLoading]  = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [period,   setPeriod]   = useState(() => currentPeriod(settings.morningEnd, settings.eveningStart))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Update period every minute
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPeriod(currentPeriod(settings.morningEnd, settings.eveningStart))
    }, 60_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [settings.morningEnd, settings.eveningStart])

  // Fetch routines for current period
  async function fetchRoutines() {
    if (!settings.databaseId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/databases/${settings.databaseId}/query`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ page_size: 50 }),
      })
      const data = await res.json() as { results: any[] }
      const all: Routine[] = data.results.map((page: any) => ({
        id:       page.id,
        name:     extractTitle(page.properties),
        category: extractProp(page.properties, 'Category') ?? '',
        done:     extractProp(page.properties, 'Done') ?? false,
      }))
      setRoutines(all)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutines()
    const id = setInterval(fetchRoutines, 30_000)
    return () => clearInterval(id)
  }, [settings.databaseId, period])

  async function toggle(routine: Routine) {
    if (toggling.has(routine.id)) return
    setToggling((s) => new Set([...s, routine.id]))

    // Optimistic update
    setRoutines((prev) => prev.map((r) => r.id === routine.id ? { ...r, done: !r.done } : r))

    try {
      await fetch(`/api/pages/${routine.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ properties: { Done: { checkbox: !routine.done } } }),
      })
    } catch {
      // Revert on error
      setRoutines((prev) => prev.map((r) => r.id === routine.id ? { ...r, done: routine.done } : r))
    } finally {
      setToggling((s) => { const n = new Set(s); n.delete(routine.id); return n })
    }
  }

  if (!settings.databaseId) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--wt-bg)' }}>
        <span style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>No database — open settings</span>
      </div>
    )
  }

  const filtered = routines.filter((r) => r.category === period)
  const done     = filtered.filter((r) => r.done).length
  const total    = filtered.length
  const pct      = total > 0 ? (done / total) * 100 : 0

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wt-bg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--wt-text)' }}>
            {periodLabel(period)} ☀️
          </span>
          <span style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>
            {done}/{total}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 8, height: 3, borderRadius: 2,
          background: 'var(--wt-border)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: pct === 100 ? 'var(--wt-success)' : 'var(--wt-accent)',
            width: `${pct}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>


      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        {loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 24, color: 'var(--wt-text-muted)', fontSize: 12 }}>
            Loading…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 24, color: 'var(--wt-text-muted)', fontSize: 12 }}>
            No {period.toLowerCase()} routines
          </div>
        )}
        {filtered.map((routine) => (
          <button
            key={routine.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => toggle(routine)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', marginBottom: 4,
              borderRadius: 10, border: '1px solid var(--wt-border)',
              background: routine.done ? 'color-mix(in srgb, var(--wt-accent) 8%, transparent)' : 'var(--wt-surface)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s, opacity 0.15s',
              opacity: toggling.has(routine.id) ? 0.6 : 1,
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              border: routine.done ? 'none' : '1.5px solid var(--wt-border)',
              background: routine.done ? 'var(--wt-accent)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>
              {routine.done && (
                <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="var(--wt-accent-text)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Label */}
            <span style={{
              fontSize: 13, fontWeight: 450, color: 'var(--wt-text)',
              textDecoration: routine.done ? 'line-through' : 'none',
              opacity: routine.done ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}>
              {routine.name}
            </span>
          </button>
        ))}

        {pct === 100 && total > 0 && (
          <div style={{ textAlign: 'center', padding: '12px 0 4px', fontSize: 12, color: 'var(--wt-success)', fontWeight: 500 }}>
            All done! 🎉
          </div>
        )}
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function RoutinesSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<RoutinesWidgetSettings>(widgetId, DEFAULTS)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, color: 'var(--wt-text-muted)', fontWeight: 500 }}>Database ID</label>
        <input
          value={settings.databaseId}
          onChange={(e) => set({ databaseId: e.target.value })}
          placeholder="Notion database ID"
          style={{
            padding: '6px 10px', fontSize: 12, borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--wt-text-muted)', fontWeight: 500 }}>Morning ends</label>
          <select
            value={settings.morningEnd}
            onChange={(e) => set({ morningEnd: Number(e.target.value) })}
            style={{
              padding: '6px 8px', fontSize: 12, borderRadius: 8,
              border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
              color: 'var(--wt-text)', outline: 'none',
            }}
          >
            {[10,11,12,13,14].map((h) => (
              <option key={h} value={h}>{h === 12 ? '12pm' : `${h}am`}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--wt-text-muted)', fontWeight: 500 }}>Evening starts</label>
          <select
            value={settings.eveningStart}
            onChange={(e) => set({ eveningStart: Number(e.target.value) })}
            style={{
              padding: '6px 8px', fontSize: 12, borderRadius: 8,
              border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
              color: 'var(--wt-text)', outline: 'none',
            }}
          >
            {[15,16,17,18,19,20].map((h) => (
              <option key={h} value={h}>{h > 12 ? `${h-12}pm` : `${h}pm`}</option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--wt-text-muted)', margin: 0, lineHeight: 1.5 }}>
        Routines are filtered by their <strong>Category</strong> field (Morning / Fitness / Evening) and reset daily at midnight.
      </p>
    </div>
  )
}
