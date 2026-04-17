import { loadReminders, saveReminders } from '../services/reminders.js'
import { loggedNotify } from '../services/notify.js'
import { broadcast } from '../ws.js'
import { agentEvents } from '../agents/scheduler.js'

export function startReminderCron() {
  setInterval(() => {
    const now       = Date.now()
    const reminders = loadReminders()
    let   changed   = false
    for (const reminder of reminders) {
      if (reminder.fired) continue
      if (new Date(reminder.fireAt).getTime() <= now) {
        reminder.fired = true
        changed = true
        broadcast({ type: 'speak_briefing', text: `Reminder: ${reminder.text}`, id: crypto.randomUUID() })
        loggedNotify('🔔 Reminder', reminder.text, { priority: 'high', tags: ['reminder'] })
        agentEvents.emit('reminder_fired', reminder.text)
      }
    }
    if (changed) saveReminders(reminders)
  }, 60_000)
}
