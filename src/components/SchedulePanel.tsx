import { Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore } from '../store/whiteboard'
import type { ScheduleSlot, BoardSchedule } from '../constants/schedulePresets'
import { findActiveSlot } from '../constants/schedulePresets'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Helpers ──────────────────────────────────────────────────────────────────

function createSlot(boardId: string): ScheduleSlot {
  return {
    id: crypto.randomUUID(),
    boardId,
    startTime: '09:00',
    endTime: '17:00',
    days: [],
  }
}

// ── Slot row ─────────────────────────────────────────────────────────────────

function SlotRow({
  slot,
  boards,
  onUpdate,
  onRemove,
}: {
  slot: ScheduleSlot
  boards: { id: string; name: string }[]
  onUpdate: (updated: ScheduleSlot) => void
  onRemove: () => void
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: 'var(--wt-surface)',
        border: '1px solid var(--wt-border)',
      }}
    >
      {/* Board selector */}
      <div className="flex items-center gap-2">
        <select
          value={slot.boardId}
          onChange={(e) => onUpdate({ ...slot, boardId: e.target.value })}
          className="flex-1 text-sm rounded-lg px-3 py-2"
          style={{
            background: 'var(--wt-bg)',
            color: 'var(--wt-text)',
            border: '1px solid var(--wt-border)',
            outline: 'none',
          }}
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 32,
            height: 32,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--wt-text-muted)',
          }}
          onPointerEnter={(e) => { e.currentTarget.style.color = 'var(--wt-danger, #ef4444)' }}
          onPointerLeave={(e) => { e.currentTarget.style.color = 'var(--wt-text-muted)' }}
        >
          <Icon icon="Trash" size={15} />
        </button>
      </div>

      {/* Time pickers */}
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={slot.startTime}
          onChange={(e) => onUpdate({ ...slot, startTime: e.target.value })}
          className="flex-1 text-sm rounded-lg px-3 py-2"
          style={{
            background: 'var(--wt-bg)',
            color: 'var(--wt-text)',
            border: '1px solid var(--wt-border)',
            outline: 'none',
          }}
        />
        <span className="text-xs font-medium" style={{ color: 'var(--wt-text-muted)' }}>to</span>
        <input
          type="time"
          value={slot.endTime}
          onChange={(e) => onUpdate({ ...slot, endTime: e.target.value })}
          className="flex-1 text-sm rounded-lg px-3 py-2"
          style={{
            background: 'var(--wt-bg)',
            color: 'var(--wt-text)',
            border: '1px solid var(--wt-border)',
            outline: 'none',
          }}
        />
      </div>

      {/* Day selector */}
      <div className="flex gap-1">
        {DAY_LABELS.map((label, dayIdx) => {
          const isActive = slot.days.length === 0 || slot.days.includes(dayIdx)
          const isExplicit = slot.days.includes(dayIdx)
          return (
            <button
              key={dayIdx}
              onClick={() => {
                let next: number[]
                if (slot.days.length === 0) {
                  // Switching from "every day" to specific: select all except this one
                  next = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== dayIdx)
                } else if (isExplicit) {
                  next = slot.days.filter((d) => d !== dayIdx)
                  // If removing leaves all 7, reset to empty (= every day)
                } else {
                  next = [...slot.days, dayIdx].sort()
                }
                if (next.length === 7) next = []
                onUpdate({ ...slot, days: next })
              }}
              className="flex items-center justify-center rounded-md text-[10px] font-semibold transition-colors"
              style={{
                width: 32,
                height: 28,
                background: isActive
                  ? 'color-mix(in srgb, var(--wt-accent) 18%, transparent)'
                  : 'var(--wt-bg)',
                color: isActive ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
                border: `1px solid ${isActive ? 'color-mix(in srgb, var(--wt-accent) 30%, transparent)' : 'var(--wt-border)'}`,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      <span className="text-[10px]" style={{ color: 'var(--wt-text-muted)', marginTop: -4 }}>
        {slot.days.length === 0 ? 'Every day' : `${slot.days.map((d) => DAY_LABELS[d]).join(', ')}`}
      </span>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function SchedulePanel() {
  const { boards, schedule, setSchedule } = useWhiteboardStore()
  // Only show user-created boards as schedule targets
  const userBoards = boards.filter((b) => !b.boardType)

  const activeSlot = findActiveSlot(schedule)
  const activeSlotBoard = activeSlot
    ? boards.find((b) => b.id === activeSlot.boardId)
    : null

  function updateSlot(slotId: string, updated: ScheduleSlot) {
    setSchedule({
      ...schedule,
      slots: schedule.slots.map((s) => (s.id === slotId ? updated : s)),
    })
  }

  function removeSlot(slotId: string) {
    setSchedule({
      ...schedule,
      slots: schedule.slots.filter((s) => s.id !== slotId),
    })
  }

  function addSlot() {
    const defaultBoardId = userBoards[0]?.id ?? ''
    if (!defaultBoardId) return
    setSchedule({
      ...schedule,
      slots: [...schedule.slots, createSlot(defaultBoardId)],
    })
  }

  function toggleEnabled() {
    setSchedule({ ...schedule, enabled: !schedule.enabled })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toggle */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--wt-surface)',
          border: '1px solid var(--wt-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--wt-text)' }}>
              Screen Scheduling
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--wt-text-muted)' }}>
              Auto-switch boards based on time of day
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            className="relative flex-shrink-0 transition-colors rounded-full"
            style={{
              width: 42,
              height: 24,
              backgroundColor: schedule.enabled ? 'var(--wt-accent)' : 'var(--wt-border)',
              border: 'none',
              cursor: 'pointer',
              padding: 3,
            }}
          >
            <span
              className="block rounded-full bg-white transition-transform"
              style={{
                width: 18,
                height: 18,
                transform: schedule.enabled ? 'translateX(18px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>

        {/* Status indicator */}
        {schedule.enabled && (
          <div
            className="flex items-center gap-2 mt-3 rounded-lg px-3 py-2"
            style={{
              background: activeSlotBoard
                ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)'
                : 'color-mix(in srgb, var(--wt-text) 5%, transparent)',
              border: `1px solid ${activeSlotBoard ? 'color-mix(in srgb, var(--wt-accent) 20%, transparent)' : 'var(--wt-border)'}`,
            }}
          >
            <Icon
              icon={activeSlotBoard ? 'Clock' : 'ClockAfternoon'}
              size={14}
              style={{ color: activeSlotBoard ? 'var(--wt-accent)' : 'var(--wt-text-muted)' }}
            />
            <span className="text-xs" style={{ color: activeSlotBoard ? 'var(--wt-accent)' : 'var(--wt-text-muted)' }}>
              {activeSlotBoard
                ? `Currently scheduled: ${activeSlotBoard.name}`
                : 'No board scheduled right now'}
            </span>
          </div>
        )}
      </div>

      {/* Slot list */}
      {schedule.enabled && (
        <>
          {schedule.slots.length > 0 && (
            <div className="flex flex-col gap-3">
              {schedule.slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  boards={userBoards}
                  onUpdate={(updated) => updateSlot(slot.id, updated)}
                  onRemove={() => removeSlot(slot.id)}
                />
              ))}
            </div>
          )}

          {/* Add slot */}
          {userBoards.length > 0 && (
            <button
              onClick={addSlot}
              className="flex items-center justify-center gap-2 rounded-xl py-3 transition-colors"
              style={{
                background: 'var(--wt-surface)',
                border: '1px dashed var(--wt-border)',
                cursor: 'pointer',
                color: 'var(--wt-text-muted)',
              }}
              onPointerEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--wt-accent)'
                e.currentTarget.style.color = 'var(--wt-accent)'
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--wt-border)'
                e.currentTarget.style.color = 'var(--wt-text-muted)'
              }}
            >
              <Icon icon="Plus" size={14} />
              <span className="text-xs font-medium">Add time slot</span>
            </button>
          )}

          {userBoards.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--wt-text-muted)' }}>
              Create at least one board to set up scheduling.
            </p>
          )}
        </>
      )}
    </div>
  )
}
