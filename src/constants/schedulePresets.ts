// ── Schedule types ───────────────────────────────────────────────────────────

export interface ScheduleSlot {
  id: string
  boardId: string
  startTime: string  // "HH:mm" format, e.g. "06:00"
  endTime: string    // "HH:mm" format, e.g. "09:00"
  days: number[]     // 0=Sun, 1=Mon, ..., 6=Sat. Empty = every day
}

export interface BoardSchedule {
  enabled: boolean
  slots: ScheduleSlot[]
}

export const DEFAULT_SCHEDULE: BoardSchedule = {
  enabled: false,
  slots: [],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:mm" into total minutes since midnight */
export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Format total minutes since midnight into "HH:mm" */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Check if a given time (minutes since midnight) falls within a slot */
export function isTimeInSlot(nowMinutes: number, slot: ScheduleSlot): boolean {
  const start = parseTime(slot.startTime)
  const end = parseTime(slot.endTime)

  // Handle overnight spans (e.g. 22:00 - 06:00)
  if (start <= end) {
    return nowMinutes >= start && nowMinutes < end
  }
  return nowMinutes >= start || nowMinutes < end
}

/** Check if a slot applies to a given day of the week */
export function isSlotActiveOnDay(slot: ScheduleSlot, day: number): boolean {
  return slot.days.length === 0 || slot.days.includes(day)
}

/** Find the active slot for the current time */
export function findActiveSlot(
  schedule: BoardSchedule,
  now: Date = new Date()
): ScheduleSlot | null {
  if (!schedule.enabled || schedule.slots.length === 0) return null

  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()

  for (const slot of schedule.slots) {
    if (isSlotActiveOnDay(slot, day) && isTimeInSlot(minutes, slot)) {
      return slot
    }
  }
  return null
}
