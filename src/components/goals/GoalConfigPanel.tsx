/**
 * GoalConfigPanel — a standalone modal/panel for configuring which goals appear
 * on a specific Goals widget instance.
 *
 * Usage:
 *   <GoalConfigPanel widgetId={widgetId} onClose={() => setOpen(false)} />
 */
import { useWidgetSettings } from '@whiteboard/sdk'
import { useGoals, type GoalWithRelations } from '../../hooks/useGoals'
import type { GoalsWidgetSettings } from '../widgets/GoalsWidget'

const DEFAULTS: GoalsWidgetSettings = {
  selectedGoalId: 'all',
  displayMode:    'list',
  showLogEntry:   false,
}

interface GoalConfigPanelProps {
  widgetId: string
  onClose?: () => void
}

export function GoalConfigPanel({ widgetId, onClose }: GoalConfigPanelProps) {
  const [settings, update] = useWidgetSettings<GoalsWidgetSettings>(widgetId, DEFAULTS)
  const { data: goals = [], isLoading } = useGoals('active')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configure Goals widget"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{
        background: 'var(--wt-bg)',
        border: '1px solid var(--wt-border)',
        borderRadius: 14,
        padding: '20px 20px 16px',
        width: 340,
        maxHeight: '80vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--wt-text)' }}>
            Configure Goals Widget
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, lineHeight: 1, color: 'var(--wt-text-muted)',
              padding: '0 2px',
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Goal selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--wt-text-muted)',
          }}>
            Which goals to show
          </label>

          {isLoading ? (
            <span style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>Loading…</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <GoalOption
                id="all"
                label="All active goals"
                emoji=""
                selected={settings.selectedGoalId === 'all'}
                onSelect={() => update({ selectedGoalId: 'all' })}
              />
              {goals.map((g: GoalWithRelations) => (
                <GoalOption
                  key={g.id}
                  id={g.id}
                  label={g.title}
                  emoji={g.emoji}
                  selected={settings.selectedGoalId === g.id}
                  onSelect={() => update({ selectedGoalId: g.id })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Display mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--wt-text-muted)',
          }}>
            Display style
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <ModeButton
              label="Compact list"
              description="All goals as cards"
              active={settings.displayMode === 'list'}
              onClick={() => update({ displayMode: 'list' })}
            />
            <ModeButton
              label="Single focus"
              description="One goal, full detail"
              active={settings.displayMode === 'focus'}
              onClick={() => update({ displayMode: 'focus' })}
            />
          </div>
        </div>

        {/* Log entry toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--wt-text)' }}>
              Inline progress logging
            </div>
            <div style={{ fontSize: 10, color: 'var(--wt-text-muted)', marginTop: 1 }}>
              Show a quick-log input in the widget
            </div>
          </div>
          <button
            onClick={() => update({ showLogEntry: !settings.showLogEntry })}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: settings.showLogEntry ? 'var(--wt-accent)' : 'var(--wt-border)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: settings.showLogEntry ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Done button */}
        <button
          onClick={onClose}
          style={{
            padding: '8px 0', fontSize: 13, fontWeight: 600,
            borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GoalOption({
  id, label, emoji, selected, onSelect,
}: {
  id: string
  label: string
  emoji: string | null
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        border: `1px solid ${selected ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
        background: selected ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'var(--wt-surface)',
        color: 'var(--wt-text)', width: '100%', transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {emoji && <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>}
      <span style={{ fontSize: 12, fontWeight: selected ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {selected && (
        <svg width={12} height={12} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 6l3 3 5-5" stroke="var(--wt-accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function ModeButton({
  label, description, active, onClick,
}: {
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
        border: `1.5px solid ${active ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
        background: active ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'var(--wt-surface)',
        color: 'var(--wt-text)', transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--wt-text-muted)', marginTop: 2 }}>{description}</div>
    </button>
  )
}
