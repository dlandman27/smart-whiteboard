import db from './db.js'

export interface Reminder {
  id:     string
  text:   string
  fireAt: string   // ISO 8601
  fired:  boolean
}

type ReminderRow = { id: string; text: string; fire_at: string; fired: number }

export function loadReminders(): Reminder[] {
  return (db.prepare('SELECT id, text, fire_at, fired FROM reminders').all() as ReminderRow[])
    .map((r) => ({ id: r.id, text: r.text, fireAt: r.fire_at, fired: r.fired === 1 }))
}

export function saveReminders(reminders: Reminder[]): void {
  const insert = db.prepare(
    'INSERT OR REPLACE INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)'
  )
  db.transaction(() => {
    db.prepare('DELETE FROM reminders').run()
    for (const r of reminders) insert.run(r.id, r.text, r.fireAt, r.fired ? 1 : 0)
  })()
}
