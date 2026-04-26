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

  const { data: routines = [], isLoading } = useRoutines()
  const { data: completedIds = [] }        = useRoutineCompletions(today)
  const toggle = useToggleRoutine()

  const filtered   = routines.filter((r: Routine) => r.category === category)
  const incomplete = filtered.filter((r: Routine) => !completedIds.includes(r.id))
  const complete   = filtered.filter((r: Routine) =>  completedIds.includes(r.id))
  const sorted     = [...incomplete, ...complete]

  const done  = complete.length
  const total = filtered.length
  const pct   = total > 0 ? (done / total) * 100 : 0

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wt-bg)', overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Header — accented with category color left-border + tint */}
      <div style={{
        padding: '14px 16px 10px',
        borderLeft: `4px solid ${color}`,
        background: `${color}15`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--wt-text)' }}>
            {CATEGORY_LABELS[category]}
          </span>
          <span style={{ fontSize: 13, color: 'var(--wt-text-muted)' }}>{done}/{total}</span>
        </div>
        <div style={{
          marginTop: 8, height: 7, borderRadius: 4,
          background: 'var(--wt-surface-hover)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: pct === 100 ? 'var(--wt-success)' : color,
            width: `${pct}%`, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>
        {isLoading ? (
          // Skeleton loading state
          <>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: 44, borderRadius: 14,
                  background: 'var(--wt-surface-hover)',
                  marginBottom: 4,
                }}
              />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 24, color: 'var(--wt-text-muted)', fontSize: 13 }}>
            No {CATEGORY_LABELS[category].toLowerCase()} routines
          </div>
        ) : (
          sorted.map((r: Routine) => {
            const completed = completedIds.includes(r.id)
            return (
              <button
                key={r.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => toggle.mutate({ id: r.id, completed, date: today })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', marginBottom: 4,
                  borderRadius: 14, border: '1px solid var(--wt-border)',
                  background: completed ? `${color}15` : 'var(--wt-surface)',
                  cursor: 'pointer', textAlign: 'left',
                  opacity: completed ? 0.35 : 1,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
              >
                {/* Checkbox — 22px */}
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: completed ? 'none' : `1.5px solid ${color}`,
                  background: completed ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}>
                  {completed && (
                    <svg width={13} height={13} viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 15, marginRight: 4 }}>{r.emoji}</span>
                <span style={{
                  fontSize: 15, fontWeight: 450, color: 'var(--wt-text)',
                  flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.title}
                </span>
              </button>
            )
          })
        )}
        {pct === 100 && total > 0 && (
          <div style={{ textAlign: 'center', padding: '10px 0 4px', fontSize: 13, color: color, fontWeight: 500 }}>
            All done!
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
