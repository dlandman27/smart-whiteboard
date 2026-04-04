import { activeTimers } from '../timers.js'
import { loadReminders, saveReminders } from '../reminders.js'
import type { VoiceTool } from './_types.js'

export const timerTools: VoiceTool[] = [
  {
    definition: {
      name:        'set_timer',
      description: 'Start a countdown timer that speaks an alert when it finishes. Use for "set a 10 minute timer", "remind me in 5 minutes", etc.',
      input_schema: {
        type: 'object' as const,
        properties: {
          durationSeconds: { type: 'number', description: 'Timer duration in seconds, e.g. 600 for 10 minutes' },
          label:           { type: 'string', description: 'What the timer is for, e.g. "pasta", "laundry". Used in the alert.' },
        },
        required: ['durationSeconds'],
      },
    },
    execute: async (input) => {
      const { durationSeconds, label = '' } = input as { durationSeconds: number; label?: string }
      const id = crypto.randomUUID()
      activeTimers.set(id, {
        id,
        label:      label || `${Math.round(durationSeconds / 60)} minute timer`,
        durationMs: durationSeconds * 1000,
        startedAt:  Date.now(),
        fired:      false,
      })
      const mins = Math.floor(durationSeconds / 60)
      const secs = durationSeconds % 60
      const dur  = mins > 0 ? `${mins} minute${mins !== 1 ? 's' : ''}${secs > 0 ? ` ${secs} seconds` : ''}` : `${secs} seconds`
      return `Timer set for ${dur}${label ? ` (${label})` : ''} (id: ${id})`
    },
  },

  {
    definition: {
      name:        'list_timers',
      description: 'List all active (not yet fired) timers and how much time is left on each.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async () => {
      const now     = Date.now()
      const running = [...activeTimers.values()].filter((t) => !t.fired)
      if (!running.length) return 'No active timers.'
      return running.map((t) => {
        const remaining = Math.max(0, t.durationMs - (now - t.startedAt))
        const mins = Math.floor(remaining / 60_000)
        const secs = Math.floor((remaining % 60_000) / 1000)
        const timeLeft = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
        return `"${t.label}" — ${timeLeft} left (id: ${t.id})`
      }).join('\n')
    },
  },

  {
    definition: {
      name:        'cancel_timer',
      description: 'Cancel an active timer before it fires.',
      input_schema: {
        type: 'object' as const,
        properties: {
          timerId: { type: 'string', description: 'Timer ID from list_timers' },
        },
        required: ['timerId'],
      },
    },
    execute: async (input) => {
      const timer = activeTimers.get(input.timerId)
      if (!timer) return `No timer found with id ${input.timerId}`
      activeTimers.delete(input.timerId)
      return `Cancelled "${timer.label}"`
    },
  },

  {
    definition: {
      name:        'set_reminder',
      description: 'Set a reminder to fire at a specific time. Walli will speak the reminder text and send a push notification. Use for "remind me at 3pm to call mom", "remind me tomorrow morning to take out the trash".',
      input_schema: {
        type: 'object' as const,
        properties: {
          text:   { type: 'string', description: 'What to remind the user. Spoken aloud when the reminder fires, e.g. "Call mom".' },
          fireAt: { type: 'string', description: 'ISO 8601 datetime when the reminder should fire, e.g. "2026-04-04T15:00:00". Use the current date/time context to resolve relative times like "tomorrow at 9am".' },
        },
        required: ['text', 'fireAt'],
      },
    },
    execute: async (input) => {
      const { text, fireAt } = input as { text: string; fireAt: string }
      const reminders = loadReminders()
      const id = crypto.randomUUID()
      reminders.push({ id, text, fireAt, fired: false })
      saveReminders(reminders)
      const when = new Date(fireAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      return `Reminder set for ${when}: "${text}" (id: ${id})`
    },
  },

  {
    definition: {
      name:        'list_reminders',
      description: 'List all upcoming (not yet fired) reminders.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async () => {
      const reminders = loadReminders().filter((r) => !r.fired)
      if (!reminders.length) return 'No upcoming reminders.'
      return reminders.map((r) => {
        const when = new Date(r.fireAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        return `"${r.text}" — ${when} (id: ${r.id})`
      }).join('\n')
    },
  },

  {
    definition: {
      name:        'cancel_reminder',
      description: 'Cancel an upcoming reminder.',
      input_schema: {
        type: 'object' as const,
        properties: {
          reminderId: { type: 'string', description: 'Reminder ID from list_reminders' },
        },
        required: ['reminderId'],
      },
    },
    execute: async (input) => {
      const reminders = loadReminders()
      const idx = reminders.findIndex((r) => r.id === input.reminderId)
      if (idx === -1) return `No reminder found with id ${input.reminderId}`
      const [removed] = reminders.splice(idx, 1)
      saveReminders(reminders)
      return `Cancelled reminder: "${removed.text}"`
    },
  },
]
