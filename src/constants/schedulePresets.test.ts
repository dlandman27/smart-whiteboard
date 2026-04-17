import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SCHEDULE,
  parseTime,
  formatTime,
  isTimeInSlot,
  isSlotActiveOnDay,
  findActiveSlot,
  type ScheduleSlot,
  type BoardSchedule,
} from './schedulePresets'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 'slot-1',
    boardId: 'board-1',
    startTime: '09:00',
    endTime: '17:00',
    days: [],
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<BoardSchedule> = {}): BoardSchedule {
  return {
    enabled: true,
    slots: [],
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('schedulePresets constants', () => {
  describe('DEFAULT_SCHEDULE', () => {
    it('has enabled set to false', () => {
      expect(DEFAULT_SCHEDULE.enabled).toBe(false)
    })

    it('has an empty slots array', () => {
      expect(Array.isArray(DEFAULT_SCHEDULE.slots)).toBe(true)
      expect(DEFAULT_SCHEDULE.slots).toHaveLength(0)
    })
  })

  describe('parseTime', () => {
    it('parses midnight as 0', () => {
      expect(parseTime('00:00')).toBe(0)
    })

    it('parses 01:00 as 60', () => {
      expect(parseTime('01:00')).toBe(60)
    })

    it('parses 09:30 as 570', () => {
      expect(parseTime('09:30')).toBe(570)
    })

    it('parses 23:59 as 1439', () => {
      expect(parseTime('23:59')).toBe(1439)
    })

    it('parses 12:00 as 720', () => {
      expect(parseTime('12:00')).toBe(720)
    })
  })

  describe('formatTime', () => {
    it('formats 0 as 00:00', () => {
      expect(formatTime(0)).toBe('00:00')
    })

    it('formats 60 as 01:00', () => {
      expect(formatTime(60)).toBe('01:00')
    })

    it('formats 570 as 09:30', () => {
      expect(formatTime(570)).toBe('09:30')
    })

    it('formats 1439 as 23:59', () => {
      expect(formatTime(1439)).toBe('23:59')
    })

    it('wraps at 24 hours — 1440 formats as 00:00', () => {
      expect(formatTime(1440)).toBe('00:00')
    })

    it('round-trips with parseTime', () => {
      const times = ['00:00', '06:30', '09:00', '12:15', '23:59']
      for (const t of times) {
        expect(formatTime(parseTime(t))).toBe(t)
      }
    })
  })

  describe('isTimeInSlot', () => {
    it('returns true when time is within slot', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00' })
      expect(isTimeInSlot(600, slot)).toBe(true)  // 10:00
    })

    it('returns true at exactly start time', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00' })
      expect(isTimeInSlot(540, slot)).toBe(true)  // 09:00
    })

    it('returns false at exactly end time (exclusive)', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00' })
      expect(isTimeInSlot(1020, slot)).toBe(false)  // 17:00
    })

    it('returns false before slot start', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00' })
      expect(isTimeInSlot(480, slot)).toBe(false)  // 08:00
    })

    it('returns false after slot end', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00' })
      expect(isTimeInSlot(1080, slot)).toBe(false)  // 18:00
    })

    it('handles overnight spans — returns true at 23:00 for 22:00-06:00', () => {
      const slot = makeSlot({ startTime: '22:00', endTime: '06:00' })
      expect(isTimeInSlot(1380, slot)).toBe(true)  // 23:00
    })

    it('handles overnight spans — returns true at 02:00 for 22:00-06:00', () => {
      const slot = makeSlot({ startTime: '22:00', endTime: '06:00' })
      expect(isTimeInSlot(120, slot)).toBe(true)  // 02:00
    })

    it('handles overnight spans — returns false at 12:00 for 22:00-06:00', () => {
      const slot = makeSlot({ startTime: '22:00', endTime: '06:00' })
      expect(isTimeInSlot(720, slot)).toBe(false)  // 12:00
    })
  })

  describe('isSlotActiveOnDay', () => {
    it('returns true for any day when days array is empty (every day)', () => {
      const slot = makeSlot({ days: [] })
      for (let day = 0; day <= 6; day++) {
        expect(isSlotActiveOnDay(slot, day)).toBe(true)
      }
    })

    it('returns true when the day is in the days array', () => {
      const slot = makeSlot({ days: [1, 2, 3, 4, 5] })  // Mon–Fri
      expect(isSlotActiveOnDay(slot, 1)).toBe(true)
      expect(isSlotActiveOnDay(slot, 5)).toBe(true)
    })

    it('returns false when the day is not in the days array', () => {
      const slot = makeSlot({ days: [1, 2, 3, 4, 5] })  // Mon–Fri
      expect(isSlotActiveOnDay(slot, 0)).toBe(false)  // Sunday
      expect(isSlotActiveOnDay(slot, 6)).toBe(false)  // Saturday
    })
  })

  describe('findActiveSlot', () => {
    it('returns null when schedule is disabled', () => {
      const slot = makeSlot()
      const schedule = makeSchedule({ enabled: false, slots: [slot] })
      expect(findActiveSlot(schedule, new Date())).toBeNull()
    })

    it('returns null when slots array is empty', () => {
      const schedule = makeSchedule({ enabled: true, slots: [] })
      expect(findActiveSlot(schedule, new Date())).toBeNull()
    })

    it('returns the active slot when time and day match', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00', days: [] })
      const schedule = makeSchedule({ enabled: true, slots: [slot] })
      // Use a fixed Monday at 10:00
      const monday10am = new Date('2025-01-06T10:00:00')
      expect(findActiveSlot(schedule, monday10am)).toBe(slot)
    })

    it('returns null when time is outside all slots', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00', days: [] })
      const schedule = makeSchedule({ enabled: true, slots: [slot] })
      const lateNight = new Date('2025-01-06T23:00:00')
      expect(findActiveSlot(schedule, lateNight)).toBeNull()
    })

    it('returns null when day does not match slot days', () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '17:00', days: [1, 2, 3, 4, 5] })  // Mon–Fri
      const schedule = makeSchedule({ enabled: true, slots: [slot] })
      // Sunday at 10:00
      const sunday10am = new Date('2025-01-05T10:00:00')
      expect(findActiveSlot(schedule, sunday10am)).toBeNull()
    })

    it('returns first matching slot when multiple slots defined', () => {
      const slot1 = makeSlot({ id: 's1', startTime: '06:00', endTime: '09:00', days: [] })
      const slot2 = makeSlot({ id: 's2', startTime: '09:00', endTime: '17:00', days: [] })
      const schedule = makeSchedule({ enabled: true, slots: [slot1, slot2] })
      const earlyMorning = new Date('2025-01-06T07:00:00')
      expect(findActiveSlot(schedule, earlyMorning)).toBe(slot1)
    })
  })
})
