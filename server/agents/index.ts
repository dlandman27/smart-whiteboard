import { AgentScheduler }       from './scheduler.js'
import { taskMonitorAgent }      from './built-in/taskMonitor.js'
import { calendarAgent }         from './built-in/calendarAgent.js'
import { focusAgent }            from './built-in/focusAgent.js'
import { routineAgent }          from './built-in/routineAgent.js'
import { meetingCountdownAgent } from './built-in/meetingCountdown.js'
import { endOfDayAgent }         from './built-in/endOfDay.js'
import { staleTaskCleanupAgent } from './built-in/staleTaskCleanup.js'
import { loadDynamicAgents }     from './dynamic-runner.js'
import type { AgentContext }     from './types.js'

export { AgentScheduler }
export { readUserAgents, addUserAgent, removeUserAgent, updateUserAgent, buildDynamicAgent } from './dynamic-runner.js'
export type { UserAgentDef } from './dynamic-runner.js'
export type { AgentContext } from './types.js'

export function createScheduler(ctx: AgentContext): AgentScheduler {
  const scheduler = new AgentScheduler(ctx)
    .register(taskMonitorAgent)
    .register(calendarAgent)
    .register(focusAgent)
    .register(routineAgent)
    .register(meetingCountdownAgent)
    .register(endOfDayAgent)
    .register(staleTaskCleanupAgent)

  for (const agent of loadDynamicAgents()) {
    scheduler.register(agent)
  }

  return scheduler
}
