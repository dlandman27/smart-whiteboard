import { useEffect, useRef } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'
import { findActiveSlot } from '../constants/schedulePresets'

/** Minimum ms since last manual board switch before auto-switching kicks in */
const MANUAL_OVERRIDE_MS = 5 * 60 * 1000 // 5 minutes

/** How often to check the schedule (ms) */
const CHECK_INTERVAL_MS = 60 * 1000 // 60 seconds

/**
 * Runs a check every 60 seconds. If scheduling is enabled and current time
 * matches a slot, auto-switches to that board — unless the user manually
 * switched within the last 5 minutes.
 */
export function useScheduleEngine() {
  const lastSwitchedBoardRef = useRef<string | null>(null)

  useEffect(() => {
    function check() {
      const { schedule, boards, activeBoardId, lastManualSwitch, setActiveBoard } =
        useWhiteboardStore.getState()

      if (!schedule.enabled) return

      // Respect manual override
      if (Date.now() - lastManualSwitch < MANUAL_OVERRIDE_MS) return

      const slot = findActiveSlot(schedule)
      if (!slot) return

      // Only switch if the target board exists and is different
      const targetExists = boards.some((b) => b.id === slot.boardId)
      if (!targetExists) return
      if (slot.boardId === activeBoardId && slot.boardId === lastSwitchedBoardRef.current) return

      lastSwitchedBoardRef.current = slot.boardId
      setActiveBoard(slot.boardId)
    }

    // Run immediately on mount
    check()

    const timer = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])
}
