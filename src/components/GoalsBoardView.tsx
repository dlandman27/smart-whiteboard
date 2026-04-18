import { useState } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import {
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal,
  useLogProgress, useCreateMilestone, useUpdateMilestone, useDeleteMilestone,
  type Goal, type GoalWithRelations, type GoalMilestone,
} from '../hooks/useGoals'

// ── Constants ──────────────────────────────────────────────────────────────────

const GOAL_TYPES: { key: Goal['type']; label: string; icon: string; description: string }[] = [
  { key: 'numeric',    label: 'Numeric',    icon: 'ChartBar', description: 'Track a number toward a target'  },
  { key: 'habit',      label: 'Habit',      icon: 'Repeat',   description: 'Build a recurring behavior'      },
  { key: 'time_based', label: 'Time-based', icon: 'Clock',    description: 'Achieve something by a deadline' },
  { key: 'milestone',  label: 'Milestones', icon: 'Flag',     description: 'Hit checkpoints along the way'   },
]

const COLOR_SWATCHES = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#f59e0b', '#06b6d4', '#ef4444',
]

const EMOJI_OPTIONS = ['🎯', '💪', '📚', '🏃', '🌿', '🚀', '🏆', '💡', '🎨', '📈', '💰', '❤️', '🧠', '✨', '🌟']

const DEFAULT_COLOR = '#3b82f6'
const DEFAULT_EMOJI = '🎯'

// ── Helpers ───────────────────────────────────────────────────────────────────

function progressPercent(goal: Goal): number {
  if (goal.type === 'numeric' || goal.type === 'time_based') {
    const cur = goal.current_value ?? 0
    const tgt = goal.target_value  ?? 1
    return Math.min(100, Math.round((cur / tgt) * 100))
  }
  return 0
}

function typeLabel(type: Goal['type']): string {
  return GOAL_TYPES.find(t => t.key === type)?.label ?? type
}

function isMilestoneDone(m: GoalMilestone): boolean {
  return m.completed_at != null
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 5, borderRadius: 4, background: 'var(--wt-border)', overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%', borderRadius: 4,
        background: pct >= 100 ? 'var(--wt-success)' : color,
        width: `${pct}%`,
        transition: 'width 0.4s ease, background 0.3s',
      }} />
    </div>
  )
}

// ── Milestone row ─────────────────────────────────────────────────────────────

function MilestoneRow({
  milestone, goalId, color,
}: {
  milestone: GoalMilestone
  goalId:    string
  color:     string
}) {
  const updateMilestone = useUpdateMilestone()
  const deleteMilestone = useDeleteMilestone()
  const [hovered, setHovered] = useState(false)
  const done = isMilestoneDone(milestone)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 0',
        borderBottom: '1px solid var(--wt-border)',
      }}
    >
      <button
        onClick={() => updateMilestone.mutate({
          goalId,
          milestoneId: milestone.id,
          completed_at: done ? null : new Date().toISOString(),
        })}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: done ? 'none' : `2px solid ${color}55`,
          background: done ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {done && (
          <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span style={{
        flex: 1, fontSize: 12,
        color: done ? 'var(--wt-text-muted)' : 'var(--wt-text)',
        textDecoration: done ? 'line-through' : 'none',
      }}>
        {milestone.title}
        {milestone.target_value != null && (
          <span style={{ color: 'var(--wt-text-muted)', marginLeft: 4 }}>({milestone.target_value})</span>
        )}
      </span>
      {hovered && (
        <button
          onClick={() => deleteMilestone.mutate({ goalId, milestoneId: milestone.id })}
          style={{ ...iconBtnStyle, color: 'var(--wt-danger)' }}
        >
          <Icon icon="Trash" size={11} />
        </button>
      )}
    </div>
  )
}

// ── Milestone adder ───────────────────────────────────────────────────────────

function MilestoneAdder({ goalId }: { goalId: string }) {
  const [text, setText] = useState('')
  const createMilestone = useCreateMilestone()

  function submit() {
    if (!text.trim()) return
    createMilestone.mutate({ goalId, title: text.trim() })
    setText('')
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Add milestone…"
        style={{
          flex: 1, padding: '4px 8px', borderRadius: 6, fontSize: 12,
          border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
          color: 'var(--wt-text)', outline: 'none',
        }}
      />
      <button
        onClick={submit}
        disabled={!text.trim()}
        style={{
          padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          background: text.trim() ? 'var(--wt-accent)' : 'var(--wt-border)',
          color: text.trim() ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
          border: 'none', cursor: text.trim() ? 'pointer' : 'default',
        }}
      >
        Add
      </button>
    </div>
  )
}

// ── Goal card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal, onEdit, onDelete, onLogProgress,
}: {
  goal:          GoalWithRelations
  onEdit:        () => void
  onDelete:      () => void
  onLogProgress: () => void
}) {
  const color  = goal.color ?? DEFAULT_COLOR
  const pct    = progressPercent(goal)
  const isDone = goal.status === 'completed'
  const [hovered,            setHovered]            = useState(false)
  const [milestonesExpanded, setMilestonesExpanded] = useState(false)

  const milestones           = goal.milestones ?? []
  const completedMilestones  = milestones.filter(isMilestoneDone).length
  const showProgress         = goal.type === 'numeric' || goal.type === 'time_based'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${hovered ? color + '40' : 'var(--wt-border)'}`,
        background: 'var(--wt-surface)',
        boxShadow: hovered
          ? `0 0 0 1px ${color}20, 0 4px 20px ${color}12, var(--wt-shadow-sm)`
          : 'var(--wt-shadow-sm)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        opacity: isDone ? 0.7 : 1,
      }}
    >
      {/* Top color bar */}
      <div style={{ height: 3, background: color }} />

      {/* Card body */}
      <div style={{ padding: '14px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
            {goal.emoji ?? DEFAULT_EMOJI}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 650, color: 'var(--wt-text)', lineHeight: 1.3 }}>
                {goal.title}
              </span>
              {isDone && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                  background: 'var(--wt-success)', color: '#fff', letterSpacing: '0.06em',
                }}>
                  DONE
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--wt-text-muted)', marginTop: 2 }}>
              {typeLabel(goal.type)}
              {goal.target_date && (
                <span>
                  {' · Due '}
                  {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {hovered && (
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {showProgress && (
                <button onClick={onLogProgress} title="Log progress" style={iconBtnStyle}>
                  <Icon icon="Plus" size={13} />
                </button>
              )}
              <button onClick={onEdit} title="Edit goal" style={iconBtnStyle}>
                <Icon icon="PencilSimple" size={13} />
              </button>
              <button onClick={onDelete} title="Delete goal" style={{ ...iconBtnStyle, color: 'var(--wt-danger)' }}>
                <Icon icon="Trash" size={13} />
              </button>
            </div>
          )}
        </div>

        {goal.description && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--wt-text-muted)', lineHeight: 1.5 }}>
            {goal.description}
          </p>
        )}

        {/* Numeric / time_based progress */}
        {showProgress && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>
                {goal.current_value ?? 0}
                {goal.unit && <span> {goal.unit}</span>}
                {' / '}
                {goal.target_value ?? '?'}
                {goal.unit && <span> {goal.unit}</span>}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? 'var(--wt-success)' : color }}>
                {pct}%
              </span>
            </div>
            <ProgressBar pct={pct} color={color} />
          </div>
        )}

        {/* Milestone section */}
        {goal.type === 'milestone' && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setMilestonesExpanded(x => !x)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--wt-text-muted)', fontSize: 11,
              }}
            >
              <Icon icon={milestonesExpanded ? 'CaretDown' : 'CaretRight'} size={10} />
              {completedMilestones}/{milestones.length} milestones
            </button>

            {milestonesExpanded && (
              <div style={{ marginTop: 8 }}>
                {milestones.map(m => (
                  <MilestoneRow key={m.id} milestone={m} goalId={goal.id} color={color} />
                ))}
                <MilestoneAdder goalId={goal.id} />
              </div>
            )}
          </div>
        )}

        {/* Habit type */}
        {goal.type === 'habit' && (
          <>
            {!hovered && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--wt-text-muted)' }}>
                Building habit daily
              </div>
            )}
            {hovered && !isDone && (
              <button
                onClick={onLogProgress}
                style={{
                  marginTop: 10, width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '6px 0', borderRadius: 7, fontSize: 12, fontWeight: 550,
                  border: `1.5px solid ${color}55`,
                  background: `${color}12`,
                  color: color, cursor: 'pointer',
                }}
              >
                <Icon icon="Plus" size={12} />
                Log progress
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Log Progress modal ────────────────────────────────────────────────────────

function LogProgressModal({
  goal, onClose,
}: {
  goal:    Goal
  onClose: () => void
}) {
  const [value, setValue] = useState(String(goal.current_value ?? 0))
  const [note,  setNote]  = useState('')
  const logProgress = useLogProgress(goal.id)

  function submit() {
    const num = parseFloat(value)
    if (isNaN(num)) return
    logProgress.mutate({ value: num, note: note.trim() || undefined }, {
      onSuccess: onClose,
    })
  }

  const color = goal.color ?? DEFAULT_COLOR

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>{goal.emoji ?? DEFAULT_EMOJI}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--wt-text)' }}>{goal.title}</div>
            <div style={{ fontSize: 11, color: 'var(--wt-text-muted)', marginTop: 1 }}>Log progress</div>
          </div>
        </div>

        {(goal.type === 'numeric' || goal.type === 'time_based') && (
          <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--wt-text-muted)' }}>
            Current: {goal.current_value ?? 0}{goal.unit ? ` ${goal.unit}` : ''}
            {' / '}
            {goal.target_value ?? '?'}{goal.unit ? ` ${goal.unit}` : ''}
          </div>
        )}

        <label style={labelStyle}>
          New value{goal.unit ? ` (${goal.unit})` : ''}
        </label>
        <input
          autoFocus
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 10 }}>Note (optional)</label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Great session today"
          style={inputStyle}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={submit}
            disabled={logProgress.isPending}
            style={{ ...saveBtnStyle, background: color }}
          >
            {logProgress.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Goal form ─────────────────────────────────────────────────────────────────

interface GoalFormData {
  title:        string
  description:  string
  type:         Goal['type']
  target_value: string
  unit:         string
  target_date:  string
  color:        string
  emoji:        string
  milestones:   { title: string }[]
}

function GoalFormModal({
  initial, onSave, onClose,
}: {
  initial?: Goal
  onSave:   (data: GoalFormData) => void
  onClose:  () => void
}) {
  const [form, setForm] = useState<GoalFormData>({
    title:        initial?.title                      ?? '',
    description:  initial?.description                ?? '',
    type:         initial?.type                       ?? 'numeric',
    target_value: initial?.target_value != null ? String(initial.target_value) : '',
    unit:         initial?.unit                       ?? '',
    target_date:  initial?.target_date                ?? '',
    color:        initial?.color                      ?? DEFAULT_COLOR,
    emoji:        initial?.emoji                      ?? DEFAULT_EMOJI,
    milestones:   [],
  })

  const [showEmojiPick, setShowEmojiPick] = useState(false)
  const [newMilestone,  setNewMilestone]  = useState('')

  function patch<K extends keyof GoalFormData>(k: K, v: GoalFormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function addMilestone() {
    if (!newMilestone.trim()) return
    patch('milestones', [...form.milestones, { title: newMilestone.trim() }])
    setNewMilestone('')
  }

  function removeMilestone(i: number) {
    patch('milestones', form.milestones.filter((_, idx) => idx !== i))
  }

  const canSave = form.title.trim().length > 0

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--wt-text)', marginBottom: 16 }}>
          {initial ? 'Edit goal' : 'New goal'}
        </div>

        {/* Emoji + Title row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowEmojiPick(p => !p)}
              style={{
                width: 42, height: 36, borderRadius: 8,
                border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
                fontSize: 18, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {form.emoji}
            </button>
            {showEmojiPick && (
              <div style={{
                position: 'absolute', top: 40, left: 0, zIndex: 10,
                display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8,
                background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
                borderRadius: 10, boxShadow: 'var(--wt-shadow)',
                width: 196,
              }}>
                {EMOJI_OPTIONS.map(e => (
                  <button key={e}
                    onClick={() => { patch('emoji', e); setShowEmojiPick(false) }}
                    style={{
                      width: 30, height: 30, fontSize: 16, borderRadius: 6, border: 'none',
                      background: e === form.emoji ? 'var(--wt-accent)' : 'var(--wt-border)',
                      cursor: 'pointer',
                    }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            autoFocus
            value={form.title}
            onChange={e => patch('title', e.target.value)}
            placeholder="Goal title…"
            style={{ ...inputStyle, flex: 1, margin: 0 }}
          />
        </div>

        {/* Description */}
        <label style={labelStyle}>Description</label>
        <textarea
          value={form.description}
          onChange={e => patch('description', e.target.value)}
          placeholder="Optional description…"
          rows={2}
          style={{
            ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />

        {/* Type selector */}
        <label style={{ ...labelStyle, marginTop: 10 }}>Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {GOAL_TYPES.map(t => (
            <button key={t.key}
              onClick={() => patch('type', t.key)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                border: `1.5px solid ${form.type === t.key ? form.color : 'var(--wt-border)'}`,
                background: form.type === t.key ? `${form.color}14` : 'var(--wt-bg)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Icon icon={t.icon as any} size={14}
                style={{ color: form.type === t.key ? form.color : 'var(--wt-text-muted)', marginTop: 1, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: form.type === t.key ? 'var(--wt-text)' : 'var(--wt-text-muted)' }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--wt-text-muted)', marginTop: 1, lineHeight: 1.3 }}>
                  {t.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Numeric / time_based fields */}
        {(form.type === 'numeric' || form.type === 'time_based') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Target value</label>
              <input
                type="number"
                value={form.target_value}
                onChange={e => patch('target_value', e.target.value)}
                placeholder="e.g. 100"
                style={{ ...inputStyle, margin: 0 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unit</label>
              <input
                value={form.unit}
                onChange={e => patch('unit', e.target.value)}
                placeholder={form.type === 'time_based' ? 'days' : 'e.g. km'}
                style={{ ...inputStyle, margin: 0 }}
              />
            </div>
          </div>
        )}

        {/* Target date */}
        {(form.type === 'time_based' || form.type === 'milestone' || form.type === 'habit') && (
          <>
            <label style={labelStyle}>Target date</label>
            <input
              type="date"
              value={form.target_date}
              onChange={e => patch('target_date', e.target.value)}
              style={{ ...inputStyle }}
            />
          </>
        )}

        {/* Milestones for new milestone-type goal */}
        {form.type === 'milestone' && !initial && (
          <>
            <label style={{ ...labelStyle, marginTop: 10 }}>Milestones</label>
            {form.milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, flex: 1, color: 'var(--wt-text)' }}>{m.title}</span>
                <button onClick={() => removeMilestone(i)} style={{ ...iconBtnStyle, color: 'var(--wt-danger)' }}>
                  <Icon icon="Trash" size={11} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <input
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addMilestone() }}
                placeholder="Add milestone…"
                style={{ ...inputStyle, flex: 1, margin: 0 }}
              />
              <button
                onClick={addMilestone}
                disabled={!newMilestone.trim()}
                style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: newMilestone.trim() ? 'var(--wt-accent)' : 'var(--wt-border)',
                  color: newMilestone.trim() ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
                  border: 'none', cursor: newMilestone.trim() ? 'pointer' : 'default',
                }}
              >
                Add
              </button>
            </div>
          </>
        )}

        {/* Color picker */}
        <label style={{ ...labelStyle, marginTop: 4 }}>Color</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {COLOR_SWATCHES.map(c => (
            <button key={c}
              onClick={() => patch('color', c)}
              style={{
                width: 24, height: 24, borderRadius: '50%', border: 'none',
                background: c, cursor: 'pointer',
                outline: form.color === c ? `3px solid ${c}` : 'none',
                outlineOffset: 2,
                boxShadow: form.color === c ? `0 0 0 2px var(--wt-bg)` : 'none',
                transition: 'outline 0.1s, box-shadow 0.1s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={() => { if (canSave) onSave(form) }}
            disabled={!canSave}
            style={{
              ...saveBtnStyle,
              background: canSave ? form.color : 'var(--wt-border)',
              color: canSave ? '#fff' : 'var(--wt-text-muted)',
              cursor: canSave ? 'pointer' : 'default',
            }}
          >
            {initial ? 'Save changes' : 'Create goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, borderRadius: 6, border: 'none',
  background: 'var(--wt-surface)', cursor: 'pointer',
  color: 'var(--wt-text-muted)',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modalStyle: React.CSSProperties = {
  width: '100%', borderRadius: 16,
  background: 'var(--wt-surface)',
  border: '1px solid var(--wt-border)',
  padding: '24px 24px 20px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--wt-text-muted)', marginBottom: 4, letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 10px',
  borderRadius: 7, fontSize: 13,
  border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
  color: 'var(--wt-text)', outline: 'none', marginBottom: 2,
  boxSizing: 'border-box',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
  color: 'var(--wt-text)', cursor: 'pointer',
}

const saveBtnStyle: React.CSSProperties = {
  padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: 'none', cursor: 'pointer', color: '#fff',
}

// ── Status filter tabs ────────────────────────────────────────────────────────

function StatusTabs({
  value, onChange,
}: {
  value:    string
  onChange: (v: string) => void
}) {
  const tabs: { key: string; label: string }[] = [
    { key: 'active',    label: 'Active'    },
    { key: 'completed', label: 'Completed' },
    { key: 'archived',  label: 'Archived'  },
  ]
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {tabs.map(t => (
        <button key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            border: `1.5px solid ${value === t.key ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
            background: value === t.key ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
            color: value === t.key ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function GoalsBoardView() {
  const [statusFilter, setStatusFilter] = useState('active')
  const [showCreate,   setShowCreate]   = useState(false)
  const [editGoal,     setEditGoal]     = useState<GoalWithRelations | null>(null)
  const [logGoal,      setLogGoal]      = useState<Goal | null>(null)

  const { data: goals = [], isLoading } = useGoals(statusFilter)
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  function handleCreate(form: GoalFormData) {
    createGoal.mutate({
      title:        form.title.trim(),
      description:  form.description.trim() || null,
      type:         form.type,
      target_value: form.target_value ? parseFloat(form.target_value) : null,
      unit:         form.unit.trim() || null,
      target_date:  form.target_date || null,
      color:        form.color,
      emoji:        form.emoji,
    }, { onSuccess: () => setShowCreate(false) })
  }

  function handleEdit(form: GoalFormData) {
    if (!editGoal) return
    updateGoal.mutate({
      id:           editGoal.id,
      title:        form.title.trim(),
      description:  form.description.trim() || null,
      type:         form.type,
      target_value: form.target_value ? parseFloat(form.target_value) : null,
      unit:         form.unit.trim() || null,
      target_date:  form.target_date || null,
      color:        form.color,
      emoji:        form.emoji,
    }, { onSuccess: () => setEditGoal(null) })
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this goal?')) deleteGoal.mutate(id)
  }

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--wt-bg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 14px',
        borderBottom: '1px solid var(--wt-border)',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--wt-text)', letterSpacing: '-0.02em' }}>
            Goals
          </h1>
          <div style={{ fontSize: 12, color: 'var(--wt-text-muted)', marginTop: 2 }}>{dateStr}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusTabs value={statusFilter} onChange={setStatusFilter} />
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              border: 'none',
              background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
              cursor: 'pointer',
            }}
          >
            <Icon icon="Plus" size={13} />
            New goal
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--wt-text-muted)', fontSize: 13, paddingTop: 40 }}>
            Loading goals…
          </div>
        )}

        {!isLoading && goals.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            paddingTop: 60, gap: 12,
          }}>
            <span style={{ fontSize: 40 }}>🎯</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--wt-text)' }}>No {statusFilter} goals</div>
            <div style={{ fontSize: 13, color: 'var(--wt-text-muted)' }}>
              {statusFilter === 'active' ? 'Create your first goal to get started.' : `No ${statusFilter} goals yet.`}
            </div>
            {statusFilter === 'active' && (
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  marginTop: 4,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  border: 'none', background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
                  cursor: 'pointer',
                }}
              >
                <Icon icon="Plus" size={14} />
                Create a goal
              </button>
            )}
          </div>
        )}

        {!isLoading && goals.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}>
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => setEditGoal(goal)}
                onDelete={() => handleDelete(goal.id)}
                onLogProgress={() => setLogGoal(goal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <GoalFormModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editGoal && (
        <GoalFormModal
          initial={editGoal}
          onSave={handleEdit}
          onClose={() => setEditGoal(null)}
        />
      )}
      {logGoal && (
        <LogProgressModal
          goal={logGoal}
          onClose={() => setLogGoal(null)}
        />
      )}
    </div>
  )
}
