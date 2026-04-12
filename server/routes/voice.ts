import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { Client } from '@notionhq/client'
import { VOICE_TOOLS, executeVoiceTool } from '../services/voice-tools/registry.js'
import { loadMemory, memoryToPrompt } from '../services/memory.js'
import { getBoardSnapshot } from '../services/board-utils.js'
import { AppError, asyncRoute } from '../middleware/error.js'
import { normalizeTtsText } from '../services/tts-normalize.js'
import { getNotionClient } from './notion.js'

// ── Domain classifier ─────────────────────────────────────────────────────────

type AgentDomain = 'health' | 'tasks' | 'habits' | 'calendar' | 'brief' | null

function classifyAgentDomain(text: string): AgentDomain {
  const t = text.toLowerCase()

  if (['brief me', 'morning brief', 'daily summary', 'what do i need to know'].some(kw => t.includes(kw)))
    return 'brief'

  if (['step', 'steps', 'walk', 'exercise', 'workout', 'weight', 'calories',
       'heart rate', 'health', 'fitness', 'active energy', 'apollo'].some(kw => t.includes(kw)))
    return 'health'

  if (['task', 'tasks', 'todo', 'to-do', 'to do', 'todoist', 'overdue',
       'check off', 'my list', 'add to my', 'miles'].some(kw => t.includes(kw)))
    return 'tasks'

  if (['routine', 'routines', 'habit', 'habits', 'morning routine', 'evening routine',
       'brush', 'shower', 'streak', 'harvey'].some(kw => t.includes(kw)))
    return 'habits'

  if (['my calendar', 'my schedule', 'what meetings', 'what events', 'alfred'].some(kw => t.includes(kw)))
    return 'calendar'

  return null
}

// ── Route to walli agent service ──────────────────────────────────────────────

async function routeToWalli(text: string, domain: AgentDomain): Promise<string> {
  const walliUrl = process.env.WALLI_API_URL ?? 'http://localhost:8080'

  const endpoint = domain === 'brief'    ? '/agents/walli/brief'
                 : domain === 'health'   ? '/agents/apollo/message'
                 : domain === 'tasks'    ? '/agents/miles/message'
                 : domain === 'habits'   ? '/agents/harvey/message'
                 : domain === 'calendar' ? '/agents/alfred/message'
                 : '/agents/message'

  const isGet = domain === 'brief'
  const res = await fetch(`${walliUrl}${endpoint}`, {
    method:  isGet ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(isGet ? {} : { body: JSON.stringify({ text }) }),
  })

  if (!res.ok) throw new Error(`Walli service error: ${res.status}`)
  const data = await res.json() as { response: string }
  return data.response
}

export function voiceRouter(): Router {
  const router = Router()

  router.post('/voice', asyncRoute(async (req, res) => {
    const { text, history = [] } = req.body as { text?: string; history?: { role: string; content: string }[] }
    if (!text?.trim()) return res.json({ response: '' })

    // Route agent-domain queries directly to the walli service
    const agentDomain = classifyAgentDomain(text.trim())
    if (agentDomain) {
      try {
        const response = await routeToWalli(text.trim(), agentDomain)
        return res.json({ response })
      } catch {
        // Walli service unavailable — fall through to local handler
      }
    }

    const apiKey = process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new AppError(503, 'ANTHROPIC_API_KEY not set', 'MISSING_CONFIG')

    const anthropic = new Anthropic({ apiKey })

    const MAX_HISTORY_TURNS = 6 // keep last 6 messages (3 exchanges) to cap token growth
    const priorMessages: Anthropic.MessageParam[] = history
      .filter((h) => h.role === 'user' || h.role === 'assistant')
      .slice(-MAX_HISTORY_TURNS)
      .map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content }))

    const messages: Anthropic.MessageParam[] = [
      ...priorMessages,
      { role: 'user', content: text.trim() },
    ]

    let finalText = 'Done.'

    for (let turn = 0; turn < 8; turn++) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [
          `You are Walli, an intelligent voice assistant for a smart whiteboard wall display. Your responses are spoken aloud.${memoryToPrompt(loadMemory())}${getBoardSnapshot()}`,
          'You can control the whiteboard AND answer general questions, look up live information, and help with anything the user asks. When you learn something new about the user (name, location, preference, or a Notion database they use), call update_memory immediately to remember it for future conversations.',
          'For league standings and table positions always use get_standings — it returns live data directly from ESPN. For other live data (news, weather, scores, etc.) use web_search to find relevant URLs, then fetch_page on the best result to read the actual content before answering.',
          'Always use get_board_state first if you need to find a widget ID or database ID. Notion view widgets (type @whiteboard/notion-view) store their database ID at widget.settings.databaseId — read it directly from the board state instead of calling list_notion_databases. Known databases are also listed in your memory above, so if the user references a database by name you may already have its ID. When the user says "read me my tasks", "what\'s on my list", or similar, use read_notion_items with the tasks database ID from memory or board state.',
          'To edit a Notion entry: use query_notion_database to find the page ID by name or filter, then update_notion_entry with the fields to change. E.g. "mark Buy milk as done" → query for "Buy milk" → update its Status to Done.',
          `When the user says "set up my daily dashboard" or "set up my board": (1) Create these 4 databases in order using create_notion_database — do NOT ask for a page URL, just proceed: "Tasks" with properties {Name:{title:{}},Status:{status:{options:[{name:"Not started",color:"red"},{name:"In progress",color:"yellow"},{name:"Done",color:"green"}]}},Priority:{select:{options:[{name:"High",color:"red"},{name:"Medium",color:"yellow"},{name:"Low",color:"gray"}]}},Due:{date:{}}}, "Routines" with {Name:{title:{}},Done:{checkbox:{}},Category:{select:{options:[{name:"Morning",color:"blue"},{name:"Evening",color:"purple"},{name:"Fitness",color:"green"}]}},Date:{date:{}}}, "Weight Log" with {Date:{date:{}},Weight:{number:{}},Notes:{rich_text:{}},"Name":{title:{}}}, "Goals" with {Name:{title:{}},Status:{select:{options:[{name:"Active",color:"blue"},{name:"Completed",color:"green"},{name:"Paused",color:"gray"}]}},Progress:{number:{}},"Target Date":{date:{}},Notes:{rich_text:{}}}. (4) After each database is created, call update_memory with field "database" to save the ID. (5) Use create_notion_view_widget to place: Tasks as todo-list (fieldMap:{title:"Name",status:"Status",priority:"Priority",due:"Due"} options:{statusDone:"Done"}) at x:20 y:20 w:480 h:520, Routines as habit-grid (fieldMap:{date:"Date",done:"Done"}) at x:520 y:20 w:420 h:250, Weight Log as metric-chart (fieldMap:{value:"Weight",date:"Date"} options:{unit:"lbs",label:"Weight",chartType:"line"}) at x:520 y:290 w:420 h:250, Goals as data-table (fieldMap:{columns:["Name","Status","Progress","Target Date"]}) at x:960 y:20 w:440 h:520, then add_widget for a calendar widget at x:20 y:560 w:480 h:300. (6) Respond "Your dashboard is ready."`,
          'To create a new background agent: use manage_agents with action "create", a short name, and a plain-English description of what it should check and do each run. Good descriptions say what to look for and what action to take (speak, notify). Set intervalMs appropriately. Confirm with the agent name only.',
          'For Spotify: use spotify_control for play/pause/skip/previous/now_playing. Spotify must be actively playing on a device for controls to work — if it fails, tell the user to open Spotify on their device first.',
          'When the user asks to "show" something, use open_url with the best URL from your search results or knowledge. Prefer sites known to allow embedding (e.g. flashscore.com, bbc.co.uk, wikipedia.org). Avoid sites that block iframes (google.com, twitter.com, premierleague.com).',
          'When the user says "note:", "jot down", "remember this", "write down", or dictates something to save, use set_scratch_pad with mode "append" to add a timestamped line to the note widget. "Clear my note" or "wipe the scratch pad" uses mode "clear".',
          'For timers: use set_timer when the user says "set a timer", "timer for X minutes", or "remind me in X minutes/hours". Convert all durations to seconds. When confirming, say the duration naturally e.g. "Timer set for 10 minutes." Use list_timers to check active timers, cancel_timer to stop one.',
          'For reminders: use set_reminder when the user says "remind me at [time]", "remind me to [do thing]", or "set a reminder". Convert the time to ISO 8601 using today\'s date context. When confirming, say the time naturally e.g. "Got it — I\'ll remind you at 3 PM." Use list_reminders to show upcoming reminders, cancel_reminder to remove one.',
          'For shopping lists and quick list additions: use quick_list_add when the user says "add [item] to my [list]", "put [item] on the [list]", or similar. It looks up the list by name from memory automatically. If no matching database is found, offer to create one with create_notion_database.',
          'When you need more information to complete a task, ask ONE short clarifying question (max 10 words, ending with "?"). The user will answer and you can then complete the task.',
          'When answering a question, summarise the key facts in 1-2 spoken sentences. When confirming an action, ONE short sentence (max 8 words).',
          'Never use markdown, bullet points, or long explanations — responses are spoken aloud.',
          'Never mention database IDs, widget IDs, page IDs, or any raw UUIDs in your spoken responses. Always refer to databases and widgets by their human name (e.g. "your Tasks database", "the Routines widget"). IDs are internal implementation details the user should never hear.',
          `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
        ].join(' '),
        tools:    VOICE_TOOLS,
        messages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text')
        finalText = (textBlock as Anthropic.TextBlock)?.text ?? 'Done.'
        break
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const notion = await getNotionClient(req.userId!) ?? new Client({ auth: 'noop' })
            const result = await executeVoiceTool(block.name, block.input as Record<string, any>, notion)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          }
        }
        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user',      content: toolResults })
      }
    }

    res.json({ response: finalText })
  }))

  router.post('/tts', asyncRoute(async (req, res) => {
    const { text } = req.body as { text?: string }
    if (!text?.trim()) throw new AppError(400, 'No text')

    const apiKey = process.env.VITE_ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY
    if (!apiKey) throw new AppError(503, 'ELEVENLABS_API_KEY not set', 'MISSING_CONFIG')

    const voiceId = process.env.VITE_ELEVENLABS_VOICE_ID ?? process.env.ELEVENLABS_VOICE_ID ?? 'SOYHLrjzK2X1ezoPC6cr'

    const normalized = normalizeTtsText(text)

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method:  'POST',
      headers: {
        'xi-api-key':   apiKey,
        'Content-Type': 'application/json',
        'Accept':       'audio/mpeg',
      },
      body: JSON.stringify({
        text: normalized,
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.85, similarity_boost: 0.6, style: 0, use_speaker_boost: true },
      }),
    })
    if (!r.ok) {
      const err = await r.text()
      throw new AppError(r.status, err)
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')
    const { Readable } = await import('stream')
    Readable.fromWeb(r.body as any).pipe(res)
  }))

  return router
}
