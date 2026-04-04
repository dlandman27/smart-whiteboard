import { notify } from '../lib/notify.js'

interface NotifEntry {
  id:        string
  title:     string
  body:      string
  priority?: string
  tags?:     string[]
  ts:        number
}

export const notifLog: NotifEntry[] = []

export function loggedNotify(title: string, body: string, opts: Parameters<typeof notify>[2] = {}) {
  notifLog.unshift({
    id:       crypto.randomUUID(),
    title,
    body,
    priority: opts?.priority,
    tags:     opts?.tags,
    ts:       Date.now(),
  })
  if (notifLog.length > 100) notifLog.pop()
  return notify(title, body, opts)
}
