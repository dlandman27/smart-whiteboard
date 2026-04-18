import { useState } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import {
  useRoutines, useRoutineCompletions, useToggleRoutine,
  useCreateRoutine, useUpdateRoutine, useDeleteRoutine,
  type Routine,
} from '../hooks/useRoutines'

// ── Types & constants ─────────────────────────────────────────────────────────

type Category = 'morning' | 'daily' | 'evening'

const CATEGORIES: { key: Category; label: string; icon: string; timeLabel: string; timeRange: string }[] = [
  { key: 'morning', label: 'Morning',  icon: 'Sun',    timeLabel: 'Start your day',  timeRange: '5am – 12pm' },
  { key: 'daily',   label: 'Daily',    icon: 'Repeat', timeLabel: 'Any time',        timeRange: 'All day'    },
  { key: 'evening', label: 'Evening',  icon: 'Moon',   timeLabel: 'Wind down',       timeRange: '6pm – 11pm' },
]

const CATEGORY_COLORS: Record<Category, string> = {
  morning: '#f97316',
  daily:   '#3b82f6',
  evening: '#8b5cf6',
}

const EMOJI_OPTIONS = ['✅', '💪', '📚', '🧘', '🏃', '💧', '🛏️', '🧹', '📝', '🎯', '🌿', '🍎', '☕', '🚿', '🧠']

function currentCategory(): Category {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'daily'
  return 'evening'
}

// ── Routine row ───────────────────────────────────────────────────────────────

function RoutineRow({
  routine, completed, color, managing,
  onToggle, onEdit, onDelete,
}: {
  routine:   Routine
  completed: boolean
  color:     string
  managing:  boolean
  onToggle:  () => void
  onEdit:    () => void
  onDelete:  () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10,
        background: hovered ? 'var(--wt-surface-hover)' : 'transparent',
        transition: 'background 0.15s',
        cursor: 'default',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          border: completed ? 'none' : `2px solid ${color}55`,
          background: completed ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {completed && (
          <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{routine.emoji}</span>

      <span style={{
        flex: 1, fontSize: 14, fontWeight: 450,
        color: completed ? 'var(--wt-text-muted)' : 'var(--wt-text)',
        textDecoration: completed ? 'line-through' : 'none',
        transition: 'color 0.15s',
      }}>
        {routine.title}
      </span>

      {managing && hovered && (
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={onEdit} style={iconBtnStyle}>
            <Icon icon="PencilSimple" size={13} />
          </button>
          <button onClick={onDelete} style={{ ...iconBtnStyle, color: 'var(--wt-danger)' }}>
            <Icon icon="Trash" size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, borderRadius: 6, border: 'none',
  background: 'var(--wt-surface)', cursor: 'pointer',
  color: 'var(--wt-text-muted)',
}

// ── Add / edit form ───────────────────────────────────────────────────────────

function RoutineForm({
  initial, category, onSave, onCancel,
}: {
  initial?:  Partial<Routine>
  category:  Category
  onSave:    (data: Pick<Routine, 'title' | 'category' | 'emoji'>) => void
  onCancel:  () => void
}) {
  const [title,    setTitle]    = useState(initial?.title    ?? '')
  const [cat,      setCat]      = useState<Category>(initial?.category ?? category)
  const [emoji,    setEmoji]    = useState(initial?.emoji    ?? '✅')
  const [showPick, setShowPick] = useState(false)

  return (
    <div style={{
      margin: '6px 0', padding: '12px 14px', borderRadius: 10,
      background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShowPick(p => !p)}
          style={{
            width: 36, height: 34, borderRadius: 7, border: '1px solid var(--wt-border)',
            background: 'var(--wt-bg)', fontSize: 16, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {emoji}
        </button>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSave({ title: title.trim(), category: cat, emoji }) }}
          placeholder="Routine name…"
          style={{
            flex: 1, padding: '5px 10px', borderRadius: 7, fontSize: 13,
            border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        />
      </div>

      {showPick && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => { setEmoji(e); setShowPick(false) }}
              style={{
                width: 30, height: 30, fontSize: 16, borderRadius: 6, border: 'none',
                background: e === emoji ? 'var(--wt-accent)' : 'var(--wt-border)',
                cursor: 'pointer',
              }}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 5 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setCat(c.key)} style={{
            flex: 1, padding: '4px 6px', borderRadius: 7, fontSize: 11, fontWeight: 500,
            border: `1.5px solid ${cat === c.key ? CATEGORY_COLORS[c.key] : 'var(--wt-border)'}`,
            background: cat === c.key ? `${CATEGORY_COLORS[c.key]}18` : 'transparent',
            color: cat === c.key ? CATEGORY_COLORS[c.key] : 'var(--wt-text-muted)',
            cursor: 'pointer',
          }}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ ...iconBtnStyle, width: 'auto', padding: '5px 12px', fontSize: 12, borderRadius: 9 }}>
          Cancel
        </button>
        <button
          onClick={() => { if (title.trim()) onSave({ title: title.trim(), category: cat, emoji }) }}
          style={{
            padding: '5px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600,
            background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
            border: 'none', cursor: 'pointer',
          }}
        >
          {initial ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ── Category card ─────────────────────────────────────────────────────────────

function CategoryCard({
  cat, routines, completedIds, managing, isCurrent,
  onToggle, onEdit, onDelete, onAdd,
  adding, editing, onSaveNew, onCancelNew, onSaveEdit, onCancelEdit,
}: {
  cat:          typeof CATEGORIES[0]
  routines:     Routine[]
  completedIds: string[]
  managing:     boolean
  isCurrent:    boolean
  onToggle:     (id: string, completed: boolean) => void
  onEdit:       (r: Routine) => void
  onDelete:     (id: string) => void
  onAdd:        () => void
  adding:       boolean
  editing:      Routine | null
  onSaveNew:    (data: Pick<Routine, 'title' | 'category' | 'emoji'>) => void
  onCancelNew:  () => void
  onSaveEdit:   (data: Pick<Routine, 'title' | 'category' | 'emoji'>) => void
  onCancelEdit: () => void
}) {
  const color   = CATEGORY_COLORS[cat.key]
  const done    = routines.filter(r => completedIds.includes(r.id)).length
  const total   = routines.length
  const allDone = total > 0 && done === total
  const pct     = total > 0 ? done / total : 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${isCurrent ? color + '35' : 'var(--wt-border)'}`,
      background: 'var(--wt-surface)',
      boxShadow: isCurrent
        ? `0 0 0 1px ${color}20, 0 4px 20px ${color}12, var(--wt-shadow-sm)`
        : 'var(--wt-shadow-sm)',
      transition: 'box-shadow 0.3s, border-color 0.3s',
    }}>
      {/* Colored top bar */}
      <div style={{ height: 3, background: color, opacity: isCurrent ? 1 : 0.3, transition: 'opacity 0.3s' }} />

      {/* Card header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: total > 0 || managing ? '1px solid var(--wt-border)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Icon */}
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon icon={cat.icon as any} size={16} style={{ color }} />
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 650, color: 'var(--wt-text)' }}>
                {cat.label}
              </span>
              {isCurrent && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                  background: color, color: 'var(--wt-accent-text)', letterSpacing: '0.06em',
                }}>
                  NOW
                </span>
              )}
              {allDone && <span style={{ fontSize: 13 }}>🎉</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--wt-text-muted)', marginTop: 1 }}>
              {cat.timeRange}
            </div>
          </div>

          {/* Progress */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: allDone ? 'var(--wt-success)' : 'var(--wt-text)', lineHeight: 1 }}>
              {done}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--wt-text-muted)' }}>/{total}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--wt-text-muted)', marginTop: 2 }}>done</div>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{
            marginTop: 10, height: 4, borderRadius: 4,
            background: 'var(--wt-border)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: allDone ? 'var(--wt-success)' : color,
              width: `${pct * 100}%`,
              transition: 'width 0.4s ease, background 0.3s',
            }} />
          </div>
        )}
      </div>

      {/* Routine list */}
      <div style={{ padding: '4px 4px' }}>
        {routines.map(r => (
          <RoutineRow
            key={r.id}
            routine={r}
            completed={completedIds.includes(r.id)}
            color={color}
            managing={managing}
            onToggle={() => onToggle(r.id, completedIds.includes(r.id))}
            onEdit={() => onEdit(r)}
            onDelete={() => onDelete(r.id)}
          />
        ))}

        {/* Inline forms */}
        {adding && (
          <div style={{ padding: '0 4px' }}>
            <RoutineForm
              category={cat.key}
              onSave={onSaveNew}
              onCancel={onCancelNew}
            />
          </div>
        )}
        {editing && (
          <div style={{ padding: '0 4px' }}>
            <RoutineForm
              initial={editing}
              category={editing.category}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
            />
          </div>
        )}

        {/* Add button in manage mode */}
        {managing && !adding && !editing && (
          <button
            onClick={onAdd}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 12px', border: 'none', background: 'transparent',
              cursor: 'pointer', color: 'var(--wt-text-muted)', fontSize: 12,
              borderRadius: 9,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon icon="Plus" size={13} />
            Add routine
          </button>
        )}

        {/* Empty state */}
        {!managing && routines.length === 0 && (
          <div style={{ padding: '12px 14px 10px', fontSize: 12, color: 'var(--wt-text-muted)', fontStyle: 'italic' }}>
            No routines yet
          </div>
        )}
      </div>
    </div>
  )
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ routines, completedIds }: { routines: Routine[]; completedIds: string[] }) {
  const total = routines.length
  const done  = routines.filter(r => completedIds.includes(r.id)).length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  if (total === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'var(--wt-surface)',
      border: '1px solid var(--wt-border)',
      borderRadius: 10,
      marginBottom: 2,
    }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--wt-border)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: pct === 100 ? 'var(--wt-success)' : 'var(--wt-accent)',
          width: `${pct}%`, transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-text)', flexShrink: 0 }}>
        {done}/{total}
      </span>
      <span style={{ fontSize: 12, color: 'var(--wt-text-muted)', flexShrink: 0 }}>
        {pct === 100 ? '🎉 All done' : `${pct}% today`}
      </span>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function RoutinesBoardView() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: routines = [] }    = useRoutines()
  const { data: completedIds = [] } = useRoutineCompletions(today)
  const toggle    = useToggleRoutine()
  const createMut = useCreateRoutine()
  const updateMut = useUpdateRoutine()
  const deleteMut = useDeleteRoutine()

  const [managing, setManaging] = useState(false)
  const [adding,   setAdding]   = useState<Category | null>(null)
  const [editing,  setEditing]  = useState<Routine | null>(null)

  const current    = currentCategory()
  const byCategory = (cat: Category) => routines.filter(r => r.category === cat)

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--wt-bg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 14px',
        borderBottom: '1px solid var(--wt-border)',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--wt-text)', letterSpacing: '-0.02em' }}>
            Routines
          </h1>
          <div style={{ fontSize: 12, color: 'var(--wt-text-muted)', marginTop: 2 }}>{dateStr}</div>
        </div>

        <button
          onClick={() => { setManaging(m => !m); setAdding(null); setEditing(null) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550,
            border: `1.5px solid ${managing ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
            background: managing ? 'var(--wt-accent)' : 'transparent',
            color: managing ? 'var(--wt-accent-text)' : 'var(--wt-text)',
            cursor: 'pointer',
          }}
        >
          <Icon icon={managing ? 'Check' : 'Sliders'} size={13} />
          {managing ? 'Done' : 'Manage'}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SummaryStrip routines={routines} completedIds={completedIds} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          alignItems: 'start',
        }}>
          {CATEGORIES.map(cat => (
            <CategoryCard
              key={cat.key}
              cat={cat}
              routines={byCategory(cat.key)}
              completedIds={completedIds}
              managing={managing}
              isCurrent={cat.key === current}
              onToggle={(id, completed) => toggle.mutate({ id, completed, date: today })}
              onEdit={r => { setEditing(r); setAdding(null) }}
              onDelete={id => deleteMut.mutate(id)}
              onAdd={() => { setAdding(cat.key); setEditing(null) }}
              adding={adding === cat.key}
              editing={editing?.category === cat.key ? editing : null}
              onSaveNew={data => { createMut.mutate(data); setAdding(null) }}
              onCancelNew={() => setAdding(null)}
              onSaveEdit={data => { if (editing) { updateMut.mutate({ id: editing.id, ...data }); setEditing(null) } }}
              onCancelEdit={() => setEditing(null)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
