import React, { useState } from 'react'
import {
  Button, IconButton, Input, Text, FlexRow, FlexCol,
  ScrollArea, SegmentedControl, Panel, PanelHeader,
  Divider, Checkbox, SettingsSection, Icon,
  type SegmentedOption,
} from '@whiteboard/ui-kit'
import {
  useGoals, useGoalMilestones, useHabitCheckins, useCheckinHabit, useUncheckinHabit,
  useUpdateGoal, useDeleteGoal,
  useLogProgress,
  useCreateMilestone, useUpdateMilestone, useDeleteMilestone,
  computeProgressPct, computeStreak,
  type Goal, type GoalStatus, type GoalType, type GoalMilestone, type CreateGoalInput,
} from '../hooks/useGoals'
import { GoalCreationWizard } from './goals/GoalCreationWizard'
import { WhiteboardBackground } from './WhiteboardBackground'
import { useThemeStore } from '../store/theme'
import { useWhiteboardStore } from '../store/whiteboard'

// Header bar card (not goal cards — those are dynamic per color)
const HEADER_FRAME: React.CSSProperties = {
  background:   'var(--wt-bg)',
  borderRadius: '1.5rem',
  border:       '1px solid var(--wt-widget-rest-border)',
  boxShadow:    '0 4px 0 rgba(0,0,0,0.10), var(--wt-shadow-sm), inset 0 1px 0 var(--wt-widget-highlight)',
}

const GOAL_COLORS = [
  '#3b82f6', '#8b5cf6', '#f97316', '#10b981',
  '#ec4899', '#f59e0b', '#06b6d4', '#ef4444',
]

const EMOJI_OPTIONS = ['🎯', '🏆', '💪', '📚', '🧘', '🏃', '💰', '🌱', '✈️', '🎓', '🎨', '🏋️', '🤝', '🚀', '❤️']

const TYPE_LABELS: Record<GoalType, string> = {
  numeric:   'Numeric',
  average:   'Average',
  habit:     'Habit',
  milestone: 'Milestone',
}

const STATUS_OPTIONS: SegmentedOption<GoalStatus>[] = [
  { value: 'active',    label: 'Active'    },
  { value: 'completed', label: 'Completed' },
  { value: 'archived',  label: 'Archived'  },
]

const TYPE_OPTIONS: SegmentedOption<GoalType>[] = [
  { value: 'numeric',   label: 'Numeric'   },
  { value: 'average',   label: 'Average'   },
  { value: 'habit',     label: 'Habit'     },
  { value: 'milestone', label: 'Milestone' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Gradient progress bar ──────────────────────────────────────────────────────

function GradientBar({ pct, color }: { pct: number; color: string }) {
  const clamped  = Math.min(Math.max(pct, 0), 1)
  const done     = clamped >= 1
  const barColor = done ? 'var(--wt-success)' : color
  return (
    <FlexCol gap="xs">
      <div style={{
        height: 6, borderRadius: 99, overflow: 'hidden',
        background: `color-mix(in srgb, ${barColor} 14%, var(--wt-surface))`,
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${clamped * 100}%`,
          background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <Text variant="caption" color="muted" align="right">
        {Math.round(clamped * 100)}%
      </Text>
    </FlexCol>
  )
}

// ── Type-specific card content ─────────────────────────────────────────────────

function NumericContent({ goal, color }: { goal: Goal; color: string }) {
  const pct      = computeProgressPct(goal)
  const goingDown = (goal.start_value ?? 0) > (goal.target_value ?? 1)

  return (
    <FlexCol gap="sm">
      <FlexRow align="flex-end" gap="md">
        {/* Current value — big */}
        <FlexCol style={{ gap: 0 }}>
          <Text
            variant="display" size="small"
            style={{ color, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            {goal.current_value}
          </Text>
          {goal.unit && (
            <Text variant="caption" color="muted">{goal.unit}</Text>
          )}
        </FlexCol>

        <Text variant="body" size="small" color="muted" style={{ paddingBottom: 6 }}>
          {goingDown ? '↓' : '↑'}
        </Text>

        {/* Target value */}
        <FlexCol style={{ gap: 0 }}>
          <Text
            variant="heading" size="medium"
            style={{ color: 'var(--wt-text-muted)', lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            {goal.target_value}
          </Text>
          {goal.start_value != null && (
            <Text variant="caption" color="muted">from {goal.start_value}</Text>
          )}
        </FlexCol>
      </FlexRow>

      <GradientBar pct={pct} color={color} />
    </FlexCol>
  )
}

function AverageContent({ goal, color }: { goal: Goal; color: string }) {
  const onTrack = goal.target_value == null || (
    (goal.start_value ?? 0) > (goal.target_value ?? 0)
      ? goal.current_value <= goal.target_value
      : goal.current_value >= goal.target_value
  )
  const statusColor = onTrack ? 'var(--wt-success)' : 'var(--wt-danger)'

  return (
    <FlexCol gap="sm">
      <FlexRow align="flex-end" gap="sm">
        <Text
          variant="display" size="small"
          style={{ color, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em' }}
        >
          {goal.current_value}
        </Text>
        {goal.unit && (
          <Text variant="body" size="small" color="muted" style={{ paddingBottom: 6 }}>{goal.unit}</Text>
        )}
      </FlexRow>
      {goal.target_value != null && (
        <FlexRow align="center" gap="xs">
          <div style={{ width: 6, height: 6, borderRadius: 99, background: statusColor }} />
          <Text variant="caption" style={{ color: statusColor, fontWeight: 600 }}>
            {onTrack ? 'On track' : 'Off track'}
          </Text>
          <Text variant="caption" color="muted">
            · target {goal.target_value}{goal.unit ? ` ${goal.unit}` : ''}
          </Text>
        </FlexRow>
      )}
    </FlexCol>
  )
}

function HabitContent({ goal, color }: { goal: Goal; color: string }) {
  const today        = new Date().toISOString().slice(0, 10)
  const { data: checkins = [] } = useHabitCheckins(goal.id)
  const checkinMut   = useCheckinHabit()
  const uncheckinMut = useUncheckinHabit()
  const checkedToday = checkins.some(c => c.checked_on === today)
  const streak       = computeStreak(checkins)

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (checkedToday) uncheckinMut.mutate({ goalId: goal.id, date: today })
    else              checkinMut.mutate({ goalId: goal.id })
  }

  return (
    <FlexCol gap="sm">
      {streak > 0 && (
        <FlexRow align="flex-end" gap="xs">
          <Text
            variant="display" size="small"
            style={{ color, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            {streak}
          </Text>
          <FlexCol style={{ paddingBottom: 4, gap: 0 }}>
            <Text variant="caption" style={{ color, opacity: 0.8, lineHeight: 1 }}>day</Text>
            <Text variant="caption" style={{ color, opacity: 0.8, lineHeight: 1 }}>streak 🔥</Text>
          </FlexCol>
        </FlexRow>
      )}
      <button
        onClick={handleToggle}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 12, cursor: 'pointer',
          border: checkedToday ? 'none' : `1.5px solid ${color}50`,
          background: checkedToday ? color : 'transparent',
          color: checkedToday ? '#fff' : color,
          fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
      >
        {checkedToday
          ? <><CheckIcon /> Done today</>
          : <>+ Check in</>
        }
      </button>
    </FlexCol>
  )
}

function MilestoneListContent({ milestones, color }: { milestones: GoalMilestone[]; color: string }) {
  const completedCount = milestones.filter(m => m.completed_at !== null).length
  return (
    <FlexCol gap="sm">
      {/* X of Y counter */}
      <FlexRow align="flex-end" gap="xs">
        <Text
          variant="display" size="small"
          style={{ color, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em' }}
        >
          {completedCount}
        </Text>
        <Text variant="heading" size="small" color="muted" style={{ paddingBottom: 4 }}>
          / {milestones.length}
        </Text>
      </FlexRow>
      <GradientBar pct={completedCount / Math.max(milestones.length, 1)} color={color} />
      {/* Dot list */}
      <FlexCol gap="xs" style={{ marginTop: 2 }}>
        {milestones.slice(0, 5).map(m => {
          const done = m.completed_at !== null
          return (
            <FlexRow key={m.id} align="center" gap="sm">
              <div style={{
                width: 6, height: 6, borderRadius: 99, flexShrink: 0,
                background: done ? color : `${color}35`,
                transition: 'background 0.15s',
              }} />
              <Text
                variant="caption" numberOfLines={1}
                style={{
                  color: done ? 'var(--wt-text-muted)' : 'var(--wt-text)',
                  textDecoration: done ? 'line-through' : 'none',
                  flex: 1, minWidth: 0,
                }}
              >
                {m.title}
              </Text>
            </FlexRow>
          )
        })}
        {milestones.length > 5 && (
          <Text variant="caption" color="muted" style={{ paddingLeft: 14 }}>
            +{milestones.length - 5} more
          </Text>
        )}
      </FlexCol>
    </FlexCol>
  )
}

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Goal card ──────────────────────────────────────────────────────────────────

function GoalCard({
  goal, onEdit, onDelete, onLogProgress, onComplete, onArchive,
}: {
  goal:          Goal
  onEdit:        (g: Goal) => void
  onDelete:      (id: string) => void
  onLogProgress: (g: Goal) => void
  onComplete:    (id: string) => void
  onArchive:     (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const { data: milestones = [] } = useGoalMilestones(goal.id)
  const color     = goal.color || '#3b82f6'
  const isNumeric = goal.type === 'numeric'
  const isAverage = goal.type === 'average'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '1.5rem',
        background: 'var(--wt-bg)',
        border: `1px solid ${color}28`,
        boxShadow: hovered
          ? `0 6px 32px ${color}28, inset 0 1px 0 rgba(255,255,255,0.07)`
          : `0 2px 16px ${color}14, inset 0 1px 0 rgba(255,255,255,0.05)`,
        padding: '18px 18px 14px',
        display: 'flex', flexDirection: 'column', gap: 14,
        transition: 'box-shadow 0.25s',
      }}
    >
      {/* ── Header: emoji + title + hover actions ── */}
      <FlexRow align="start" justify="between" gap="sm">
        <FlexRow align="start" gap="sm" style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>{goal.emoji}</span>
          <FlexCol style={{ minWidth: 0, gap: 2, paddingTop: 2 }}>
            <Text variant="title" size="medium" numberOfLines={2} style={{ fontWeight: 700, lineHeight: 1.2 }}>
              {goal.title}
            </Text>
            {goal.description && (
              <Text variant="caption" color="muted" numberOfLines={2}>
                {goal.description}
              </Text>
            )}
          </FlexCol>
        </FlexRow>

        {hovered && (
          <FlexRow gap="xs" style={{ flexShrink: 0, marginTop: 2 }}>
            {goal.status === 'active' && (isNumeric || isAverage) && (
              <IconButton icon="ChartLineUp" size="sm" variant="ghost" title="Log progress" onClick={() => onLogProgress(goal)} />
            )}
            {goal.status === 'active' && (
              <IconButton icon="CheckCircle" size="sm" variant="ghost" title="Mark complete" onClick={() => onComplete(goal.id)} />
            )}
            <IconButton icon="PencilSimple" size="sm" variant="ghost" title="Edit" onClick={() => onEdit(goal)} />
            {goal.status === 'active' && (
              <IconButton icon="Archive" size="sm" variant="ghost" title="Archive" onClick={() => onArchive(goal.id)} />
            )}
            <IconButton icon="Trash" size="sm" variant="ghost" title="Delete" onClick={() => onDelete(goal.id)} />
          </FlexRow>
        )}
      </FlexRow>

      {/* ── Type-specific content ── */}
      {isNumeric && goal.target_value != null && <NumericContent goal={goal} color={color} />}
      {isAverage && <AverageContent goal={goal} color={color} />}
      {goal.type === 'habit' && <HabitContent goal={goal} color={color} />}
      {goal.type === 'milestone' && milestones.length > 0 && <MilestoneListContent milestones={milestones} color={color} />}

      {/* ── Footer: type pill + date ── */}
      <FlexRow align="center" justify="between" style={{ marginTop: 'auto' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
          background: `${color}18`, color,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {TYPE_LABELS[goal.type]}
        </span>
        {goal.target_date && (
          <Text variant="caption" color="muted">by {formatDate(goal.target_date)}</Text>
        )}
      </FlexRow>
    </div>
  )
}

// ── New goal placeholder card ──────────────────────────────────────────────────

function NewGoalCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '1.5rem',
        border: `2px dashed ${hovered ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
        background: hovered ? 'color-mix(in srgb, var(--wt-accent) 6%, transparent)' : 'rgba(255,255,255,0.04)',
        boxShadow: 'none', cursor: 'pointer',
        minHeight: 160, width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: hovered ? 'var(--wt-accent)' : 'var(--wt-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}>
        <Icon icon="Plus" size={18} style={{ color: hovered ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)' }} />
      </div>
      <Text
        variant="body" size="small"
        style={{ color: hovered ? 'var(--wt-accent)' : 'var(--wt-text-muted)', transition: 'color 0.15s', fontWeight: 500 }}
      >
        New goal
      </Text>
    </button>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function InlineEmptyState({ status }: { status: GoalStatus }) {
  const messages: Record<GoalStatus, { emoji: string; title: string; body: string }> = {
    active:    { emoji: '🎯', title: 'No active goals',    body: '' },
    completed: { emoji: '🏆', title: 'No completed goals', body: 'Goals you complete will appear here.' },
    archived:  { emoji: '📦', title: 'No archived goals',  body: 'Goals you archive will appear here.' },
  }
  const msg = messages[status]
  return (
    <FlexCol align="center" justify="center" gap="sm" style={{ padding: '60px 20px' }}>
      <span style={{ fontSize: 36 }}>{msg.emoji}</span>
      <Text variant="title" size="medium">{msg.title}</Text>
      {msg.body && <Text variant="body" size="small" color="muted" align="center" style={{ maxWidth: 280 }}>{msg.body}</Text>}
    </FlexCol>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function GoalSkeleton() {
  return (
    <div className="animate-pulse" style={{ ...HEADER_FRAME, minHeight: 200, borderRadius: '1.5rem', display: 'flex' }}>
      <div style={{ flex: 1, padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--wt-surface-hover)' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 18, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '65%' }} />
            <div style={{ height: 13, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '45%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--wt-surface-hover)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 28, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '50%' }} />
            <div style={{ height: 13, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '35%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Goal edit modal ────────────────────────────────────────────────────────────

function GoalModal({ initial, onSave, onCancel }: {
  initial:  Goal
  onSave:   (data: CreateGoalInput) => void
  onCancel: () => void
}) {
  const [title,         setTitle]         = useState(initial.title        ?? '')
  const [description,   setDescription]   = useState(initial.description  ?? '')
  const [type,          setType]          = useState<GoalType>(initial.type ?? 'numeric')
  const [emoji,         setEmoji]         = useState(initial.emoji        ?? '🎯')
  const [color,         setColor]         = useState(initial.color        ?? '#3b82f6')
  const [targetValue,   setTargetValue]   = useState(String(initial.target_value ?? ''))
  const [targetDate,    setTargetDate]    = useState(initial.target_date  ?? '')
  const [showEmojiPick, setShowEmojiPick] = useState(false)
  const [newMilestone,  setNewMilestone]  = useState('')

  const { data: milestones = [] } = useGoalMilestones(initial.id)
  const createMilestone = useCreateMilestone()
  const updateMilestone = useUpdateMilestone()
  const deleteMilestone = useDeleteMilestone()

  function handleSave() {
    if (!title.trim()) return
    onSave({
      title:        title.trim(),
      description:  description.trim() || null,
      type,
      emoji,
      color,
      target_value: (type === 'numeric' || type === 'average') && targetValue ? Number(targetValue) : null,
      target_date:  targetDate || null,
    })
  }

  return (
    <Panel onClose={onCancel} width={480} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="Edit Goal" onClose={onCancel} />

      <ScrollArea flex1>
        <FlexCol gap="md" style={{ padding: '16px 20px 20px' }}>

          {/* Emoji + Title */}
          <SettingsSection label="Title">
            <FlexRow gap="sm" align="center">
              <button
                onClick={() => setShowEmojiPick(p => !p)}
                style={{
                  width: 38, height: 36, borderRadius: 8, flexShrink: 0,
                  border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
                  fontSize: 18, cursor: 'pointer',
                }}
              >
                {emoji}
              </button>
              <Input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                placeholder="Goal title…"
              />
            </FlexRow>
            {showEmojiPick && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => { setEmoji(e); setShowEmojiPick(false) }}
                    style={{
                      width: 32, height: 32, fontSize: 17, borderRadius: 6, border: 'none',
                      background: e === emoji ? 'var(--wt-accent)' : 'var(--wt-border)',
                      cursor: 'pointer',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </SettingsSection>

          {/* Description */}
          <SettingsSection label="Description">
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does achieving this goal look like?"
            />
          </SettingsSection>

          {/* Type */}
          <SettingsSection label="Type">
            <SegmentedControl value={type} options={TYPE_OPTIONS} onChange={setType} />
          </SettingsSection>

          {/* Numeric / average fields */}
          {(type === 'numeric' || type === 'average') && (
            <FlexRow gap="sm">
              <Input
                label="Target value"
                type="number"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder="e.g. 100"
              />
              <Input
                label="Target date (optional)"
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
            </FlexRow>
          )}

          {(type === 'habit' || type === 'milestone') && (
            <Input
              label="Target date (optional)"
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          )}

          {/* Color */}
          <SettingsSection label="Color">
            <FlexRow gap="sm" wrap>
              {GOAL_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: 6, border: 'none',
                    background: c, cursor: 'pointer', flexShrink: 0,
                    boxShadow: color === c ? `0 0 0 2px var(--wt-settings-bg), 0 0 0 4px ${c}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </FlexRow>
          </SettingsSection>

          {/* Milestones */}
          <SettingsSection label="Milestones">
            <FlexCol gap="xs">
              {milestones.map(m => (
                <FlexRow key={m.id} align="center" gap="sm">
                  <Checkbox
                    label={m.title}
                    checked={m.completed_at !== null}
                    onChange={() => updateMilestone.mutate({
                      goalId:       initial.id,
                      milestoneId:  m.id,
                      completed_at: m.completed_at ? null : new Date().toISOString(),
                    })}
                    className="flex-1"
                  />
                  <IconButton
                    icon="Trash" size="sm" variant="ghost"
                    onClick={() => deleteMilestone.mutate({ goalId: initial.id, milestoneId: m.id })}
                  />
                </FlexRow>
              ))}
              <FlexRow gap="sm">
                <Input
                  value={newMilestone}
                  onChange={e => setNewMilestone(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newMilestone.trim()) {
                      createMilestone.mutate({ goalId: initial.id, title: newMilestone.trim() })
                      setNewMilestone('')
                    }
                  }}
                  placeholder="Add milestone…"
                />
                <Button
                  variant="accent" size="sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => {
                    if (newMilestone.trim()) {
                      createMilestone.mutate({ goalId: initial.id, title: newMilestone.trim() })
                      setNewMilestone('')
                    }
                  }}
                >
                  Add
                </Button>
              </FlexRow>
            </FlexCol>
          </SettingsSection>

          <Divider />

          <FlexRow gap="sm" justify="end">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button variant="accent" size="sm" disabled={!title.trim()} onClick={handleSave}>
              Save changes
            </Button>
          </FlexRow>

        </FlexCol>
      </ScrollArea>
    </Panel>
  )
}

// ── Log progress modal ─────────────────────────────────────────────────────────

function LogProgressModal({ goal, onSave, onCancel }: {
  goal:     Goal
  onSave:   (value: number, note: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(String(goal.current_value))
  const [note,  setNote]  = useState('')
  const color  = goal.color || '#3b82f6'
  const newPct = goal.target_value ? Math.min((Number(value) / goal.target_value) * 100, 100) : 0

  return (
    <Panel onClose={onCancel} width={380}>
      <PanelHeader title="Log Progress" onClose={onCancel} />

      <FlexCol gap="md" style={{ padding: '16px 20px 20px' }}>

        <FlexRow align="center" gap="sm" style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--wt-bg)', border: '1px solid var(--wt-border)',
        }}>
          <span style={{ fontSize: 20 }}>{goal.emoji}</span>
          <FlexCol flex1 style={{ minWidth: 0 }}>
            <Text variant="body" size="small" numberOfLines={1} style={{ fontWeight: 600 }}>{goal.title}</Text>
            <Text variant="caption" color="muted">Currently: {goal.current_value} / {goal.target_value}</Text>
          </FlexCol>
        </FlexRow>

        <Input
          label="New value"
          autoFocus
          type="number"
          value={value}
          size="lg"
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value) onSave(Number(value), note) }}
        />

        {goal.target_value != null && (
          <div>
            <div style={{ height: 5, borderRadius: 4, background: 'var(--wt-border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: newPct >= 100 ? 'var(--wt-success)' : color,
                width: `${Math.min(newPct, 100)}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <Text variant="caption" color="muted" align="right" style={{ marginTop: 4 }}>
              {Math.round(newPct)}% of {goal.target_value}
            </Text>
          </div>
        )}

        <Input
          label="Note (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What did you accomplish?"
        />

        <Divider />

        <FlexRow gap="sm" justify="end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant="accent" size="sm"
            disabled={!value}
            iconLeft={<Icon icon="ChartLineUp" size={13} />}
            onClick={() => { if (value) onSave(Number(value), note) }}
          >
            Log progress
          </Button>
        </FlexRow>
      </FlexCol>
    </Panel>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function GoalsBoardView() {
  const [activeStatus, setActiveStatus] = useState<GoalStatus>('active')
  const [creating,     setCreating]     = useState(false)
  const [editing,      setEditing]      = useState<Goal | null>(null)
  const [logging,      setLogging]      = useState<Goal | null>(null)

  const { data: goals = [], isLoading } = useGoals(activeStatus)
  const updateGoal  = useUpdateGoal()
  const deleteGoal  = useDeleteGoal()
  const logProgress = useLogProgress()

  function handleUpdate(data: CreateGoalInput) {
    if (!editing) return
    updateGoal.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })
  }

  function handleLogProgress(value: number, note: string) {
    if (!logging) return
    logProgress.mutate({ id: logging.id, value, note: note || undefined }, {
      onSuccess: () => setLogging(null),
    })
  }

  const { background: themeBackground } = useThemeStore()
  const activeBoard     = useWhiteboardStore((s) => s.boards.find((b) => b.id === s.activeBoardId))
  const boardBackground = activeBoard?.background ?? themeBackground

  return (
    <WhiteboardBackground background={boardBackground}>
      <FlexCol style={{ position: 'absolute', inset: 0, padding: 16, gap: 12, boxSizing: 'border-box' }}>

        {/* ── Header row ── */}
        <FlexRow
          align="center" gap="sm"
          style={{ ...HEADER_FRAME, flexShrink: 0, padding: '12px 20px' }}
        >
          <Text variant="heading" size="small" style={{ letterSpacing: '-0.02em', flexShrink: 0 }}>
            Goals
          </Text>

          <SegmentedControl
            value={activeStatus}
            options={STATUS_OPTIONS}
            onChange={setActiveStatus}
            className="max-w-xs"
          />

          {!isLoading && goals.length > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
              background: 'var(--wt-surface-hover)', color: 'var(--wt-text-muted)',
            }}>
              {goals.length}
            </span>
          )}

          <div style={{ flex: 1 }} />

          <Button
            variant="accent" size="sm"
            iconLeft={<Icon icon="Plus" size={13} />}
            onClick={() => setCreating(true)}
          >
            New goal
          </Button>
        </FlexRow>

        {/* ── Goals grid ── */}
        <ScrollArea>
          {isLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 14, alignItems: 'start',
            }}>
              {[1, 2, 3].map(i => <GoalSkeleton key={i} />)}
            </div>
          ) : goals.length === 0 && activeStatus !== 'active' ? (
            <InlineEmptyState status={activeStatus} />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 14, alignItems: 'start', paddingBottom: 8,
            }}>
              {goals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={g => setEditing(g)}
                  onDelete={id => deleteGoal.mutate(id)}
                  onLogProgress={g => setLogging(g)}
                  onComplete={id => updateGoal.mutate({ id, status: 'completed' })}
                  onArchive={id => updateGoal.mutate({ id, status: 'archived' })}
                />
              ))}
              {activeStatus === 'active' && <NewGoalCard onClick={() => setCreating(true)} />}
            </div>
          )}
        </ScrollArea>
      </FlexCol>

      {creating && (
        <GoalCreationWizard onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      )}
      {editing && (
        <GoalModal initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      )}
      {logging && (
        <LogProgressModal goal={logging} onSave={handleLogProgress} onCancel={() => setLogging(null)} />
      )}
    </WhiteboardBackground>
  )
}
