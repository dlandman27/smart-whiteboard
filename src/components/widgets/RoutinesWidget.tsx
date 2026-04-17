import { useWidgetSettings } from '@whiteboard/sdk'
import { useRoutines, useRoutineCompletions, useToggleRoutine, type Routine } from '../../hooks/useRoutines'

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = 'morning' | 'daily' | 'evening'

export interface RoutinesWidgetSettings extends Record<string, unknown> {
  category: Category | 'auto'
}

const DEFAULTS: RoutinesWidgetSettings = { category: 'auto' }

function currentCategory(): Category {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'daily'
  return 'evening'
}

const CATEGORY_COLORS: Record<Category, string> = {
  morning: '#f97316',
  daily:   '#3b82f6',
  evening: '#8b5cf6',
}

const CATEGORY_LABELS: Record<Category, string> = {
  morning: 'Morning',
  daily:   'Daily',
  evening: 'Evening',
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function RoutinesWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<RoutinesWidgetSettings>(widgetId, DEFAULTS)

  const today    = new Date().toISOString().slice(0, 10)
  const category = settings.category === 'auto' ? currentCategory() : settings.category
  const color    = CATEGORY_COLORS[category]

  const { data: routines = [] }      = useRoutines()
  const { data: completedIds = [] }  = useRoutineCompletions(today)
  const toggle = useToggleRoutine()

  const filtered = routines.filter((r: Routine) => r.category === category)
  const done     = filtered.filter((r: Routine) => completedIds.includes(r.id)).length
  const total    = filtered.length
  const pct      = total > 0 ? (done / total) * 100 : 0

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wt-bg)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--wt-text)' }}>
            {CATEGORY_LABELS[category]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>{done}/{total}</span>
        </div>
        <div style={{
          marginTop: 8, height: 3, borderRadius: 2,
          background: 'var(--wt-border)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: pct === 100 ? 'var(--wt-success, #4ade80)' : color,
            width: `${pct}%`, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 24, color: 'var(--wt-text-muted)', fontSize: 12 }}>
            No {CATEGORY_LABELS[category].toLowerCase()} routines
          </div>
        ) : (
          filtered.map((r: Routine) => {
            const completed = completedIds.includes(r.id)
            return (
              <button
                key={r.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => toggle.mutate({ id: r.id, completed, date: today })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', marginBottom: 4,
                  borderRadius: 10, border: '1px solid var(--wt-border)',
                  background: completed ? `${color}15` : 'var(--wt-surface)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s, opacity 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: completed ? 'none' : `1.5px solid ${color}`,
                  background: completed ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}>
                  {completed && (
                    <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 14, marginRight: 4 }}>{r.emoji}</span>
                <span style={{
                  fontSize: 13, fontWeight: 450, color: 'var(--wt-text)',
                  textDecoration: completed ? 'line-through' : 'none',
                  opacity: completed ? 0.5 : 1, flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.title}
                </span>
              </button>
            )
          })
        )}
        {pct === 100 && total > 0 && (
          <div style={{ textAlign: 'center', padding: '10px 0 4px', fontSize: 12, color: color, fontWeight: 500 }}>
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
        <label style={{ fontSize: 11, color: 'var(--wt-text-muted)', fontWeight: 500 }}>Category</label>
        <select
          value={settings.category}
          onChange={(e) => set({ category: e.target.value as RoutinesWidgetSettings['category'] })}
          style={{
            padding: '6px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        >
          <option value="auto">Auto (time of day)</option>
          <option value="morning">Morning</option>
          <option value="daily">Daily</option>
          <option value="evening">Evening</option>
        </select>
      </div>
      <p style={{ fontSize: 11, color: 'var(--wt-text-muted)', margin: 0, lineHeight: 1.5 }}>
        Manage your routines from the <strong>Routines</strong> board in the sidebar.
      </p>
    </div>
  )
}
