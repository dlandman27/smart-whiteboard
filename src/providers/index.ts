import type { TaskProvider, EventProvider } from './types'
import { BuiltinTaskProvider } from './tasks/builtin'
import { GTasksProvider } from './tasks/gtasks'
import { TodoistProvider } from './tasks/todoist'
import { BuiltinEventProvider } from './events/builtin'
import { GCalProvider } from './events/gcal'
import { ICalProvider } from './events/ical'

export type { TaskProvider, EventProvider } from './types'
export { BuiltinTaskProvider } from './tasks/builtin'
export { GTasksProvider } from './tasks/gtasks'
export { TodoistProvider } from './tasks/todoist'
export { BuiltinEventProvider } from './events/builtin'
export { GCalProvider } from './events/gcal'
export { ICalProvider } from './events/ical'

export function getTaskProviders(): TaskProvider[] {
  return [new BuiltinTaskProvider(), new GTasksProvider(), new TodoistProvider()]
}

export function getEventProviders(): EventProvider[] {
  return [new BuiltinEventProvider(), new GCalProvider(), new ICalProvider()]
}
