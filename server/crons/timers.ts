import { activeTimers } from '../services/timers.js'
import { loggedNotify } from '../services/notify.js'
import { broadcast } from '../ws.js'

export function startTimerCron() {
  setInterval(() => {
    const now = Date.now()
    for (const [id, timer] of activeTimers) {
      if (timer.fired) continue
      if (now - timer.startedAt >= timer.durationMs) {
        timer.fired = true
        broadcast({ type: 'speak_briefing', text: `${timer.label} is done.`, id: crypto.randomUUID() })
        broadcast({ type: 'timer_alert', timerId: id, label: timer.label })
        loggedNotify('⏰ Timer done', timer.label, { priority: 'high', tags: ['timer'] })
        setTimeout(() => activeTimers.delete(id), 5 * 60_000)
      }
    }
  }, 5_000)
}
