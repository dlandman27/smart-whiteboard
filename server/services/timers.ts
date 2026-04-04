export interface TimerEntry {
  id:         string
  label:      string
  durationMs: number
  startedAt:  number
  fired:      boolean
}

export const activeTimers = new Map<string, TimerEntry>()
