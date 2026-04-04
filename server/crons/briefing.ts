import type { Client } from '@notionhq/client'
import { loadTokens } from '../services/tokens.js'
import { compileBriefing } from '../services/briefing.js'
import { broadcast } from '../ws.js'

export function startBriefingCron(notion: Client) {
  setInterval(async () => {
    const tokens = loadTokens()
    const target = tokens?.briefing_time  // e.g. "07:30"
    if (!target) return
    const now  = new Date()
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    if (hhmm !== target) return
    try {
      const text = await compileBriefing(notion)
      broadcast({ type: 'speak_briefing', text, id: crypto.randomUUID() })
      console.log('[briefing] fired at', hhmm)
    } catch (e) {
      console.error('[briefing] error:', e)
    }
  }, 60_000)
}
