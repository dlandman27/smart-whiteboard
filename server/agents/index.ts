import { AgentScheduler }  from './scheduler.js'
import { taskMonitorAgent } from './built-in/taskMonitor.js'
import { calendarAgent }    from './built-in/calendarAgent.js'
import { focusAgent }       from './built-in/focusAgent.js'
import { routineAgent }     from './built-in/routineAgent.js'
import type { AgentContext } from './types.js'

export { AgentScheduler }
export type { AgentContext }

export function createScheduler(ctx: AgentContext): AgentScheduler {
  return new AgentScheduler(ctx)
    .register(taskMonitorAgent)
    .register(calendarAgent)
    .register(focusAgent)
    .register(routineAgent)
}
