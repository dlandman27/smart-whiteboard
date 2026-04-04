import type { Client } from '@notionhq/client'
import { startBriefingCron } from './briefing.js'
import { startTimerCron } from './timers.js'
import { startReminderCron } from './reminders.js'

export function startAllCrons(notion: Client) {
  startBriefingCron(notion)
  startTimerCron()
  startReminderCron()
}
