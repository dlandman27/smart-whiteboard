import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { useGoals, useLogProgress, type GoalWithRelations, type GoalMilestone } from '../../hooks/useGoals'
import type { WidgetProps } from './registry'

// ── Settings ──────────────────────────────────────────────────────────────────

export interface GoalsWidgetSettings extends Record<string, unknown> {
  /** 'all' shows every active goal; any other value is treated as a specific goal ID */
  selectedGoalId: string
  /** 'list' shows all active goals as cards; 'focus' shows one goal prominently */
  displayMode: 'list' | 'focus'
  /** Whether to show the log-progress quick-entry inline */
  showLogEntry: boolean
}

const DEFAULTS: GoalsWidgetSettings = {
  selectedGoalId: 'all',
  displayMode:    'list',
  showLogEntry:   false,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcProgress(goal: GoalWithRelations): number {
  if (goal.type === 'milestone') {
    const total = goal.milestones.length
    if (total === 0) return 0
    const done = goal.milestones.filter((m) => m.completed_at !== null).length
    return done / total
  }
  if (goal.target_value === null || goal.target_value === 0) return 0
  return Math.min(goal.current_value / goal.target_value, 1)
}

function formatTargetDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function nextMilestone(goal: GoalWithRelations): GoalMilestone | null {
  const pending = goal.milestones
    .filter((m) => m.completed_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
  return pending[0] ?? null
}

function goalAccentColor(goal: GoalWithRelations): string {
  // Prefer the goal's own color, else fall back to type-based color via CSS var
  return goal.color ?? 'var(--wt-accent)'
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color, height = 7 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{
      height,
      borderRadius: height,
      background: 'var(--wt-surface-hover)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        height: '100%',
        borderRadius: height,
        background: pct >= 1 ? 'var(--wt-success)' : color,
        width: `${Math.round(pct * 100)}%`,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

// ── Progress label ────────────────────────────────────────────────────────────

function ProgressLabel({ goal }: { goal: GoalWithRelations }) {
  if (goal.type === 'milestone') {
    const done  = goal.milestones.filter((m) => m.completed_at !== null).length
    const total = goal.milestones.length
    return <span>{done}/{total} milestones</span>
  }
  const pct = calcProgress(goal)
  if (goal.target_value !== null) {
    const unit = goal.unit ? ` ${goal.unit}` : ''
    return <span>{goal.current_value}{unit} / {goal.target_value}{unit}</span>
  }
  return <span>{Math.round(pct * 100)}%</span>
}

// ── Inline log-progress entry ─────────────────────────────────────────────────

function LogEntry({ goalId, unit }: { goalId: string; unit: string | null }) {
  const [val, setVal] = useState('')
  const log = useLogProgress(goalId)

  function submit() {
    const n = parseFloat(val)
    if (isNaN(n)) return
    log.mutate({ value: n })
    setVal('')
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input
        type="number"
        value={val}
        placeholder={unit ? `Value (${unit})` : 'Value'}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          flex: 1, fontSize: 13, padding: '6px 8px',
          borderRadius: 8, border: '1px solid var(--wt-border)',
          background: 'var(--wt-surface)', color: 'var(--wt-text)',
          outline: 'none', minWidth: 0,
        }}
      />
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={submit}
        disabled={log.isPending}
        style={{
          padding: '6px 12px', fontSize: 13, borderRadius: 8, border: 'none',
          background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
          cursor: 'pointer', flexShrink: 0, fontWeight: 600,
        }}
      >
        Log
      </button>
    </div>
  )
}

// ── Single goal card ──────────────────────────────────────────────────────────

function GoalCard({
  goal,
  compact,
  showLog,
  done: isDone,
}: {
  goal: GoalWithRelations
  compact: boolean
  showLog: boolean
  done: boolean
}) {
  const pct    = calcProgress(goal)
  const color  = goalAccentColor(goal)
  const target = formatTargetDate(goal.target_date)
  const next   = nextMilestone(goal)

  return (
    <div style={{
      background:    'var(--wt-surface)',
      border:        '1px solid var(--wt-border)',
      borderRadius:  16,
      padding:       compact ? '10px 12px' : '14px',
      display:       'flex',
      flexDirection: 'column',
      gap:           compact ? 5 : 8,
      opacity:       isDone ? 0.4 : 1,
      transition:    'opacity 0.15s',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {goal.emoji && (
          <span style={{ fontSize: compact ? 14 : 18, lineHeight: 1, flexShrink: 0 }}>{goal.emoji}</span>
        )}
        <span style={{
          flex: 1, fontSize: compact ? 13 : 17, fontWeight: 600,
          color: 'var(--wt-text)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {goal.title}
        </span>
        {target && (
          <span style={{ fontSize: compact ? 10 : 12, color: 'var(--wt-text-muted)', flexShrink: 0 }}>
            by {target}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar pct={pct} color={color} height={compact ? 4 : 7} />

      {/* Progress label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: compact ? 11 : 14, color: 'var(--wt-text-muted)' }}>
          <ProgressLabel goal={goal} />
        </span>
        <span style={{
          fontSize: compact ? 11 : 14, fontWeight: 600,
          color: pct >= 1 ? 'var(--wt-success)' : color,
        }}>
          {Math.round(pct * 100)}%
        </span>
      </div>

      {/* Next milestone */}
      {!compact && next && (
        <div style={{
          fontSize: 13, color: 'var(--wt-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Next: {next.title}
        </div>
      )}

      {/* Log progress entry */}
      {!compact && showLog && goal.type === 'numeric' && (
        <LogEntry goalId={goal.id} unit={goal.unit} />
      )}
    </div>
  )
}

// ── Focus mode (single goal, larger) ─────────────────────────────────────────

function GoalFocus({ goal, showLog }: { goal: GoalWithRelations; showLog: boolean }) {
  const pct    = calcProgress(goal)
  const color  = goalAccentColor(goal)
  const target = formatTargetDate(goal.target_date)

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '14px 16px', boxSizing: 'border-box',
      gap: 10,
    }}>
      {/* Emoji + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {goal.emoji && (
          <span style={{ fontSize: 28, lineHeight: 1 }}>{goal.emoji}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 20, fontWeight: 700, color: 'var(--wt-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {goal.title}
          </div>
          {goal.description && (
            <div style={{
              fontSize: 13, color: 'var(--wt-text-muted)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {goal.description}
            </div>
          )}
        </div>
      </div>

      {/* Big percentage */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <span style={{
          fontSize: 42, fontWeight: 700, lineHeight: 1,
          color: pct >= 1 ? 'var(--wt-success)' : color,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {Math.round(pct * 100)}%
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar pct={pct} color={color} height={7} />

      {/* Detail row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 14, color: 'var(--wt-text-muted)', flexShrink: 0,
      }}>
        <ProgressLabel goal={goal} />
        {target && <span>by {target}</span>}
      </div>

      {/* Milestones list */}
      {goal.milestones.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: 'var(--wt-text-muted)', marginBottom: 6,
          }}>
            Milestones
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: '100%' }}>
            {goal.milestones
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: m.completed_at ? color : 'transparent',
                    border: `1.5px solid ${m.completed_at ? color : 'var(--wt-border)'}`,
                  }} />
                  <span style={{
                    fontSize: 13, color: 'var(--wt-text)',
                    opacity: m.completed_at ? 0.4 : 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.title}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Log progress */}
      {showLog && goal.type === 'numeric' && (
        <div style={{ flexShrink: 0 }}>
          <LogEntry goalId={goal.id} unit={goal.unit} />
        </div>
      )}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function GoalsSkeleton() {
  return (
    <div style={{ flex: 1, padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            borderRadius: 16, background: 'var(--wt-surface)',
            border: '1px solid var(--wt-border)', padding: 14,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <div style={{ height: 17, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '70%' }} />
          <div style={{ height: 7,  borderRadius: 4, background: 'var(--wt-surface-hover)' }} />
          <div style={{ height: 14, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '45%' }} />
        </div>
      ))}
    </div>
  )
}

// ── Widget root ───────────────────────────────────────────────────────────────

export function GoalsWidget({ widgetId }: WidgetProps) {
  const [settings] = useWidgetSettings<GoalsWidgetSettings>(widgetId, DEFAULTS)

  const { data: allGoals = [], isLoading, isError } = useGoals('active')

  const goals: GoalWithRelations[] =
    settings.selectedGoalId === 'all'
      ? allGoals
      : allGoals.filter((g) => g.id === settings.selectedGoalId)

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wt-bg)',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--wt-text)' }}>Goals</span>
          {goals.length > 0 && (
            <span style={{ fontSize: 13, color: 'var(--wt-text-muted)' }}>
              {goals.filter((g) => calcProgress(g) >= 1).length}/{goals.length} complete
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <GoalsSkeleton />
      ) : isError ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <span style={{ fontSize: 13, color: 'var(--wt-text-muted)', textAlign: 'center' }}>
            Could not load goals
          </span>
        </div>
      ) : goals.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <span style={{ fontSize: 13, color: 'var(--wt-text-muted)', textAlign: 'center' }}>
            No active goals.<br />Add goals from the Goals board.
          </span>
        </div>
      ) : settings.displayMode === 'focus' ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <GoalFocus goal={goals[0]} showLog={settings.showLogEntry} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              compact={goals.length > 3}
              showLog={settings.showLogEntry}
              done={calcProgress(goal) >= 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Settings panel ────────────────────────────────────────────────────────────

export function GoalsSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<GoalsWidgetSettings>(widgetId, DEFAULTS)
  const { data: goals = [] } = useGoals('active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '2px 0' }}>
      {/* Goal selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Show goals
        </label>
        <select
          value={settings.selectedGoalId}
          onChange={(e) => update({ selectedGoalId: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            fontSize: 13, padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        >
          <option value="all">All active goals</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.emoji ? `${g.emoji} ` : ''}{g.title}
            </option>
          ))}
        </select>
      </div>

      {/* Display mode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Display style
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['list', 'focus'] as const).map((mode) => (
            <button
              key={mode}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => update({ displayMode: mode })}
              style={{
                flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 500,
                borderRadius: 8, border: `1px solid ${settings.displayMode === mode ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                background: settings.displayMode === mode ? 'var(--wt-accent)' : 'var(--wt-surface)',
                color: settings.displayMode === mode ? 'var(--wt-accent-text)' : 'var(--wt-text)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        {settings.displayMode === 'focus' && (
          <p style={{ fontSize: 10, color: 'var(--wt-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Focus mode shows the first matching goal prominently.
          </p>
        )}
      </div>

      {/* Log progress toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--wt-text)' }}>Show log entry</div>
          <div style={{ fontSize: 10, color: 'var(--wt-text-muted)' }}>Quick-log progress inline</div>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => update({ showLogEntry: !settings.showLogEntry })}
          style={{
            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: settings.showLogEntry ? 'var(--wt-accent)' : 'var(--wt-border)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 2,
            left: settings.showLogEntry ? 18 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: 'white', transition: 'left 0.2s',
          }} />
        </button>
      </div>
    </div>
  )
}
