import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const SRC_WIDGETS_DIR = path.join(__dirname, '../src/components/widgets')
const PLUGINS_DIR     = path.join(__dirname, '../plugins')

const BASE_URL = process.env.WHITEBOARD_URL ?? 'http://localhost:3001'

// Default sizes per widget type
const WIDGET_DEFAULTS: Record<string, { width: number; height: number; label: string }> = {
  '@whiteboard/clock':     { width: 320, height: 200, label: 'Clock' },
  '@whiteboard/weather':   { width: 300, height: 220, label: 'Weather' },
  '@whiteboard/weight':    { width: 340, height: 200, label: 'Weight Progress' },
  '@whiteboard/tasks':     { width: 320, height: 400, label: 'Tasks' },
  '@whiteboard/countdown': { width: 300, height: 240, label: 'Countdown' },
  '@whiteboard/quote':     { width: 360, height: 260, label: 'Quote of the Day' },
  '@whiteboard/routines':  { width: 320, height: 480, label: 'Routines' },
  '@whiteboard/note':      { width: 320, height: 200, label: 'Note' },
  '@whiteboard/pomodoro':  { width: 280, height: 340, label: 'Pomodoro Timer' },
  '@whiteboard/nfl':       { width: 340, height: 420, label: 'NFL Scores' },
  '@whiteboard/nba':       { width: 340, height: 420, label: 'NBA Scores' },
  '@whiteboard/html':      { width: 400, height: 300, label: 'Custom' },
  '@whiteboard/gif':       { width: 320, height: 320, label: 'GIF' },
}

// ── Widget settings schemas ────────────────────────────────────────────────────
// Describes every configurable setting for each widget type.
// Used by describe_widget_type and referenced in create_widget / update_widget.

interface FieldSchema {
  type:        string
  description: string
  default?:    unknown
  enum?:       string[]
  min?:        number
  max?:        number
}

const WIDGET_SETTINGS_SCHEMAS: Record<string, {
  description: string
  settings:    Record<string, FieldSchema>
}> = {
  '@whiteboard/clock': {
    description: 'Displays the current time. Supports digital and analog modes with timezone support.',
    settings: {
      display:         { type: 'string',  enum: ['digital', 'analog'], description: 'Clock face style', default: 'digital' },
      use24h:          { type: 'boolean', description: 'Use 24-hour format (digital only)', default: false },
      showSeconds:     { type: 'boolean', description: 'Show seconds (digital only)', default: true },
      showDate:        { type: 'boolean', description: 'Show date below the clock', default: true },
      font:            { type: 'string',  enum: ['thin', 'mono', 'serif'], description: 'Font style (digital only): thin = sans-serif, mono = monospace, serif = Lora serif', default: 'thin' },
      timezone:        { type: 'string',  description: 'IANA timezone string e.g. "America/New_York", "Europe/London", "Asia/Tokyo". Empty string = local system time', default: '' },
      showTimezone:    { type: 'boolean', description: 'Show timezone abbreviation label beneath the clock', default: false },
      showHourNumbers: { type: 'boolean', description: 'Show 12/3/6/9 numerals on the analog clock face', default: false },
    },
  },

  '@whiteboard/weather': {
    description: 'Shows current weather conditions. Uses GPS by default or a named city.',
    settings: {
      unit:          { type: 'string',  enum: ['fahrenheit', 'celsius'], description: 'Temperature unit', default: 'fahrenheit' },
      windUnit:      { type: 'string',  enum: ['mph', 'kmh', 'ms'], description: 'Wind speed unit: mph, kmh (km/h), or ms (m/s)', default: 'mph' },
      locationQuery: { type: 'string',  description: 'City name to use instead of GPS, e.g. "Tokyo" or "New York". Empty string = use browser GPS', default: '' },
      showFeelsLike: { type: 'boolean', description: 'Show "feels like" temperature', default: true },
      showHumidity:  { type: 'boolean', description: 'Show humidity percentage', default: true },
      showWind:      { type: 'boolean', description: 'Show wind speed', default: true },
    },
  },

  '@whiteboard/weight': {
    description: 'Tracks weight progress from a Notion database. Shows stats and/or a chart.',
    settings: {
      databaseId: { type: 'string',  description: 'Notion database ID. Database must have a "Date" (date) and "Weight" (number) property', default: '' },
      goalWeight: { type: 'number',  description: 'Target goal weight (same unit as logged entries)', default: 170 },
      view:       { type: 'string',  enum: ['stats', 'chart', 'both'], description: 'Display mode: stats only, chart only, or both', default: 'both' },
      goalStep:   { type: 'number',  description: 'Milestone interval (e.g. 5 for every 5 lbs). Set to 0 to disable milestones', default: 0, min: 0 },
      weeklyGoal: { type: 'number',  description: 'Weekly weight loss target. Set to 0 to disable', default: 0, min: 0 },
    },
  },

  '@whiteboard/tasks': {
    description: 'To-do list backed by a Notion database. Items can be checked off directly on the board.',
    settings: {
      databaseId: { type: 'string', description: 'Notion database ID. Database must have a "Name" (title) and "Status" (status with "Done" option) property', default: '' },
    },
  },

  '@whiteboard/countdown': {
    description: 'Counts down to a future date. Shows days remaining and optionally a live H:M:S timer.',
    settings: {
      title:      { type: 'string',  description: 'Label shown above the countdown, e.g. "Christmas" or "Vacation"', default: 'Countdown' },
      targetDate: { type: 'string',  description: 'ISO date string in YYYY-MM-DD format, e.g. "2025-12-25"', default: '' },
      showTime:   { type: 'boolean', description: 'Show live hours:minutes:seconds beneath the day count', default: true },
    },
  },

  '@whiteboard/quote': {
    description: 'Displays a quote of the day fetched from an external API. Refreshes once per day.',
    settings: {
      showRefresh: { type: 'boolean', description: 'Show a manual refresh button to fetch a new quote', default: true },
      fontSize:    { type: 'string',  enum: ['sm', 'md', 'lg'], description: 'Quote text size', default: 'md' },
      align:       { type: 'string',  enum: ['left', 'center'], description: 'Text alignment', default: 'center' },
    },
  },

  '@whiteboard/routines': {
    description: 'Daily routine checklist backed by a Notion database. Each day is a page with to-do blocks.',
    settings: {
      databaseId: { type: 'string', description: 'Notion database ID. Each page title should be a date (e.g. "Monday, March 4"). Pages contain heading and to_do blocks.', default: '' },
    },
  },

  '@whiteboard/note': {
    description: 'A freeform sticky note. Double-click the widget to edit. Supports font size and alignment.',
    settings: {
      content:  { type: 'string',  description: 'Note text content', default: '' },
      fontSize: { type: 'number',  description: 'Font size in pixels (e.g. 16, 24, 32)', default: 24, min: 8, max: 96 },
      align:    { type: 'string',  enum: ['left', 'center', 'right'], description: 'Text alignment', default: 'left' },
    },
  },

  '@whiteboard/pomodoro': {
    description: 'Pomodoro focus timer with work sessions, short breaks, and long breaks. Sends notifications when phases complete.',
    settings: {
      workMinutes:           { type: 'number', description: 'Duration of a focus/work session in minutes', default: 25, min: 1, max: 120 },
      breakMinutes:          { type: 'number', description: 'Duration of a short break in minutes', default: 5, min: 1, max: 60 },
      longBreakMinutes:      { type: 'number', description: 'Duration of a long break in minutes', default: 15, min: 1, max: 60 },
      cyclesBeforeLongBreak: { type: 'number', description: 'Number of work cycles to complete before triggering a long break', default: 4, min: 1, max: 10 },
    },
  },

  '@whiteboard/nfl': {
    description: 'Shows today\'s NFL game scores. Live games update in real time.',
    settings: {
      favoriteTeam: { type: 'string', description: 'Team abbreviation to highlight, e.g. "KC", "SF", "DAL". Leave empty for no highlight', default: '' },
    },
  },

  '@whiteboard/nba': {
    description: 'Shows today\'s NBA game scores. Live games update in real time.',
    settings: {
      favoriteTeam: { type: 'string', description: 'Team abbreviation to highlight, e.g. "LAL", "GSW", "BOS". Leave empty for no highlight', default: '' },
    },
  },

  '@whiteboard/html': {
    description: 'Fully custom widget rendered as an iframe. Provide raw HTML/CSS/JS. Use create_html_widget to create one with proper layout guidance.',
    settings: {
      html:  { type: 'string', description: 'Complete HTML content. Can include inline <style> and <script>. Will be wrapped in a full HTML document if not already.', default: '' },
      title: { type: 'string', description: 'Optional label shown in the widget header', default: '' },
    },
  },

  '@whiteboard/gif': {
    description: 'Displays an animated GIF on the whiteboard. Use show_gif to search and create one in one step.',
    settings: {
      url:   { type: 'string', description: 'Direct URL to the GIF file (e.g. from Tenor or Giphy CDN)', default: '' },
      query: { type: 'string', description: 'The search term used to find this GIF — displayed as alt text', default: '' },
      fit:   { type: 'string', enum: ['cover', 'contain'], description: 'cover = fill and crop; contain = show full image with letterboxing', default: 'cover' },
    },
  },
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

const server = new McpServer({
  name:    'whiteboard',
  version: '1.0.0',
})

// ── Tools ─────────────────────────────────────────────────────────────────────

server.registerTool(
  'describe_widget_type',
  {
    description: [
      'Get the full settings schema for a widget type — all configurable fields, their types, valid values, and defaults.',
      'Use this before create_widget or update_widget when you need to know what settings a widget supports.',
      `Available types: ${Object.keys(WIDGET_SETTINGS_SCHEMAS).join(', ')}`,
    ].join(' '),
    inputSchema: z.object({
      widgetType: z.string().describe('Widget type, e.g. "@whiteboard/clock"'),
    }),
  },
  async ({ widgetType }) => {
    const schema = WIDGET_SETTINGS_SCHEMAS[widgetType]
    if (!schema) {
      return {
        content: [{
          type: 'text',
          text: `Unknown widget type: "${widgetType}". Available types: ${Object.keys(WIDGET_SETTINGS_SCHEMAS).join(', ')}`,
        }],
      }
    }
    const lines = [
      `Widget type: ${widgetType}`,
      `Description: ${schema.description}`,
      '',
      'Settings:',
      ...Object.entries(schema.settings).map(([key, field]) => {
        const parts = [`  ${key} (${field.type})`]
        if (field.enum)    parts.push(`  valid values: ${field.enum.join(' | ')}`)
        if (field.min !== undefined || field.max !== undefined) {
          parts.push(`  range: ${field.min ?? '–'}–${field.max ?? '–'}`)
        }
        parts.push(`  default: ${JSON.stringify(field.default)}`)
        parts.push(`  ${field.description}`)
        return parts.join('\n')
      }),
    ]
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }
)

server.registerTool(
  'list_widgets',
  {
    description: [
      'List widgets on the active board (default) or any board by ID.',
      'Pass boardId to inspect another board without switching to it.',
      'Use list_boards to get board IDs.',
      'Use this before update_widget or delete_widget to get widget IDs.',
    ].join(' '),
    inputSchema: z.object({
      boardId: z.string().optional().describe('Board ID to inspect. Omit for the currently active board.'),
    }),
  },
  async ({ boardId }) => {
    let widgets: any[]
    let canvas: { width: number; height: number }

    if (boardId) {
      // Fetch boards + canvas in one shot via /canvas/state
      const state = await api('GET', '/api/canvas/state')
      const board = (state.boards ?? []).find((b: any) => b.id === boardId)
      if (!board) {
        // Fall back to /api/canvas/boards which includes full widget arrays
        const { boards } = await api('GET', '/api/canvas/boards')
        const fullBoard  = (boards ?? []).find((b: any) => b.id === boardId)
        if (!fullBoard) return { content: [{ type: 'text', text: `Board ${boardId} not found.` }] }
        widgets = fullBoard.widgets ?? []
      } else {
        // /canvas/state board summary doesn't carry widgets — fetch them
        const { boards } = await api('GET', '/api/canvas/boards')
        widgets = (boards ?? []).find((b: any) => b.id === boardId)?.widgets ?? []
      }
      canvas = state.canvas ?? { width: 1920, height: 1080 }
    } else {
      const data = await api('GET', '/api/canvas/widgets')
      canvas  = data.canvas ?? { width: 1920, height: 1080 }
      widgets = data.widgets ?? []
    }

    const mapped = widgets.map((w: any) => ({
      id:       w.id,
      type:     w.type ?? 'unknown',
      x:        w.x,
      y:        w.y,
      width:    w.width,
      height:   w.height,
      settings: w.settings ?? {},
    }))
    const summary = [
      `Canvas size: ${canvas.width} × ${canvas.height} px`,
      `Center: (${Math.round(canvas.width / 2)}, ${Math.round(canvas.height / 2)})`,
      '',
      mapped.length === 0 ? 'No widgets on the board.' : JSON.stringify(mapped, null, 2),
    ].join('\n')
    return { content: [{ type: 'text', text: summary }] }
  }
)

server.registerTool(
  'create_widget',
  {
    description: [
      'Add a new widget to the whiteboard.',
      `Available widget types: ${Object.keys(WIDGET_DEFAULTS).join(', ')}.`,
      'Position (x, y) is in pixels from the top-left of the canvas.',
      'Width and height default to the widget\'s standard size if omitted.',
      'Use describe_widget_type to discover all available settings for a widget type before setting them.',
      'Notion-connected widgets (@whiteboard/tasks, @whiteboard/routines, @whiteboard/weight) accept settings: { databaseId: "notion-db-id" } to link to a Notion database immediately on creation.',
    ].join(' '),
    inputSchema: z.object({
      widgetType: z.string().describe('Widget type, e.g. "@whiteboard/clock"'),
      x:          z.number().optional().describe('Horizontal position in pixels'),
      y:          z.number().optional().describe('Vertical position in pixels'),
      width:      z.number().optional().describe('Width in pixels'),
      height:     z.number().optional().describe('Height in pixels'),
      settings:   z.record(z.unknown()).optional().describe('Widget-specific settings'),
      slotId:     z.string().optional().describe('Layout slot ID from create_layout. When provided, the widget fills that slot automatically — x/y/width/height are ignored.'),
    }),
  },
  async ({ widgetType, x, y, width, height, settings, slotId }) => {
    const defaults = WIDGET_DEFAULTS[widgetType] ?? { width: 300, height: 200, label: widgetType }

    // Resolve slot → pixel coords when slotId is provided
    if (slotId) {
      const state = await api('GET', '/api/canvas/state')
      const canvas = state.canvas ?? { width: 1920, height: 1080 }
      const slot   = (state.slots ?? []).find((s: any) => s.id === slotId)
      if (!slot) {
        return { content: [{ type: 'text', text: `Slot "${slotId}" not found. Use create_layout first, or call get_board_state to see available slots.` }] }
      }
      x      = Math.round(slot.x * canvas.width)
      y      = Math.round(slot.y * canvas.height)
      width  = Math.round(slot.width  * canvas.width)
      height = Math.round(slot.height * canvas.height)
    }

    const w = width  ?? defaults.width
    const h = height ?? defaults.height

    let finalX = x
    let finalY = y
    if (finalX == null || finalY == null) {
      const data = await api('GET', '/api/canvas/state')
      const canvas = data.canvas ?? { width: 1920, height: 1080 }
      finalX = finalX ?? Math.round(canvas.width  / 2 - w / 2)
      finalY = finalY ?? Math.round(canvas.height / 2 - h / 2)
    }
    const payload = {
      widgetType,
      x:        finalX,
      y:        finalY,
      width:    w,
      height:   h,
      label:    defaults.label,
      settings: settings ?? {},
    }
    const { id } = await api('POST', '/api/canvas/widget', payload)
    return {
      content: [{
        type: 'text',
        text: `Created ${widgetType} widget with id: ${id} at (${finalX}, ${finalY}) ${w}×${h}px${slotId ? ` [slot: ${slotId}]` : ''}`,
      }],
    }
  }
)

server.registerTool(
  'update_widget',
  {
    description: [
      'Move, resize, or change settings on an existing widget.',
      'Use list_widgets first to get the widget ID. Use describe_widget_type to see all available settings fields for a widget type.',
      'Returns the persisted widget state from Supabase — settings are deep-merged, layout fields are replaced.',
    ].join(' '),
    inputSchema: z.object({
      id:       z.string().describe('Widget ID from list_widgets'),
      x:        z.number().optional().describe('New horizontal position in pixels'),
      y:        z.number().optional().describe('New vertical position in pixels'),
      width:    z.number().optional().describe('New width in pixels'),
      height:   z.number().optional().describe('New height in pixels'),
      settings: z.record(z.unknown()).optional().describe('Settings to merge into the widget'),
    }),
  },
  async ({ id, x, y, width, height, settings }) => {
    const result = await api('PATCH', `/api/canvas/widget/${id}`, { x, y, width, height, settings })
    return {
      content: [{ type: 'text', text: `Updated widget ${id}:\n${JSON.stringify(result.widget ?? { id }, null, 2)}` }],
    }
  }
)

server.registerTool(
  'delete_widget',
  {
    description: 'Remove a widget from the whiteboard. Use list_widgets first to get the widget ID.',
    inputSchema: z.object({
      id: z.string().describe('Widget ID from list_widgets'),
    }),
  },
  async ({ id }) => {
    await api('DELETE', `/api/canvas/widget/${id}`)
    return {
      content: [{ type: 'text', text: `Deleted widget ${id}` }],
    }
  }
)

// ── HTML widget tools ─────────────────────────────────────────────────────────

server.registerTool(
  'create_html_widget',
  {
    description: [
      'Create a fully custom widget by generating HTML/CSS/JS.',
      '',
      'LAYOUT CONTRACT — you must follow these rules:',
      '- NO scrolling. Everything must fit within the fixed widget dimensions.',
      '- Use 100vw / 100vh (= the full widget size) or percentage units, never fixed pixel heights that might overflow.',
      '- Size text with vw units or clamp() so it scales when the widget is resized (e.g. font-size: 4vw).',
      '- Use flexbox or grid with flex:1 / height:100% to fill space, never rely on content height.',
      '- overflow: hidden on all containers.',
      '',
      'STYLE: Use a dark transparent background so it blends with the whiteboard. Light text (#e2e8f0 or white).',
      'DATA: The iframe can call fetch() to any public API. Use setInterval for live-updating data.',
      'CODE: Inline all CSS and JS. Return a complete self-contained HTML document.',
    ].join(' '),
    inputSchema: z.object({
      html:   z.string().describe('Complete HTML content for the widget'),
      title:  z.string().optional().describe('Widget label shown in the UI'),
      x:      z.number().optional().describe('Horizontal position in pixels'),
      y:      z.number().optional().describe('Vertical position in pixels'),
      width:  z.number().optional().describe('Width in pixels (default 400)'),
      height: z.number().optional().describe('Height in pixels (default 300)'),
    }),
  },
  async ({ html, title, x, y, width, height }) => {
    const w = width  ?? 400
    const h = height ?? 300
    let finalX = x
    let finalY = y
    if (finalX == null || finalY == null) {
      const data = await api('GET', '/api/canvas/widgets')
      const canvas = data.canvas ?? { width: 1920, height: 1080 }
      finalX = finalX ?? Math.round(canvas.width  / 2 - w / 2)
      finalY = finalY ?? Math.round(canvas.height / 2 - h / 2)
    }
    const { id } = await api('POST', '/api/canvas/widget', {
      widgetType: '@whiteboard/html',
      x: finalX, y: finalY, width: w, height: h,
      label: title ?? 'Custom',
      settings: { html, title: title ?? '' },
    })
    return { content: [{ type: 'text', text: `Created HTML widget (id: ${id})` }] }
  }
)

server.registerTool(
  'update_html_widget',
  {
    description: 'Update the HTML content of an existing custom widget. Use list_widgets to get the widget ID.',
    inputSchema: z.object({
      id:   z.string().describe('Widget ID from list_widgets'),
      html: z.string().describe('New HTML content'),
    }),
  },
  async ({ id, html }) => {
    await api('PATCH', `/api/canvas/widget/${id}`, { settings: { html } })
    return { content: [{ type: 'text', text: `Updated HTML widget ${id}` }] }
  }
)

// ── GIF widget tool ───────────────────────────────────────────────────────────

server.registerTool(
  'show_gif',
  {
    description: [
      'Search Tenor for an animated GIF and display it on the whiteboard.',
      'Creates a @whiteboard/gif widget with the top result for the given query.',
      'Requires TENOR_API_KEY to be set on the server.',
    ].join(' '),
    inputSchema: z.object({
      query:  z.string().describe('What to search for, e.g. "excited cat", "celebration", "thumbs up"'),
      x:      z.number().optional().describe('Horizontal position in pixels (default: centered)'),
      y:      z.number().optional().describe('Vertical position in pixels (default: centered)'),
      width:  z.number().optional().describe('Width in pixels (default: 320)'),
      height: z.number().optional().describe('Height in pixels (default: 320)'),
    }),
  },
  async ({ query, x, y, width, height }) => {
    const w = width  ?? 320
    const h = height ?? 320

    // Search Tenor via the server proxy
    const searchRes = await fetch(`${BASE_URL}/api/gifs/search?q=${encodeURIComponent(query)}&limit=1`)
    if (!searchRes.ok) {
      const body = await searchRes.json().catch(() => ({}))
      return { content: [{ type: 'text', text: `GIF search failed: ${(body as any).error ?? searchRes.status}` }] }
    }
    const { url } = await searchRes.json() as { url: string; title: string }

    let finalX = x
    let finalY = y
    if (finalX == null || finalY == null) {
      const state = await api('GET', '/api/canvas/state')
      const canvas = state.canvas ?? { width: 1920, height: 1080 }
      finalX = finalX ?? Math.round(canvas.width  / 2 - w / 2)
      finalY = finalY ?? Math.round(canvas.height / 2 - h / 2)
    }

    const { id } = await api('POST', '/api/canvas/widget', {
      widgetType: '@whiteboard/gif',
      x: finalX, y: finalY, width: w, height: h,
      label: `GIF: ${query}`,
      settings: { url, query, fit: 'cover' },
    })

    return { content: [{ type: 'text', text: `Showing GIF for "${query}" (widget id: ${id})` }] }
  }
)

// ── Focus / theme tools ────────────────────────────────────────────────────────

server.registerTool(
  'focus_widget',
  {
    description: 'Expand a widget to fullscreen. Use list_widgets to get the widget ID. Call unfocus_widget to return to normal.',
    inputSchema: z.object({
      id: z.string().describe('Widget ID to expand to fullscreen'),
    }),
  },
  async ({ id }) => {
    await api('POST', '/api/canvas/focus-widget', { id })
    return { content: [{ type: 'text', text: `Widget ${id} expanded to fullscreen` }] }
  }
)

server.registerTool(
  'unfocus_widget',
  {
    description: 'Exit fullscreen and return the focused widget to its normal size.',
    inputSchema: z.object({}),
  },
  async () => {
    await api('POST', '/api/canvas/focus-widget', {})
    return { content: [{ type: 'text', text: 'Fullscreen exited' }] }
  }
)

const THEMES = [
  'paper', 'crimson', 'amber', 'lemon', 'sage', 'slate', 'lavender', 'violet', 'pink',
  'midnight', 'volcanic', 'espresso', 'golden', 'forest',
  'ocean', 'indigo', 'dracula', 'midnight-rose',
]

server.registerTool(
  'set_theme',
  {
    description: [
      'Change the whiteboard theme. Available themes:',
      THEMES.join(', '),
    ].join(' '),
    inputSchema: z.object({
      themeId: z.enum(THEMES as [string, ...string[]]).describe('Theme name'),
    }),
  },
  async ({ themeId }) => {
    await api('POST', '/api/canvas/theme', { themeId })
    return { content: [{ type: 'text', text: `Theme set to "${themeId}"` }] }
  }
)

server.registerTool(
  'create_custom_theme',
  {
    description: [
      'Apply a fully custom color theme to the whiteboard.',
      'All color fields accept any valid CSS color value (hex, rgb, hsl, etc.).',
      'Unspecified fields fall back to the minimal (light) theme.',
      'Use baseTheme to inherit from a preset instead: ' + THEMES.join(', '),
      '',
      'WIDGET COLORS — the main surfaces and text:',
      '  widgetBg: widget card background',
      '  widgetBorder / widgetBorderActive: card border (default / focused)',
      '  textPrimary: main text color',
      '  textMuted: secondary / placeholder text',
      '  surfaceSubtle: faint tint behind grouped content',
      '  surfaceHover: row / button hover background',
      '  surfaceDanger: destructive action highlight',
      '',
      'ACCENT & DANGER:',
      '  accent: brand/highlight color (buttons, focus rings, links)',
      '  accentText: text drawn on top of accent fills (usually white or black)',
      '  danger: destructive actions, error states',
      '',
      'PANELS:',
      '  actionBg / actionBorder: the floating action toolbar',
      '  settingsBg / settingsBorder / settingsDivider / settingsLabel / scrollThumb: settings modal',
      '',
      'CLOCK WIDGET:',
      '  clockFaceFill / clockFaceStroke / clockTickMajor / clockTickMinor',
      '  clockHands / clockSecond / clockCenter',
      '',
      'NOTE WIDGET:',
      '  noteDefaultBg: default sticky note color',
      '',
      'CANVAS BACKGROUND:',
      '  canvasBg: background fill color of the whiteboard canvas',
      '  canvasDot: color of the dot-grid pattern',
    ].join('\n'),
    inputSchema: z.object({
      baseTheme:          z.enum(THEMES as [string, ...string[]]).optional().describe('Preset to inherit unspecified fields from (default: minimal)'),
      // Widget frame
      widgetBg:           z.string().optional(),
      widgetBorder:       z.string().optional(),
      widgetBorderActive: z.string().optional(),
      // Text
      textPrimary:        z.string().optional(),
      textMuted:          z.string().optional(),
      // Surfaces
      surfaceSubtle:      z.string().optional(),
      surfaceHover:       z.string().optional(),
      surfaceDanger:      z.string().optional(),
      // Accent & danger
      accent:             z.string().optional(),
      accentText:         z.string().optional(),
      danger:             z.string().optional(),
      // Panels
      actionBg:           z.string().optional(),
      actionBorder:       z.string().optional(),
      settingsBg:         z.string().optional(),
      settingsBorder:     z.string().optional(),
      settingsDivider:    z.string().optional(),
      settingsLabel:      z.string().optional(),
      scrollThumb:        z.string().optional(),
      // Clock
      clockFaceFill:      z.string().optional(),
      clockFaceStroke:    z.string().optional(),
      clockTickMajor:     z.string().optional(),
      clockTickMinor:     z.string().optional(),
      clockHands:         z.string().optional(),
      clockSecond:        z.string().optional(),
      clockCenter:        z.string().optional(),
      // Note
      noteDefaultBg:      z.string().optional(),
      // Canvas background
      canvasBg:           z.string().optional().describe('Whiteboard canvas background color'),
      canvasDot:          z.string().optional().describe('Dot-grid pattern color'),
    }),
  },
  async ({ baseTheme, canvasBg, canvasDot, ...colorFields }) => {
    const vars: Record<string, string> = {}
    for (const [k, v] of Object.entries(colorFields)) {
      if (v !== undefined) vars[k] = v as string
    }
    if (baseTheme) vars['__baseTheme'] = baseTheme

    const background = (canvasBg || canvasDot)
      ? { label: 'Custom', bg: canvasBg ?? '#ffffff', dot: canvasDot ?? '#e2e8f0' }
      : undefined

    await api('POST', '/api/canvas/custom-theme', { vars, background })
    return { content: [{ type: 'text', text: 'Custom theme applied.' }] }
  }
)

// ── Notion integration tools ──────────────────────────────────────────────────

server.registerTool(
  'list_notion_databases',
  {
    description: 'List all Notion databases accessible to the whiteboard. Returns database IDs and titles.',
    inputSchema: z.object({}),
  },
  async () => {
    const data = await api('GET', '/api/databases')
    const dbs = (data.results ?? []).map((db: any) => ({
      id:    db.id,
      title: db.title?.map((t: any) => t.plain_text).join('') || 'Untitled',
    }))
    if (!dbs.length) return { content: [{ type: 'text', text: 'No Notion databases found. Make sure your NOTION_API_KEY is set and databases are shared with the integration.' }] }
    return { content: [{ type: 'text', text: JSON.stringify(dbs, null, 2) }] }
  }
)

server.registerTool(
  'link_notion_database',
  {
    description: 'Connect an existing widget to a Notion database. Works with @whiteboard/tasks and @whiteboard/routines widgets.',
    inputSchema: z.object({
      widgetId:   z.string().describe('Widget ID from list_widgets'),
      databaseId: z.string().describe('Notion database ID from list_notion_databases'),
    }),
  },
  async ({ widgetId, databaseId }) => {
    await api('PATCH', `/api/canvas/widget/${widgetId}`, { settings: { databaseId } })
    return { content: [{ type: 'text', text: `Linked widget ${widgetId} to Notion database ${databaseId}` }] }
  }
)

server.registerTool(
  'create_notion_database',
  {
    description: [
      'Create a new Notion database with the correct schema for a given widget type, then return its ID.',
      'Use this when the user wants a fresh Notion database for a widget.',
      'Requires a parentPageId — use the Notion MCP or ask the user for a page ID to create the database inside.',
      'Supported widget types: @whiteboard/tasks (Name + Status), @whiteboard/routines (Date title + daily to-do pages).',
    ].join(' '),
    inputSchema: z.object({
      widgetType:   z.string().describe('Widget type, e.g. "@whiteboard/tasks" or "@whiteboard/routines"'),
      title:        z.string().describe('Name for the new Notion database'),
      parentPageId: z.string().describe('Notion page ID to create the database inside'),
    }),
  },
  async ({ widgetType, title, parentPageId }) => {
    const schemas: Record<string, object> = {
      '@whiteboard/tasks': {
        Name:   { title: {} },
        Status: {
          status: {
            options: [
              { name: 'Not started', color: 'default' },
              { name: 'In progress', color: 'blue' },
              { name: 'Done',        color: 'green' },
            ],
          },
        },
      },
      '@whiteboard/routines': {
        Date: { title: {} },
      },
    }

    const properties = schemas[widgetType]
    if (!properties) {
      return { content: [{ type: 'text', text: `No schema defined for widget type: ${widgetType}. Supported: @whiteboard/tasks, @whiteboard/routines` }] }
    }

    const data = await api('POST', '/api/notion/databases', {
      parentPageId,
      title,
      properties,
    })

    return { content: [{ type: 'text', text: `Created Notion database "${title}" with id: ${data.id}\n\nNow use create_widget or link_notion_database to connect it to a widget.` }] }
  }
)

// ── Notion row CRUD ──────────────────────────────────────────────────────────
// Read/write rows inside Notion databases. Walli's voice tools have these;
// without them, an MCP client can list databases but cannot read or write
// any of their actual data. These tools close that gap.

function simplifyNotionProp(prop: any): any {
  if (!prop) return null
  switch (prop.type) {
    case 'title':            return (prop.title ?? []).map((t: any) => t.plain_text).join('')
    case 'rich_text':        return (prop.rich_text ?? []).map((t: any) => t.plain_text).join('')
    case 'number':           return prop.number
    case 'checkbox':         return prop.checkbox
    case 'date':             return prop.date?.start ?? null
    case 'select':           return prop.select?.name ?? null
    case 'multi_select':     return (prop.multi_select ?? []).map((s: any) => s.name)
    case 'status':           return prop.status?.name ?? null
    case 'url':              return prop.url
    case 'email':            return prop.email
    case 'phone_number':     return prop.phone_number
    case 'people':           return (prop.people ?? []).map((p: any) => p.name ?? p.id)
    case 'created_time':     return prop.created_time
    case 'last_edited_time': return prop.last_edited_time
    case 'formula':          return prop.formula?.[prop.formula?.type] ?? null
    case 'relation':         return (prop.relation ?? []).map((r: any) => r.id)
    case 'rollup':           return prop.rollup?.[prop.rollup?.type] ?? null
    default:                 return prop[prop.type] ?? null
  }
}

function simplifyNotionPage(page: any) {
  const props: Record<string, any> = {}
  for (const [key, val] of Object.entries((page.properties ?? {}) as any)) {
    props[key] = simplifyNotionProp(val)
  }
  return {
    id:         page.id,
    url:        page.url,
    archived:   page.archived,
    properties: props,
  }
}

server.registerTool(
  'get_notion_database',
  {
    description: [
      'Retrieve a Notion database\'s schema — its title and the type/options of every property.',
      'Call this before query_notion_database or add_notion_entry to learn what properties exist.',
    ].join(' '),
    inputSchema: z.object({
      databaseId: z.string().describe('Notion database ID from list_notion_databases'),
    }),
  },
  async ({ databaseId }) => {
    const db = await api('GET', `/api/databases/${databaseId}`)
    const title = (db.title ?? []).map((t: any) => t.plain_text).join('') || 'Untitled'
    const props: Record<string, any> = {}
    for (const [key, val] of Object.entries((db.properties ?? {}) as any)) {
      const v = val as any
      const detail: any = { type: v.type }
      // Include enum-like options for select/multi_select/status
      if (v[v.type]?.options) detail.options = v[v.type].options.map((o: any) => o.name)
      props[key] = detail
    }
    return { content: [{ type: 'text', text: JSON.stringify({ id: db.id, title, properties: props }, null, 2) }] }
  }
)

server.registerTool(
  'query_notion_database',
  {
    description: [
      'Query rows from a Notion database. Returns an array of pages with simplified property values.',
      'Use list_notion_databases to find the databaseId, and get_notion_database to learn the property schema.',
      '',
      'FILTER + SORTS: pass raw Notion filter and sorts objects (see Notion API docs). Omit both to get all rows.',
      'Common filter examples:',
      '  { property: "Status", status: { equals: "Done" } }',
      '  { property: "Due", date: { on_or_before: "2026-12-31" } }',
      '  { and: [{ property: "Status", status: { does_not_equal: "Done" } }, { property: "Due", date: { on_or_before: "today" } }] }',
      'Common sort: [{ property: "Due", direction: "ascending" }]',
    ].join('\n'),
    inputSchema: z.object({
      databaseId: z.string().describe('Notion database ID'),
      filter:     z.record(z.unknown()).optional().describe('Raw Notion filter object'),
      sorts:      z.array(z.record(z.unknown())).optional().describe('Raw Notion sorts array'),
      pageSize:   z.number().optional().describe('Max rows to return (default 50, max 100)'),
    }),
  },
  async ({ databaseId, filter, sorts, pageSize = 50 }) => {
    const data = await api('POST', `/api/databases/${databaseId}/query`, {
      filter,
      sorts,
      page_size: Math.min(pageSize, 100),
    })
    const results = (data.results ?? []).map(simplifyNotionPage)
    if (!results.length) return { content: [{ type: 'text', text: 'No rows match.' }] }
    return { content: [{ type: 'text', text: `${results.length} row(s):\n${JSON.stringify(results, null, 2)}` }] }
  }
)

server.registerTool(
  'get_notion_page',
  {
    description: 'Retrieve a single Notion page (database row) by ID. Returns simplified property values.',
    inputSchema: z.object({
      pageId: z.string().describe('Notion page ID (from query_notion_database results)'),
    }),
  },
  async ({ pageId }) => {
    const page = await api('GET', `/api/pages/${pageId}`)
    return { content: [{ type: 'text', text: JSON.stringify(simplifyNotionPage(page), null, 2) }] }
  }
)

server.registerTool(
  'get_notion_page_content',
  {
    description: [
      'Read the block content (body text) of a Notion page — paragraphs, headings, lists, code blocks.',
      'Returns a flat array of blocks with type + text. For row properties only, use get_notion_page.',
    ].join(' '),
    inputSchema: z.object({
      pageId: z.string().describe('Notion page ID'),
    }),
  },
  async ({ pageId }) => {
    const data = await api('GET', `/api/pages/${pageId}/blocks`)
    const blocks = (data.results ?? []).map((b: any) => {
      const text = b[b.type]?.rich_text
        ? (b[b.type].rich_text as any[]).map((t: any) => t.plain_text).join('')
        : null
      return { id: b.id, type: b.type, text }
    })
    if (!blocks.length) return { content: [{ type: 'text', text: 'Page has no block content.' }] }
    return { content: [{ type: 'text', text: JSON.stringify(blocks, null, 2) }] }
  }
)

server.registerTool(
  'add_notion_entry',
  {
    description: [
      'Add a row to a Notion database with smart property coercion.',
      'Pass `data` as a flat object of property name → value — the server figures out the right Notion shape',
      'based on the database schema (title, rich_text, number, checkbox, date, select, status, multi_select, url, email, phone_number).',
      '',
      'Example for a tasks DB with Name (title) + Status (status) + Due (date):',
      '  data: { Name: "Buy milk", Status: "Not started", Due: "2026-04-20" }',
      '',
      'Use get_notion_database first to discover the property names and types.',
      'For raw Notion property objects (relations, people, etc.), use create_notion_page instead.',
    ].join('\n'),
    inputSchema: z.object({
      databaseId: z.string().describe('Notion database ID'),
      data:       z.record(z.unknown()).describe('Flat object: property name → primitive value'),
    }),
  },
  async ({ databaseId, data }) => {
    const page = await api('POST', `/api/databases/${databaseId}/smart-entry`, { data })
    return { content: [{ type: 'text', text: `Added row to ${databaseId} → page id: ${page.id}\n${JSON.stringify(simplifyNotionPage(page), null, 2)}` }] }
  }
)

server.registerTool(
  'create_notion_page',
  {
    description: [
      'Create a Notion page (row) with raw Notion property objects. Use this when you need full control.',
      'For most cases prefer add_notion_entry which auto-coerces primitive values into the right shape.',
    ].join(' '),
    inputSchema: z.object({
      databaseId: z.string().describe('Notion database ID'),
      properties: z.record(z.unknown()).describe('Raw Notion properties object (full shape)'),
    }),
  },
  async ({ databaseId, properties }) => {
    const page = await api('POST', `/api/databases/${databaseId}/pages`, { properties })
    return { content: [{ type: 'text', text: `Created page ${page.id}\n${JSON.stringify(simplifyNotionPage(page), null, 2)}` }] }
  }
)

server.registerTool(
  'update_notion_page',
  {
    description: [
      'Update properties on an existing Notion page. Pass `properties` as raw Notion property objects.',
      'For the common case of toggling a status/checkbox property, use check_off_item which is simpler.',
      '',
      'Example for setting Status="Done":',
      '  properties: { Status: { status: { name: "Done" } } }',
    ].join('\n'),
    inputSchema: z.object({
      pageId:     z.string().describe('Notion page ID'),
      properties: z.record(z.unknown()).describe('Raw Notion properties object — only the fields you want to change'),
    }),
  },
  async ({ pageId, properties }) => {
    const page = await api('PATCH', `/api/pages/${pageId}`, { properties })
    return { content: [{ type: 'text', text: `Updated page ${pageId}\n${JSON.stringify(simplifyNotionPage(page), null, 2)}` }] }
  }
)

server.registerTool(
  'check_off_item',
  {
    description: [
      'Mark a Notion page as done — convenience wrapper for the common "check off a task" action.',
      'Works with status properties (sets to "Done" by default) or checkbox properties (sets to true).',
      'Pass propertyName to target a specific property; otherwise tries "Status" then "Done" then "Complete".',
    ].join(' '),
    inputSchema: z.object({
      pageId:       z.string().describe('Notion page ID'),
      propertyName: z.string().optional().describe('Property name to update (default: tries "Status", "Done", "Complete")'),
      propertyType: z.enum(['status', 'checkbox', 'select']).optional().describe('Property type. Default: status'),
      doneValue:    z.string().optional().describe('For status/select: the option name to set (default "Done")'),
    }),
  },
  async ({ pageId, propertyName, propertyType = 'status', doneValue = 'Done' }) => {
    const name = propertyName ?? 'Status'
    let propertyPayload: any
    if (propertyType === 'checkbox') {
      propertyPayload = { checkbox: true }
    } else if (propertyType === 'select') {
      propertyPayload = { select: { name: doneValue } }
    } else {
      propertyPayload = { status: { name: doneValue } }
    }
    await api('PATCH', `/api/pages/${pageId}`, { properties: { [name]: propertyPayload } })
    return { content: [{ type: 'text', text: `Marked page ${pageId} ${name} = ${propertyType === 'checkbox' ? 'true' : doneValue}` }] }
  }
)

server.registerTool(
  'delete_notion_page',
  {
    description: 'Archive a Notion page (Notion\'s soft-delete — page is hidden but recoverable from trash).',
    inputSchema: z.object({
      pageId: z.string().describe('Notion page ID'),
    }),
  },
  async ({ pageId }) => {
    await api('DELETE', `/api/pages/${pageId}`)
    return { content: [{ type: 'text', text: `Archived page ${pageId}` }] }
  }
)

// ── Native tasks ──────────────────────────────────────────────────────────────
// The app has its own tasks/routines/goals/events systems backed by Supabase,
// independent of Notion. These are what the user actually sees in the Tasks/Routines/
// Goals widgets unless they've manually wired them to a Notion database.

server.registerTool(
  'list_tasks',
  {
    description: [
      'List tasks from the native tasks system (Supabase-backed).',
      'Filter by status ("needsAction" / "completed") and/or list name.',
      'Returns id, title, status, priority, due, list_name, notes.',
    ].join(' '),
    inputSchema: z.object({
      status:   z.enum(['needsAction', 'completed']).optional().describe('Filter by status'),
      listName: z.string().optional().describe('Filter to a specific list (default: all lists)'),
    }),
  },
  async ({ status, listName }) => {
    const qs = new URLSearchParams()
    if (status)   qs.set('status', status)
    if (listName) qs.set('list_name', listName)
    const data = await api('GET', `/api/tasks${qs.toString() ? '?' + qs.toString() : ''}`)
    if (!Array.isArray(data) || !data.length) {
      return { content: [{ type: 'text', text: 'No tasks found.' }] }
    }
    const compact = data.map((t: any) => ({
      id:        t.id,
      title:     t.title,
      status:    t.status,
      priority:  t.priority,
      due:       t.due,
      list_name: t.list_name,
      notes:     t.notes,
    }))
    return { content: [{ type: 'text', text: `${compact.length} task(s):\n${JSON.stringify(compact, null, 2)}` }] }
  }
)

server.registerTool(
  'create_task',
  {
    description: 'Create a task in the native tasks system. Default list is "My Tasks".',
    inputSchema: z.object({
      title:    z.string().describe('Task title'),
      notes:    z.string().optional().describe('Longer notes/description'),
      due:      z.string().optional().describe('Due date in ISO format (YYYY-MM-DD or full timestamp)'),
      priority: z.number().min(1).max(4).optional().describe('Priority 1-4 (1 = highest, 4 = none, default 4)'),
      listName: z.string().optional().describe('Task list to add to (default "My Tasks")'),
    }),
  },
  async ({ title, notes, due, priority, listName }) => {
    const task = await api('POST', '/api/tasks', {
      title, notes, due, priority,
      list_name: listName,
    })
    return { content: [{ type: 'text', text: `Created task ${task.id}: "${task.title}"${task.due ? ` (due ${task.due})` : ''}` }] }
  }
)

server.registerTool(
  'update_task',
  {
    description: 'Update an existing task. Pass only the fields you want to change.',
    inputSchema: z.object({
      id:       z.string().describe('Task ID'),
      title:    z.string().optional(),
      notes:    z.string().optional(),
      due:      z.string().optional().describe('Due date in ISO format. Pass empty string to clear.'),
      priority: z.number().min(1).max(4).optional(),
      status:   z.enum(['needsAction', 'completed']).optional(),
      listName: z.string().optional().describe('Move task to a different list'),
    }),
  },
  async ({ id, title, notes, due, priority, status, listName }) => {
    const body: Record<string, unknown> = {}
    if (title    !== undefined) body.title    = title
    if (notes    !== undefined) body.notes    = notes
    if (due      !== undefined) body.due      = due || null
    if (priority !== undefined) body.priority = priority
    if (status   !== undefined) body.status   = status
    if (listName !== undefined) body.list_name = listName
    const task = await api('PATCH', `/api/tasks/${id}`, body)
    return { content: [{ type: 'text', text: `Updated task ${id}:\n${JSON.stringify(task, null, 2)}` }] }
  }
)

server.registerTool(
  'complete_task',
  {
    description: 'Mark a task as completed. Convenience for update_task with status="completed".',
    inputSchema: z.object({
      id: z.string().describe('Task ID'),
    }),
  },
  async ({ id }) => {
    await api('PATCH', `/api/tasks/${id}`, { status: 'completed' })
    return { content: [{ type: 'text', text: `Completed task ${id}` }] }
  }
)

server.registerTool(
  'delete_task',
  {
    description: 'Permanently delete a task.',
    inputSchema: z.object({
      id: z.string().describe('Task ID'),
    }),
  },
  async ({ id }) => {
    await api('DELETE', `/api/tasks/${id}`)
    return { content: [{ type: 'text', text: `Deleted task ${id}` }] }
  }
)

server.registerTool(
  'list_task_lists',
  {
    description: 'List all task lists. "My Tasks" is always present as a default.',
    inputSchema: z.object({}),
  },
  async () => {
    const data = await api('GET', '/api/tasks/lists')
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.registerTool(
  'create_task_list',
  {
    description: 'Create a new task list. Use list_task_lists to see existing ones first.',
    inputSchema: z.object({
      name: z.string().describe('List name (must be unique)'),
    }),
  },
  async ({ name }) => {
    const list = await api('POST', '/api/tasks/lists', { name })
    return { content: [{ type: 'text', text: `Created list "${list.name}"` }] }
  }
)

// ── Native routines ──────────────────────────────────────────────────────────

server.registerTool(
  'list_routines',
  {
    description: [
      'List enabled routines from the native routines system.',
      'Routines are categorized as morning/daily/evening with completion tracking per day.',
      'Use list_routine_completions to see which are done for a specific date.',
    ].join(' '),
    inputSchema: z.object({}),
  },
  async () => {
    const data = await api('GET', '/api/routines')
    if (!Array.isArray(data) || !data.length) {
      return { content: [{ type: 'text', text: 'No routines defined.' }] }
    }
    const compact = data.map((r: any) => ({
      id:       r.id,
      title:    r.title,
      category: r.category,
      emoji:    r.emoji,
    }))
    return { content: [{ type: 'text', text: `${compact.length} routine(s):\n${JSON.stringify(compact, null, 2)}` }] }
  }
)

server.registerTool(
  'list_routine_completions',
  {
    description: 'Get IDs of routines completed on a specific date (default: today). Returns an array of routine IDs.',
    inputSchema: z.object({
      date: z.string().optional().describe('ISO date YYYY-MM-DD (default: today)'),
    }),
  },
  async ({ date }) => {
    const qs = date ? `?date=${date}` : ''
    const ids = await api('GET', `/api/routines/completions${qs}`)
    return { content: [{ type: 'text', text: ids.length ? `Completed today: ${JSON.stringify(ids)}` : 'No completions for that date.' }] }
  }
)

server.registerTool(
  'complete_routine',
  {
    description: 'Mark a routine as complete for a date (default: today). Idempotent.',
    inputSchema: z.object({
      id:   z.string().describe('Routine ID'),
      date: z.string().optional().describe('ISO date YYYY-MM-DD (default: today)'),
    }),
  },
  async ({ id, date }) => {
    const result = await api('POST', `/api/routines/${id}/complete`, { date })
    return { content: [{ type: 'text', text: `Routine ${id} completed for ${result.date}` }] }
  }
)

server.registerTool(
  'uncomplete_routine',
  {
    description: 'Unmark a routine completion for a date (default: today).',
    inputSchema: z.object({
      id:   z.string().describe('Routine ID'),
      date: z.string().optional().describe('ISO date YYYY-MM-DD (default: today)'),
    }),
  },
  async ({ id, date }) => {
    const qs = date ? `?date=${date}` : ''
    await api('DELETE', `/api/routines/${id}/complete${qs}`)
    return { content: [{ type: 'text', text: `Routine ${id} uncompleted for ${date ?? 'today'}` }] }
  }
)

server.registerTool(
  'get_routine_streak',
  {
    description: 'Get current streak (consecutive days completed) for a routine, ending today.',
    inputSchema: z.object({
      id: z.string().describe('Routine ID'),
    }),
  },
  async ({ id }) => {
    const { streak } = await api('GET', `/api/routines/${id}/streak`)
    return { content: [{ type: 'text', text: `Routine ${id}: ${streak} day streak` }] }
  }
)

server.registerTool(
  'create_routine',
  {
    description: 'Create a new routine. Categories: morning, daily, evening.',
    inputSchema: z.object({
      title:     z.string().describe('Routine title'),
      category:  z.enum(['morning', 'daily', 'evening']).optional().describe('Default: daily'),
      emoji:     z.string().optional().describe('Emoji icon (default ✅)'),
      sortOrder: z.number().optional().describe('Sort order within its category'),
    }),
  },
  async ({ title, category, emoji, sortOrder }) => {
    const routine = await api('POST', '/api/routines', { title, category, emoji, sort_order: sortOrder })
    return { content: [{ type: 'text', text: `Created routine ${routine.id}: ${routine.emoji ?? ''} ${routine.title} (${routine.category})` }] }
  }
)

server.registerTool(
  'update_routine',
  {
    description: 'Update an existing routine. Pass only the fields you want to change. Set enabled=false to hide a routine without deleting it.',
    inputSchema: z.object({
      id:        z.string().describe('Routine ID'),
      title:     z.string().optional(),
      category:  z.enum(['morning', 'daily', 'evening']).optional(),
      emoji:     z.string().optional(),
      sortOrder: z.number().optional(),
      enabled:   z.boolean().optional().describe('Set false to hide from the routines list'),
    }),
  },
  async ({ id, title, category, emoji, sortOrder, enabled }) => {
    const body: Record<string, unknown> = {}
    if (title     !== undefined) body.title      = title
    if (category  !== undefined) body.category   = category
    if (emoji     !== undefined) body.emoji      = emoji
    if (sortOrder !== undefined) body.sort_order = sortOrder
    if (enabled   !== undefined) body.enabled    = enabled
    const routine = await api('PATCH', `/api/routines/${id}`, body)
    return { content: [{ type: 'text', text: `Updated routine ${id}:\n${JSON.stringify(routine, null, 2)}` }] }
  }
)

server.registerTool(
  'delete_routine',
  {
    description: 'Permanently delete a routine and its completion history.',
    inputSchema: z.object({
      id: z.string().describe('Routine ID'),
    }),
  },
  async ({ id }) => {
    await api('DELETE', `/api/routines/${id}`)
    return { content: [{ type: 'text', text: `Deleted routine ${id}` }] }
  }
)

server.registerTool(
  'reorder_routines',
  {
    description: 'Reorder routines by passing the full ordered list of routine IDs. Use list_routines first to get IDs.',
    inputSchema: z.object({
      ids: z.array(z.string()).describe('Routine IDs in the desired order'),
    }),
  },
  async ({ ids }) => {
    await api('POST', '/api/routines/reorder', { ids })
    return { content: [{ type: 'text', text: `Reordered ${ids.length} routine(s)` }] }
  }
)

// ── Native goals ─────────────────────────────────────────────────────────────

server.registerTool(
  'list_goals',
  {
    description: [
      'List goals from the native goals system. Includes milestones and links.',
      'Goal types: numeric (target value), habit (daily count), time_based (deadline), milestone (multi-step).',
      'Filter by status ("active" / "completed" / "archived") and/or type.',
    ].join(' '),
    inputSchema: z.object({
      status: z.enum(['active', 'completed', 'archived']).optional(),
      type:   z.enum(['numeric', 'habit', 'time_based', 'milestone']).optional(),
    }),
  },
  async ({ status, type }) => {
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    if (type)   qs.set('type', type)
    const data = await api('GET', `/api/goals${qs.toString() ? '?' + qs.toString() : ''}`)
    if (!Array.isArray(data) || !data.length) {
      return { content: [{ type: 'text', text: 'No goals found.' }] }
    }
    return { content: [{ type: 'text', text: `${data.length} goal(s):\n${JSON.stringify(data, null, 2)}` }] }
  }
)

server.registerTool(
  'create_goal',
  {
    description: 'Create a new goal. Type determines what fields are meaningful.',
    inputSchema: z.object({
      title:       z.string().describe('Goal title'),
      type:        z.enum(['numeric', 'habit', 'time_based', 'milestone']).describe('Goal type'),
      description: z.string().optional(),
      targetValue: z.number().optional().describe('For numeric/habit goals: the target number'),
      unit:        z.string().optional().describe('For numeric goals: unit label e.g. "lbs", "books"'),
      startDate:   z.string().optional().describe('ISO date YYYY-MM-DD'),
      targetDate:  z.string().optional().describe('ISO date YYYY-MM-DD'),
      color:       z.string().optional(),
      emoji:       z.string().optional(),
    }),
  },
  async ({ title, type, description, targetValue, unit, startDate, targetDate, color, emoji }) => {
    const goal = await api('POST', '/api/goals', {
      title, type, description,
      target_value: targetValue,
      unit,
      start_date:   startDate,
      target_date:  targetDate,
      color, emoji,
    })
    return { content: [{ type: 'text', text: `Created goal ${goal.id}: ${goal.emoji ?? ''} ${goal.title}` }] }
  }
)

server.registerTool(
  'update_goal',
  {
    description: 'Update a goal. Pass only the fields you want to change.',
    inputSchema: z.object({
      id:           z.string().describe('Goal ID'),
      title:        z.string().optional(),
      description:  z.string().optional(),
      status:       z.enum(['active', 'completed', 'archived']).optional(),
      targetValue:  z.number().optional(),
      currentValue: z.number().optional(),
      targetDate:   z.string().optional(),
    }),
  },
  async ({ id, title, description, status, targetValue, currentValue, targetDate }) => {
    const body: Record<string, unknown> = {}
    if (title        !== undefined) body.title         = title
    if (description  !== undefined) body.description   = description
    if (status       !== undefined) body.status        = status
    if (targetValue  !== undefined) body.target_value  = targetValue
    if (currentValue !== undefined) body.current_value = currentValue
    if (targetDate   !== undefined) body.target_date   = targetDate
    const goal = await api('PATCH', `/api/goals/${id}`, body)
    return { content: [{ type: 'text', text: `Updated goal ${id}:\n${JSON.stringify(goal, null, 2)}` }] }
  }
)

server.registerTool(
  'log_goal_progress',
  {
    description: 'Log a progress value for a numeric or habit goal. Updates the goal\'s current_value.',
    inputSchema: z.object({
      id:    z.string().describe('Goal ID'),
      value: z.number().describe('Progress value (e.g. weight reading, count, total)'),
      note:  z.string().optional().describe('Optional note about this entry'),
      date:  z.string().optional().describe('ISO date YYYY-MM-DD (default: today)'),
    }),
  },
  async ({ id, value, note, date }) => {
    const result = await api('POST', `/api/goals/${id}/progress`, { value, note, date })
    return { content: [{ type: 'text', text: `Logged progress for goal ${id}: ${value}\n${JSON.stringify(result, null, 2)}` }] }
  }
)

server.registerTool(
  'delete_goal',
  {
    description: 'Delete a goal (and its milestones, links, progress history).',
    inputSchema: z.object({
      id: z.string().describe('Goal ID'),
    }),
  },
  async ({ id }) => {
    await api('DELETE', `/api/goals/${id}`)
    return { content: [{ type: 'text', text: `Deleted goal ${id}` }] }
  }
)

// ── Native calendar events ───────────────────────────────────────────────────

server.registerTool(
  'list_events',
  {
    description: [
      'List calendar events from the native events system.',
      'Filter by time range (timeMin/timeMax as ISO timestamps) and/or calendar name.',
      'For "today", pass timeMin = today\'s 00:00 ISO and timeMax = tomorrow\'s 00:00.',
    ].join(' '),
    inputSchema: z.object({
      timeMin:      z.string().optional().describe('Earliest start_at (ISO timestamp)'),
      timeMax:      z.string().optional().describe('Latest start_at (ISO timestamp)'),
      calendarName: z.string().optional().describe('Filter to a specific calendar'),
    }),
  },
  async ({ timeMin, timeMax, calendarName }) => {
    const qs = new URLSearchParams()
    if (timeMin)      qs.set('timeMin', timeMin)
    if (timeMax)      qs.set('timeMax', timeMax)
    if (calendarName) qs.set('calendar_name', calendarName)
    const data = await api('GET', `/api/events${qs.toString() ? '?' + qs.toString() : ''}`)
    if (!Array.isArray(data) || !data.length) {
      return { content: [{ type: 'text', text: 'No events in that range.' }] }
    }
    const compact = data.map((e: any) => ({
      id:            e.id,
      title:         e.title,
      start_at:      e.start_at,
      end_at:        e.end_at,
      all_day:       e.all_day,
      location:      e.location,
      calendar_name: e.calendar_name,
    }))
    return { content: [{ type: 'text', text: `${compact.length} event(s):\n${JSON.stringify(compact, null, 2)}` }] }
  }
)

server.registerTool(
  'list_calendars',
  {
    description: 'List distinct calendar names from existing events.',
    inputSchema: z.object({}),
  },
  async () => {
    const data = await api('GET', '/api/events/calendars')
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.registerTool(
  'create_event',
  {
    description: 'Create a calendar event. start_at is required; end_at optional.',
    inputSchema: z.object({
      title:        z.string().describe('Event title'),
      startAt:      z.string().describe('Start ISO timestamp'),
      endAt:        z.string().optional().describe('End ISO timestamp'),
      allDay:       z.boolean().optional().describe('All-day event (default false)'),
      description:  z.string().optional(),
      location:     z.string().optional(),
      color:        z.string().optional(),
      calendarName: z.string().optional().describe('Default "My Calendar"'),
    }),
  },
  async ({ title, startAt, endAt, allDay, description, location, color, calendarName }) => {
    const event = await api('POST', '/api/events', {
      title,
      start_at:      startAt,
      end_at:        endAt,
      all_day:       allDay,
      description,
      location,
      color,
      calendar_name: calendarName,
    })
    return { content: [{ type: 'text', text: `Created event ${event.id}: "${event.title}" at ${event.start_at}` }] }
  }
)

server.registerTool(
  'update_event',
  {
    description: 'Update a calendar event. Pass only the fields you want to change.',
    inputSchema: z.object({
      id:           z.string().describe('Event ID'),
      title:        z.string().optional(),
      startAt:      z.string().optional(),
      endAt:        z.string().optional(),
      allDay:       z.boolean().optional(),
      description:  z.string().optional(),
      location:     z.string().optional(),
      color:        z.string().optional(),
      calendarName: z.string().optional(),
    }),
  },
  async ({ id, title, startAt, endAt, allDay, description, location, color, calendarName }) => {
    const body: Record<string, unknown> = {}
    if (title        !== undefined) body.title         = title
    if (startAt      !== undefined) body.start_at      = startAt
    if (endAt        !== undefined) body.end_at        = endAt
    if (allDay       !== undefined) body.all_day       = allDay
    if (description  !== undefined) body.description   = description
    if (location     !== undefined) body.location      = location
    if (color        !== undefined) body.color         = color
    if (calendarName !== undefined) body.calendar_name = calendarName
    const event = await api('PATCH', `/api/events/${id}`, body)
    return { content: [{ type: 'text', text: `Updated event ${id}:\n${JSON.stringify(event, null, 2)}` }] }
  }
)

server.registerTool(
  'delete_event',
  {
    description: 'Delete a calendar event.',
    inputSchema: z.object({
      id: z.string().describe('Event ID'),
    }),
  },
  async ({ id }) => {
    await api('DELETE', `/api/events/${id}`)
    return { content: [{ type: 'text', text: `Deleted event ${id}` }] }
  }
)

server.registerTool(
  'duplicate_widget',
  {
    description: 'Duplicate an existing widget, placing the copy offset from the original. Use list_widgets to get the widget ID.',
    inputSchema: z.object({
      id:      z.string().describe('Widget ID to duplicate'),
      offsetX: z.number().optional().describe('Horizontal offset for the copy in pixels (default 30)'),
      offsetY: z.number().optional().describe('Vertical offset for the copy in pixels (default 30)'),
    }),
  },
  async ({ id, offsetX = 30, offsetY = 30 }) => {
    const data   = await api('GET', '/api/canvas/widgets')
    const widget = (data.widgets ?? []).find((w: any) => w.id === id)
    if (!widget) return { content: [{ type: 'text', text: `Widget ${id} not found` }] }
    const { id: newId } = await api('POST', '/api/canvas/widget', {
      widgetType: widget.type,
      x:          (widget.x ?? 0) + offsetX,
      y:          (widget.y ?? 0) + offsetY,
      width:      widget.width,
      height:     widget.height,
      label:      widget.databaseTitle ?? widget.type,
      settings:   widget.settings ?? {},
    })
    return { content: [{ type: 'text', text: `Duplicated widget ${id} → new id: ${newId}` }] }
  }
)

server.registerTool(
  'list_board_widgets',
  {
    description: 'List widgets on any board, not just the active one. Useful for inspecting layouts before switching boards. Use list_boards to get board IDs.',
    inputSchema: z.object({
      boardId: z.string().describe('Board ID from list_boards'),
    }),
  },
  async ({ boardId }) => {
    const data  = await api('GET', '/api/canvas/boards')
    const board = (data.boards ?? []).find((b: any) => b.id === boardId)
    if (!board) return { content: [{ type: 'text', text: `Board ${boardId} not found` }] }
    const widgets = (board.widgets ?? []).map((w: any) => ({
      id:       w.id,
      type:     w.type ?? 'unknown',
      x:        w.x,
      y:        w.y,
      width:    w.width,
      height:   w.height,
      settings: w.settings ?? {},
    }))
    const text = widgets.length === 0
      ? `Board "${board.name}" has no widgets.`
      : `Board "${board.name}" (${widgets.length} widgets):\n${JSON.stringify(widgets, null, 2)}`
    return { content: [{ type: 'text', text }] }
  }
)

server.registerTool(
  'create_layout',
  {
    description: [
      'Define a custom AI-generated layout for the active board.',
      'The layout is a set of named slots expressed as fractions (0–1) of the canvas.',
      'Once applied, widgets snap into these slots — the user drags within the slot boundaries you define.',
      '',
      'COORDINATE SYSTEM:',
      '  x=0, y=0 is the top-left corner of the canvas.',
      '  x=1.0 is the full canvas width; y=1.0 is the full canvas height.',
      '  Slots should cover the entire canvas (no gaps unless intentional).',
      '',
      'THINKING IN SLOTS — common patterns:',
      '  Left 30% sidebar:   { id:"sidebar", x:0,    y:0, width:0.30, height:1 }',
      '  Right 70% main:     { id:"main",    x:0.30, y:0, width:0.70, height:1 }',
      '  Top strip 20%:      { id:"header",  x:0,    y:0, width:1,    height:0.20 }',
      '  Bottom-left quad:   { id:"bl",      x:0,    y:0.5, width:0.5, height:0.5 }',
      '',
      'TIPS:',
      '  - Give slots meaningful ids (e.g. "sidebar", "main", "footer") — shown in the UI.',
      '  - Slots must not overlap and should tile perfectly (x+width of one = x of the next).',
      '  - Fractional arithmetic: thirds = 0.333, quarters = 0.25, etc.',
      '  - After creating the layout, call apply_layout or create_widget to fill the slots.',
    ].join('\n'),
    inputSchema: z.object({
      slots: z.array(z.object({
        id:     z.string().describe('Unique slot identifier (e.g. "main", "sidebar", "footer")'),
        x:      z.number().min(0).max(1).describe('Left edge as fraction of canvas width'),
        y:      z.number().min(0).max(1).describe('Top edge as fraction of canvas height'),
        width:  z.number().min(0.01).max(1).describe('Width as fraction of canvas width'),
        height: z.number().min(0.01).max(1).describe('Height as fraction of canvas height'),
        label:  z.string().optional().describe('Optional human-readable label for the slot'),
      })).min(1).describe('Slot definitions that tile the canvas'),
    }),
  },
  async ({ slots }) => {
    await api('POST', '/api/canvas/layout', { slots })
    const summary = slots.map((s) =>
      `  ${s.id}: x=${s.x.toFixed(2)} y=${s.y.toFixed(2)} w=${s.width.toFixed(2)} h=${s.height.toFixed(2)}${s.label ? ` (${s.label})` : ''}`
    ).join('\n')
    return {
      content: [{
        type: 'text',
        text: `Custom layout applied with ${slots.length} slot${slots.length === 1 ? '' : 's'}:\n${summary}\n\nWidgets will now snap into these slots. Use create_widget or apply_layout to populate them.`,
      }],
    }
  }
)

server.registerTool(
  'apply_layout',
  {
    description: [
      'Batch-create a set of widgets to build a predefined dashboard layout on the active board.',
      'Optionally clears all existing widgets first.',
      'Use list_widgets + the canvas size from list_widgets to calculate positions.',
      'Canvas is typically 1920×1080. Common layout patterns:',
      '  - Top strip (clock, weather): y=20, height=160',
      '  - Left column (tasks): x=20, y=200, width=340',
      '  - Center main widget: x=380, y=200',
      '  - Right column: x=canvas.width-360, y=200',
      'Each widget spec requires widgetType and x/y. width/height default to type defaults if omitted.',
    ].join(' '),
    inputSchema: z.object({
      widgets: z.array(z.object({
        widgetType: z.string().describe('Widget type, e.g. "@whiteboard/clock"'),
        x:          z.number().describe('Horizontal position in pixels'),
        y:          z.number().describe('Vertical position in pixels'),
        width:      z.number().optional(),
        height:     z.number().optional(),
        label:      z.string().optional(),
        settings:   z.record(z.unknown()).optional(),
      })).describe('Ordered list of widgets to place'),
      clearExisting: z.boolean().optional().describe('Remove all current widgets before applying (default false)'),
    }),
  },
  async ({ widgets, clearExisting }) => {
    if (clearExisting) {
      await api('POST', '/api/canvas/clear-widgets', {})
      await new Promise((r) => setTimeout(r, 150))
    }
    const created: string[] = []
    for (const w of widgets) {
      const defaults = WIDGET_DEFAULTS[w.widgetType] ?? { width: 300, height: 200, label: w.widgetType }
      const { id } = await api('POST', '/api/canvas/widget', {
        widgetType: w.widgetType,
        x:          w.x,
        y:          w.y,
        width:      w.width  ?? defaults.width,
        height:     w.height ?? defaults.height,
        label:      w.label  ?? defaults.label,
        settings:   w.settings ?? {},
      })
      created.push(`${id}  ${w.widgetType}  @ (${w.x}, ${w.y})`)
    }
    return {
      content: [{
        type: 'text',
        text: `Applied layout — ${created.length} widgets created${clearExisting ? ' (board cleared first)' : ''}:\n${created.join('\n')}`,
      }],
    }
  }
)

// ── Board tools ───────────────────────────────────────────────────────────────

server.registerTool(
  'list_boards',
  {
    description: 'List all boards and show which one is currently active.',
    inputSchema: z.object({}),
  },
  async () => {
    const { boards, activeBoardId } = await api('GET', '/api/canvas/boards')
    if (!boards?.length) return { content: [{ type: 'text', text: 'No boards found.' }] }
    const lines = (boards as any[]).map((b: any) =>
      `${b.id === activeBoardId ? '▶' : ' '} ${b.name}  (id: ${b.id})  [${(b.widgets ?? []).length} widgets]`
    )
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }
)

server.registerTool(
  'create_board',
  {
    description: 'Create a new board and switch to it.',
    inputSchema: z.object({
      name: z.string().describe('Name for the new board'),
    }),
  },
  async ({ name }) => {
    const { id } = await api('POST', '/api/canvas/board', { name })
    return { content: [{ type: 'text', text: `Created board "${name}" (id: ${id}) and switched to it.` }] }
  }
)

server.registerTool(
  'switch_board',
  {
    description: 'Switch the active board. Use list_boards to get board IDs.',
    inputSchema: z.object({
      id: z.string().describe('Board ID from list_boards'),
    }),
  },
  async ({ id }) => {
    await api('POST', `/api/canvas/board/${id}/activate`)
    return { content: [{ type: 'text', text: `Switched to board ${id}` }] }
  }
)

server.registerTool(
  'rename_board',
  {
    description: 'Rename an existing board. Use list_boards to get board IDs.',
    inputSchema: z.object({
      id:   z.string().describe('Board ID from list_boards'),
      name: z.string().describe('New name for the board'),
    }),
  },
  async ({ id, name }) => {
    await api('PATCH', `/api/canvas/board/${id}`, { name })
    return { content: [{ type: 'text', text: `Renamed board ${id} to "${name}"` }] }
  }
)

server.registerTool(
  'delete_board',
  {
    description: 'Delete a board. Cannot delete the last remaining board. Use list_boards to get board IDs.',
    inputSchema: z.object({
      id: z.string().describe('Board ID from list_boards'),
    }),
  },
  async ({ id }) => {
    await api('DELETE', `/api/canvas/board/${id}`)
    return { content: [{ type: 'text', text: `Deleted board ${id}` }] }
  }
)

// ── Widget code generation ────────────────────────────────────────────────────

server.registerTool(
  'set_notion_workspace_page',
  {
    description: [
      'Configure the default Notion page where AI-created databases will be placed.',
      'This is a one-time setup. After setting this, create_widget_component will automatically',
      'create Notion databases with no manual steps ever again.',
      '',
      'To find your page ID: open the page in Notion, click Share, then Copy link.',
      'The ID is the 32-character string at the end of the URL (with or without hyphens).',
      'Example URL: notion.so/My-Page-abc123def456... → pageId is "abc123def456..."',
      '',
      'The page must already be shared with your Notion integration.',
      'To share: open the page → Share → Invite → select your integration.',
    ].join('\n'),
    inputSchema: z.object({
      pageId: z.string().describe('Notion page ID where new databases will be created'),
    }),
  },
  async ({ pageId }) => {
    const clean = pageId.replace(/-/g, '').trim()
    await api('POST', '/api/notion/workspace-page', { pageId: clean })
    return {
      content: [{
        type: 'text',
        text: `Workspace page set to ${clean}.\n\nAll future AI-created Notion databases will go here automatically. You never need to manually connect a widget to Notion again.`,
      }],
    }
  }
)

const DESIGN_SYSTEM_DOCS = `
# Smart Whiteboard — Widget Design System

## File conventions
- Widget file:    src/components/widgets/XxxWidget.tsx
- One file contains BOTH the widget component AND the settings component (export both from same file)
- Widget type:    '@whiteboard/xxx' (kebab-case)
- Component name: XxxWidget / XxxSettings (PascalCase from widget type slug)

## Widget component template
\`\`\`tsx
import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol, FlexRow, Center, Box, ScrollArea } from '../../ui/layouts'
import { Text, Icon } from '../../ui/web'
import { SettingsSection, Toggle, SegmentedControl, Input } from '../../ui/web'
import type { WidgetProps } from './registry'

// ── Settings type ─────────────────────────────────────────────────────────────

export interface XxxSettings {
  databaseId: string
  // ... other settings
}

export const XXX_DEFAULTS: XxxSettings = {
  databaseId: '',
  // ... defaults
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function XxxWidget({ widgetId }: WidgetProps) {
  const [settings] = useWidgetSettings<XxxSettings>(widgetId, XXX_DEFAULTS)
  // ...
  return (
    <FlexCol fullHeight style={{ padding: '12px 14px' }}>
      {/* content */}
    </FlexCol>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function XxxSettings({ widgetId }: WidgetProps) {
  const [settings, set] = useWidgetSettings<XxxSettings>(widgetId, XXX_DEFAULTS)
  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="...">
        {/* controls */}
      </SettingsSection>
    </FlexCol>
  )
}
\`\`\`

## Layout components  import from '../../ui/layouts'
- FlexCol   — vertical flex div. Props: align, justify, fullHeight, fullWidth, noSelect, className, style
- FlexRow   — horizontal flex div. Same props.
- Center    — centers children both axes. Props: fullHeight, fullWidth, className, style
- Box       — plain div. Props: style, className
- ScrollArea — overflow-y: auto container. Props: style, className

## UI components  import from '../../ui/web'
- Text       — styled text. Props: variant('label'|'body'|'caption'), size('small'|'base'), color('default'|'muted'|'danger'), align, textTransform, style, className
- Icon       — Phosphor icon. Props: icon(string), size(number), weight('regular'|'bold'|'fill'|'duotone'|'thin'|'light'), style
- Input      — text/number input. Props: label, type, size('sm'|'md'), value, onChange, placeholder
- Toggle     — boolean switch. Props: label, value(boolean), onChange((v:boolean)=>void)
- SegmentedControl — multi-option pill picker. Props: value(string), options([{value,label}]), onChange((v:string)=>void)
- SettingsSection  — labeled group for settings panel. Props: label(string), children

## SDK hook  import from '@whiteboard/sdk'
useWidgetSettings<T>(widgetId: string, defaults: T): [T, (partial: Partial<T>) => void]
  - First call returns [settings, setSettings]
  - setSettings merges partial — you don't need to spread existing state

## Notion hooks  import from '../../hooks/useNotion'
useNotionPages(databaseId: string)
  → { data: any[], isLoading: boolean, error: any }
  → data is an array of Notion page objects

useCreatePage(databaseId: string)
  → TanStack mutation. Call: .mutate({ properties: { ... } })

useUpdatePage(databaseId: string)
  → TanStack mutation. Call: .mutate({ pageId: string, properties: { ... } })

useArchivePage(databaseId: string)
  → TanStack mutation. Call: .mutate(pageId: string)

## Accessing Notion page properties
Given a page object p from useNotionPages:
  Title:    p.properties.Name?.title?.map((t:any) => t.plain_text).join('') ?? ''
  Checkbox: p.properties.Done?.checkbox ?? false
  Number:   p.properties.Amount?.number ?? 0
  Date:     p.properties.Date?.date?.start ?? ''
  Text:     p.properties.Notes?.rich_text?.[0]?.plain_text ?? ''
  Select:   p.properties.Category?.select?.name ?? ''
  Status:   p.properties.Status?.status?.name ?? ''

## Notion property schemas  (for notion.properties in create_widget_component)
  Title:    { "Name":     { "title": {} } }
  Checkbox: { "Done":     { "checkbox": {} } }
  Number:   { "Amount":   { "number": {} } }
  Date:     { "Date":     { "date": {} } }
  Text:     { "Notes":    { "rich_text": {} } }
  Select:   { "Category": { "select": { "options": [{ "name": "Food", "color": "green" }] } } }
  Status:   { "Status":   { "status": { "options": [{ "name": "Todo" }, { "name": "Done" }] } } }

## Creating pages in Notion
useCreatePage mutation properties format:
  Title:    { Name:     { title: [{ text: { content: 'My item' } }] } }
  Checkbox: { Done:     { checkbox: true } }
  Number:   { Amount:   { number: 42 } }
  Date:     { Date:     { date: { start: '2025-01-15' } } }
  Select:   { Category: { select: { name: 'Food' } } }

## CSS custom properties (always use these — never hardcode hex colors)
  var(--wt-text)           primary text
  var(--wt-text-muted)     secondary / placeholder text
  var(--wt-bg)             canvas background
  var(--wt-surface)        widget card background
  var(--wt-surface-subtle) faint tint for hover/selected rows
  var(--wt-surface-hover)  row hover background
  var(--wt-border)         border color
  var(--wt-accent)         brand highlight (buttons, focus rings)
  var(--wt-accent-text)    text drawn on accent fills (usually white)
  var(--wt-danger)         error/destructive

## Phosphor icon names (common)
ShoppingCart, CheckSquare, ListChecks, BookOpen, Trophy, Clock, Sun, Heart, Star,
Note, Tag, Archive, Trash, Plus, X, Check, PencilSimple, ArrowRight, CalendarBlank,
Scales, Timer, Quotes, Code, User, House, Gear, Barbell, Fork, MusicNote,
CurrencyDollar, ChartLine, Airplane, Car, Coffee, Package, Shirt

## Layout rules
1. Never use fixed pixel heights on containers — use flex: 1 or fullHeight
2. Wrap lists in ScrollArea so they don't overflow the widget bounds
3. Use var(--wt-*) for ALL colors
4. Check for !settings.databaseId and show a prompt: "Set your Notion database in settings"
5. Check isLoading and error states from useNotionPages

## Empty state pattern (for Notion widgets)
\`\`\`tsx
if (!settings.databaseId) return (
  <Center fullHeight>
    <Text variant="caption" color="muted">Connect a Notion database in settings</Text>
  </Center>
)
if (isLoading) return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
if (error)     return <Center fullHeight><Text variant="caption" color="danger">{(error as Error).message}</Text></Center>
\`\`\`
`.trim()

server.registerTool(
  'describe_design_system',
  {
    description: 'Get the full design system reference for writing widget components. Call this before create_widget_component so you know all available components, hooks, and patterns.',
    inputSchema: z.object({}),
  },
  async () => ({
    content: [{ type: 'text', text: DESIGN_SYSTEM_DOCS }],
  })
)

server.registerTool(
  'get_widget_source',
  {
    description: 'Read the source code of an existing widget to use as a reference when writing a new one.',
    inputSchema: z.object({
      widgetType: z.string().describe('Widget type, e.g. "@whiteboard/tasks". Reads XxxWidget.tsx.'),
    }),
  },
  async ({ widgetType }) => {
    const slug   = widgetType.replace('@whiteboard/', '')
    const pascal = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    const file   = path.join(SRC_WIDGETS_DIR, `${pascal}Widget.tsx`)
    try {
      const source = await fs.readFile(file, 'utf-8')
      return { content: [{ type: 'text', text: `// ${file}\n\n${source}` }] }
    } catch {
      return { content: [{ type: 'text', text: `File not found: ${file}` }] }
    }
  }
)

function toPascal(slug: string): string {
  return slug.charAt(0).toUpperCase()
    + slug.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

async function createPlugin(params: {
  widgetType:    string
  slug:          string
  pascal:        string
  label:         string
  icon:          string
  iconColor:     string
  keywords:      string[]
  defaultWidth:  number
  defaultHeight: number
  hasSettings:   boolean
}): Promise<string | null> {
  const { widgetType, slug, pascal, label, icon, iconColor, keywords, defaultWidth, defaultHeight, hasSettings } = params
  const pluginDir = path.join(PLUGINS_DIR, slug)

  try {
    await fs.access(pluginDir)
    return `Plugin directory already exists: plugins/${slug}. Choose a different widgetType or delete the directory first.`
  } catch { /* doesn't exist — good */ }

  await fs.mkdir(pluginDir, { recursive: true })

  const manifest = {
    id:          slug,
    name:        label,
    version:     '1.0.0',
    author:      'smart-whiteboard',
    description: label,
    widgets: [{
      type:        widgetType,
      label,
      icon,
      iconColor,
      keywords,
      defaultSize: { width: defaultWidth, height: defaultHeight },
    }],
  }
  await fs.writeFile(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

  const exportLine = hasSettings
    ? `export { ${pascal}Widget as component, ${pascal}Settings as settingsComponent } from '../../src/components/widgets/${pascal}Widget'\n`
    : `export { ${pascal}Widget as component } from '../../src/components/widgets/${pascal}Widget'\n`
  await fs.writeFile(path.join(pluginDir, 'index.tsx'), exportLine, 'utf-8')

  return null // no error
}

server.registerTool(
  'create_widget_component',
  {
    description: [
      'Generate a new native widget by writing React/TypeScript code to disk and registering it.',
      'The widget appears in the "Add widget" menu immediately (Vite hot-reloads).',
      '',
      'WORKFLOW:',
      '  1. Call describe_design_system to learn the component API and patterns.',
      '  2. Call get_widget_source("@whiteboard/tasks") to see a Notion-backed widget example.',
      '  3. Write the widget code following the design system docs.',
      '  4. Call this tool — it writes the file, patches the registry, and creates the Notion database.',
      '  5. Call create_widget with the returned widgetType and settings: { databaseId } to place it.',
      '',
      'CODE RULES:',
      '  - The code param must be a complete .tsx file with both XxxWidget and XxxSettings exported.',
      '  - Widget and settings components must accept { widgetId }: WidgetProps.',
      '  - Use useWidgetSettings for all persistent state.',
      '  - For Notion widgets, read settings.databaseId — do NOT hardcode the database ID in the code.',
      '  - Always show an empty state when databaseId is empty.',
      '  - Import paths: ../../ui/layouts, ../../ui/web, @whiteboard/sdk, ../../hooks/useNotion',
    ].join('\n'),
    inputSchema: z.object({
      widgetType:    z.string().describe('Unique widget type slug, e.g. "@whiteboard/grocery-list"'),
      label:         z.string().describe('Display name shown in the add-widget menu, e.g. "Grocery List"'),
      icon:          z.string().describe('Phosphor icon name, e.g. "ShoppingCart"'),
      iconColor:     z.string().describe('CSS color for the widget icon, e.g. "#22c55e" or "#6366f1"'),
      keywords:      z.array(z.string()).describe('Search keywords for the add-widget menu'),
      defaultWidth:  z.number().optional().describe('Default widget width in pixels (default 320)'),
      defaultHeight: z.number().optional().describe('Default widget height in pixels (default 400)'),
      code:          z.string().describe('Complete .tsx source file containing both XxxWidget and XxxSettings exports'),
      hasSettings:   z.boolean().optional().describe('Whether the code exports a settings component (default true)'),
      notion: z.object({
        title:      z.string().describe('Name for the new Notion database'),
        properties: z.record(z.unknown()).describe('Notion property schema — must include at least one title field'),
      }).optional().describe('If provided, a Notion database is created automatically and its ID is returned'),
    }),
  },
  async ({ widgetType, label, icon, iconColor, keywords, defaultWidth = 320, defaultHeight = 400, code, hasSettings = true, notion }) => {
    const slug   = widgetType.replace('@whiteboard/', '')
    const pascal = toPascal(slug)
    const file   = path.join(SRC_WIDGETS_DIR, `${pascal}Widget.tsx`)

    // Check for widget file collision
    try {
      await fs.access(file)
      return { content: [{ type: 'text', text: `Error: ${file} already exists. Choose a different widgetType or use get_widget_source to read it.` }] }
    } catch { /* file doesn't exist — good */ }

    // Create Notion database if requested
    let databaseId: string | undefined
    if (notion) {
      const res = await api('POST', '/api/notion/databases', {
        title:      notion.title,
        properties: notion.properties,
      })
      databaseId = res.id
    }

    // Write widget source file
    await fs.writeFile(file, code, 'utf-8')

    // Register as a plugin (writes plugins/{slug}/manifest.json + index.tsx)
    const pluginError = await createPlugin({ widgetType, slug, pascal, label, icon, iconColor, keywords, defaultWidth, defaultHeight, hasSettings })
    if (pluginError) {
      // Widget file already written — report partial success
      return { content: [{ type: 'text', text: `Widget file written but plugin registration failed: ${pluginError}` }] }
    }

    const lines = [
      `Widget "${label}" created successfully.`,
      `File:   src/components/widgets/${pascal}Widget.tsx`,
      `Plugin: plugins/${slug}/`,
      `Type:   ${widgetType}`,
      databaseId ? `Notion database ID: ${databaseId}` : null,
      '',
      databaseId
        ? `Next: call create_widget with widgetType "${widgetType}" and settings: { databaseId: "${databaseId}" }`
        : `Next: call create_widget with widgetType "${widgetType}" to place it on the board.`,
      '',
      'The app will hot-reload — the widget is now available in the add-widget menu.',
    ].filter((l) => l !== null).join('\n')

    return { content: [{ type: 'text', text: lines }] }
  }
)

// ── Board state & events ──────────────────────────────────────────────────────

server.registerTool(
  'get_board_state',
  {
    description: [
      'Full snapshot of the active board in one call.',
      'Returns: canvas dimensions, active board ID, all widget positions/settings, current layout slots,',
      'active theme, and a summary of all boards. Use this instead of multiple list_widgets + list_boards calls.',
      '',
      'Note: results reflect the most recent state the browser has reported. After mutations,',
      'state may lag by ~100ms — use get_board_events with `since` to detect updates.',
    ].join(' '),
    inputSchema: z.object({}),
  },
  async () => {
    const state   = await api('GET', '/api/canvas/state')
    const canvas  = state.canvas  ?? { width: 1920, height: 1080 }
    const widgets = state.widgets ?? []
    const slots   = state.slots   ?? []
    const boards  = state.boards  ?? []
    const theme   = state.theme   ?? { themeId: null }
    const lines = [
      `Canvas: ${canvas.width} × ${canvas.height} px`,
      `Active board: ${state.activeBoardId ?? 'unknown'}`,
      `Theme: ${theme.themeId ?? 'unknown'}${theme.vars ? ' (custom vars set)' : ''}`,
      '',
      `Widgets (${widgets.length}):`,
      widgets.length === 0
        ? '  (none)'
        : JSON.stringify(widgets.map((w: any) => ({
            id:       w.id,
            type:     w.type ?? 'unknown',
            x:        w.x,
            y:        w.y,
            width:    w.width,
            height:   w.height,
            settings: w.settings ?? {},
          })), null, 2),
      '',
      slots.length
        ? `Layout slots (${slots.length}):\n${JSON.stringify(slots, null, 2)}`
        : 'No layout slots defined.',
      '',
      boards.length
        ? `All boards (${boards.length}):\n${JSON.stringify(boards, null, 2)}`
        : 'No boards in cache (browser may not be connected).',
    ].join('\n')
    return { content: [{ type: 'text', text: lines }] }
  }
)

server.registerTool(
  'get_board_events',
  {
    description: [
      'Poll recent board events — theme changes, widget additions, board switches, focus changes, screensaver toggles.',
      'Use `since` (Unix ms timestamp) to get only events after a known point.',
      'Returns events in chronological order. Each event has a `ts` (Unix ms) and `type` field.',
    ].join(' '),
    inputSchema: z.object({
      since: z.number().optional().describe('Unix timestamp in ms. Only return events after this time. Omit to get all recent events (up to 200).'),
      limit: z.number().optional().describe('Max events to return (default 50, max 200)'),
    }),
  },
  async ({ since, limit = 50 }) => {
    const qs   = since != null ? `?since=${since}` : ''
    const data = await api('GET', `/api/canvas/events${qs}`)
    const events = (data.events ?? []).slice(-Math.min(limit, 200))
    const text = events.length === 0
      ? 'No events found.'
      : `${events.length} event(s):\n${JSON.stringify(events, null, 2)}`
    return { content: [{ type: 'text', text }] }
  }
)

// ── Screensaver ───────────────────────────────────────────────────────────────

server.registerTool(
  'enable_screensaver',
  {
    description: [
      'Activate screensaver mode on the whiteboard.',
      'The board goes dark and displays a floating clock that bounces around the screen.',
      'Any user interaction (click, keypress, mousemove) will dismiss it.',
      'Use disable_screensaver to turn it off programmatically.',
    ].join(' '),
    inputSchema: z.object({}),
  },
  async () => {
    await api('POST', '/api/canvas/screensaver', { active: true })
    return { content: [{ type: 'text', text: 'Screensaver activated. Any user interaction will dismiss it.' }] }
  }
)

server.registerTool(
  'disable_screensaver',
  {
    description: 'Deactivate screensaver mode and return the whiteboard to its normal view.',
    inputSchema: z.object({}),
  },
  async () => {
    await api('POST', '/api/canvas/screensaver', { active: false })
    return { content: [{ type: 'text', text: 'Screensaver dismissed.' }] }
  }
)

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
