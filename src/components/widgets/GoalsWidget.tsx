import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import {
  FlexCol, FlexRow, ScrollArea, Text, Center,
  Input, Button, Toggle, SegmentedControl, SettingsSection,
  type SegmentedOption,
} from '@whiteboard/ui-kit'
import { useGoals, useLogProgress, type GoalWithRelations, type GoalMilestone } from '../../hooks/useGoals'
import type { WidgetProps } from './registry'

// ── Design helpers ────────────────────────────────────────────────────────────

function pastelBg(color: string): string {
  return color.startsWith('#') ? `${color}28` : 'rgba(99,102,241,0.16)'
}

function goalTypeLabel(type: string): string {
  const map: Record<string, string> = {
    numeric: 'Numeric', habit: 'Habit', time_based: 'Time', milestone: 'Milestone',
  }
  return map[type] ?? type
}

function Pill({ label, color, accent }: { label: string; color?: string; accent?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 20,
      background: accent ? (color ?? 'var(--wt-accent)') + '20' : 'var(--wt-surface)',
      border: `1px solid ${accent ? (color ?? 'var(--wt-accent)') + '40' : 'var(--wt-border)'}`,
      fontSize: 10, fontWeight: 700,
      color: accent ? (color ?? 'var(--wt-accent)') : 'var(--wt-text-muted)',
      letterSpacing: '0.05em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface GoalsWidgetSettings extends Record<string, unknown> {
  selectedGoalId: string
  displayMode:    'list' | 'focus'
  showLogEntry:   boolean
}

const DEFAULTS: GoalsWidgetSettings = {
  selectedGoalId: 'all',
  displayMode:    'list',
  showLogEntry:   false,
}

const GOALS_ACCENT = '#6366f1'

const DISPLAY_MODES: SegmentedOption<'list' | 'focus'>[] = [
  { value: 'list',  label: 'List'  },
  { value: 'focus', label: 'Focus' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcProgress(goal: GoalWithRelations): number {
  if (goal.type === 'milestone') {
    const total = goal.milestones.length
    if (total === 0) return 0
    return goal.milestones.filter((m) => m.completed_at !== null).length / total
  }
  if (goal.target_value === null || goal.target_value === 0) return 0
  return Math.min(goal.current_value / goal.target_value, 1)
}

function formatTargetDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function nextMilestone(goal: GoalWithRelations): GoalMilestone | null {
  return goal.milestones
    .filter((m) => m.completed_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
}

function goalColor(goal: GoalWithRelations): string {
  return goal.color ?? GOALS_ACCENT
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color, height = 5 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height, background: 'var(--wt-surface-hover)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: height,
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
    return <>{done}/{goal.milestones.length} milestones</>
  }
  if (goal.target_value !== null) {
    const unit = goal.unit ? ` ${goal.unit}` : ''
    return <>{goal.current_value}{unit} / {goal.target_value}{unit}</>
  }
  return <>{Math.round(calcProgress(goal) * 100)}%</>
}

// ── Inline log-progress entry ─────────────────────────────────────────────────

function LogEntry({ goalId, unit }: { goalId: string; unit: string | null }) {
  const [val, setVal] = useState('')
  const log = useLogProgress()

  function submit() {
    const n = parseFloat(val)
    if (isNaN(n)) return
    log.mutate({ id: goalId, value: n })
    setVal('')
  }

  return (
    <FlexRow align="center" gap="xs" style={{ marginTop: 4 }}>
      <Input
        type="number"
        value={val}
        placeholder={unit ? `Value (${unit})` : 'Value'}
        size="sm"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        style={{ flex: 1, minWidth: 0 }}
      />
      <Button
        variant="accent"
        size="sm"
        onClick={submit}
        disabled={log.isPending}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ flexShrink: 0 }}
      >
        Log
      </Button>
    </FlexRow>
  )
}

// Alternating backing card rotations per card index
const CARD_ROTATIONS = [-2, 1.5, -1, 2.5]

// ── Single goal card ──────────────────────────────────────────────────────────

function GoalCard({
  goal, compact, showLog, done: isDone, index,
}: {
  goal:    GoalWithRelations
  compact: boolean
  showLog: boolean
  done:    boolean
  index:   number
}) {
  const pct    = calcProgress(goal)
  const color  = goalColor(goal)
  const target = formatTargetDate(goal.target_date)
  const next   = nextMilestone(goal)
  const pctNum = Math.round(pct * 100)
  const rot    = CARD_ROTATIONS[index % CARD_ROTATIONS.length]

  const footerLabel = target
    ? `Due ${target}`
    : pct >= 1
      ? 'Completed!'
      : `${pctNum}% complete`

  return (
    // Outer wrapper gives room for the rotated backing to peek out on sides
    <div style={{
      position: 'relative',
      margin: compact ? '0 6px' : '0 8px',
      paddingBottom: compact ? 18 : 22,
      opacity: isDone ? 0.45 : 1,
      transition: 'opacity 0.15s',
    }}>
      {/* Backing card — colored, rotated, peeking out from behind */}
      <div style={{
        position: 'absolute',
        top: 2, left: -4, right: -4, bottom: 0,
        borderRadius: 18,
        background: pastelBg(pct >= 1 ? '#22c55e' : color),
        transform: `rotate(${rot}deg)`,
        transformOrigin: 'center bottom',
      }}>
        {/* Footer text in the backing strip at the bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: compact ? '3px 14px 5px' : '4px 16px 7px',
        }}>
          <span style={{
            fontSize: compact ? 9 : 10, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: pct >= 1 ? '#16a34a' : color,
          }}>
            {footerLabel}
          </span>
        </div>
      </div>

      {/* White surface card — sits on top of the backing */}
      <div style={{
        position: 'relative',
        background: 'var(--wt-bg)',
        borderRadius: 16,
        padding: compact ? '9px 12px' : '13px 15px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: compact ? 4 : 7,
      }}>
        {/* Emoji — top-left, like a logo in the reference */}
        {goal.emoji && (
          <span style={{ fontSize: compact ? 16 : 22, lineHeight: 1, display: 'block' }}>
            {goal.emoji}
          </span>
        )}

        {/* Title */}
        <Text
          variant="label"
          size="large"
          numberOfLines={1}
          style={{ fontSize: compact ? 13 : 16, fontWeight: 700, lineHeight: 1.2 }}
        >
          {goal.title}
        </Text>

        {/* Progress value — subtitle line */}
        <Text variant="caption" color="muted" style={{ marginTop: -3 }}>
          <ProgressLabel goal={goal} />
        </Text>

        {/* Progress bar */}
        {!compact && (
          <ProgressBar pct={pct} color={pct >= 1 ? '#22c55e' : color} height={4} />
        )}

        {/* Pills row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Pill label={goalTypeLabel(goal.type)} />
          {goal.unit && <Pill label={goal.unit} />}
          {pct >= 1
            ? <Pill label="Done" color="#16a34a" accent />
            : next && !compact && <Pill label={`→ ${next.title}`} />
          }
        </div>

        {/* Log entry */}
        {!compact && showLog && goal.type === 'numeric' && (
          <LogEntry goalId={goal.id} unit={goal.unit} />
        )}
      </div>
    </div>
  )
}

// ── Focus mode ────────────────────────────────────────────────────────────────

function GoalFocus({ goal, showLog }: { goal: GoalWithRelations; showLog: boolean }) {
  const pct    = calcProgress(goal)
  const color  = goalColor(goal)
  const target = formatTargetDate(goal.target_date)

  return (
    <FlexCol style={{ padding: '14px 16px', height: '100%', boxSizing: 'border-box' }} gap="sm">
      {/* Emoji box + title */}
      <FlexRow align="center" gap="sm" style={{ flexShrink: 0 }}>
        {goal.emoji && (
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: colorTint(color),
            border: `2px solid ${color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>
            {goal.emoji}
          </div>
        )}
        <FlexCol gap="none" style={{ flex: 1, minWidth: 0 }}>
          <Text variant="heading" size="small" numberOfLines={1}>{goal.title}</Text>
          {goal.description && (
            <Text variant="caption" color="muted" numberOfLines={1}>{goal.description}</Text>
          )}
        </FlexCol>
      </FlexRow>

      {/* Big percentage */}
      <Center style={{ flexShrink: 0 }}>
        <Text as="span" style={{
          fontSize: 52, fontWeight: 800, lineHeight: 1,
          color: pct >= 1 ? 'var(--wt-success)' : color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}>
          {Math.round(pct * 100)}%
        </Text>
      </Center>

      {/* Progress bar */}
      <ProgressBar pct={pct} color={color} height={8} />

      {/* Detail row */}
      <FlexRow align="center" justify="between" style={{ flexShrink: 0 }}>
        <Text variant="caption" color="muted"><ProgressLabel goal={goal} /></Text>
        {target && <Text variant="caption" color="muted">by {target}</Text>}
      </FlexRow>

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <FlexCol style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Text
            variant="label"
            size="small"
            color="muted"
            textTransform="uppercase"
            style={{ marginBottom: 6, letterSpacing: '0.08em' }}
          >
            Milestones
          </Text>
          <ScrollArea>
            <FlexCol gap="xs">
              {goal.milestones
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((m) => (
                  <FlexRow
                    key={m.id}
                    align="center"
                    gap="sm"
                    style={{
                      padding: '5px 8px', borderRadius: 8,
                      background: m.completed_at ? colorTint(color) : 'transparent',
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                      background: m.completed_at ? color : 'transparent',
                      border: `1.5px solid ${m.completed_at ? color : 'var(--wt-border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {m.completed_at && (
                        <svg width={8} height={8} viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <Text
                      variant="body"
                      size="medium"
                      numberOfLines={1}
                      style={{ opacity: m.completed_at ? 0.4 : 1 }}
                    >
                      {m.title}
                    </Text>
                  </FlexRow>
                ))}
            </FlexCol>
          </ScrollArea>
        </FlexCol>
      )}

      {/* Log progress */}
      {showLog && goal.type === 'numeric' && (
        <div style={{ flexShrink: 0 }}>
          <LogEntry goalId={goal.id} unit={goal.unit} />
        </div>
      )}
    </FlexCol>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function GoalsSkeleton() {
  return (
    <FlexCol gap="md" style={{ padding: '8px 10px 10px', flex: 1 }}>
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse" style={{
          position: 'relative', margin: '0 8px', paddingBottom: 22,
        }}>
          <div style={{
            position: 'absolute', top: 2, left: -4, right: -4, bottom: 0,
            borderRadius: 18, background: 'var(--wt-surface)',
            transform: `rotate(${CARD_ROTATIONS[i]}deg)`,
          }} />
          <div style={{
            position: 'relative', borderRadius: 16,
            background: 'var(--wt-bg)', padding: '13px 15px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ height: 20, width: 26, borderRadius: 6, background: 'var(--wt-surface-hover)' }} />
            <div style={{ height: 15, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '60%' }} />
            <div style={{ height: 12, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '40%' }} />
            <div style={{ height: 4,  borderRadius: 3, background: 'var(--wt-surface-hover)' }} />
          </div>
        </div>
      ))}
    </FlexCol>
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

  const completedCount = goals.filter((g) => calcProgress(g) >= 1).length
  const overallPct = goals.length === 0
    ? 0
    : Math.round(goals.reduce((s, g) => s + calcProgress(g), 0) / goals.length * 100)

  return (
    <FlexCol fullHeight fullWidth overflow="hidden" noSelect>
      {/* Accented header */}
      <div style={{
        padding:    '14px 16px 10px',
        borderLeft: `4px solid ${GOALS_ACCENT}`,
        background: `${GOALS_ACCENT}15`,
        flexShrink: 0,
      }}>
        <FlexRow align="baseline" justify="between">
          <Text variant="heading" size="small" style={{ fontSize: 18 }}>Goals</Text>
          {goals.length > 0 && (
            <Text variant="caption" color="muted">{completedCount}/{goals.length} done</Text>
          )}
        </FlexRow>
        {goals.length > 0 && (
          <div style={{ marginTop: 8, height: 5, borderRadius: 4, background: 'var(--wt-surface-hover)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: overallPct === 100 ? 'var(--wt-success)' : GOALS_ACCENT,
              width: `${overallPct}%`, transition: 'width 0.4s ease',
            }} />
          </div>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <GoalsSkeleton />
      ) : isError ? (
        <Center flex1>
          <Text variant="caption" color="muted" align="center">Could not load goals</Text>
        </Center>
      ) : goals.length === 0 ? (
        <Center flex1>
          <Text variant="caption" color="muted" align="center">
            No active goals.<br />Add goals from the Goals board.
          </Text>
        </Center>
      ) : settings.displayMode === 'focus' ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <GoalFocus goal={goals[0]} showLog={settings.showLogEntry} />
        </div>
      ) : (
        <ScrollArea style={{ padding: '8px 2px 10px' }}>
          <FlexCol gap="md">
            {goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={i}
                compact={goals.length > 3}
                showLog={settings.showLogEntry}
                done={calcProgress(goal) >= 1}
              />
            ))}
          </FlexCol>
        </ScrollArea>
      )}
    </FlexCol>
  )
}

// ── Settings panel ────────────────────────────────────────────────────────────

export function GoalsSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<GoalsWidgetSettings>(widgetId, DEFAULTS)
  const { data: goals = [] } = useGoals('active')

  return (
    <FlexCol gap="md" style={{ padding: '2px 0' }}>
      <SettingsSection label="Show goals">
        <select
          value={settings.selectedGoalId}
          onChange={(e) => update({ selectedGoalId: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: '100%', fontSize: 13, padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
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
      </SettingsSection>

      <SettingsSection label="Display style">
        <SegmentedControl
          value={settings.displayMode}
          options={DISPLAY_MODES}
          onChange={(mode) => update({ displayMode: mode })}
        />
        {settings.displayMode === 'focus' && (
          <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
            Shows the first matching goal prominently.
          </Text>
        )}
      </SettingsSection>

      <Toggle
        value={settings.showLogEntry}
        label="Show log entry"
        onChange={(v) => update({ showLogEntry: v })}
      />
    </FlexCol>
  )
}
