import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const SRC_WIDGETS_DIR = path.join(__dirname, '../src/components/widgets')

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
    description: 'List all widgets currently on the active whiteboard. Use this before update_widget or delete_widget to get widget IDs.',
    inputSchema: z.object({}),
  },
  async () => {
    const data = await api('GET', '/api/canvas/widgets')
    const canvas = data.canvas ?? { width: 1920, height: 1080 }
    const widgets = (data.widgets ?? []).map((w: any) => ({
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
      widgets.length === 0 ? 'No widgets on the board.' : JSON.stringify(widgets, null, 2),
    ].join('\n')
    return {
      content: [{ type: 'text', text: summary }],
    }
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
    }),
  },
  async ({ widgetType, x, y, width, height, settings }) => {
    const defaults = WIDGET_DEFAULTS[widgetType] ?? { width: 300, height: 200, label: widgetType }
    const w = width  ?? defaults.width
    const h = height ?? defaults.height
    // Default to center of canvas if no position given
    let finalX = x
    let finalY = y
    if (finalX == null || finalY == null) {
      const data = await api('GET', '/api/canvas/widgets')
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
        text: `Created ${widgetType} widget with id: ${id}`,
      }],
    }
  }
)

server.registerTool(
  'update_widget',
  {
    description: 'Move, resize, or change settings on an existing widget. Use list_widgets first to get the widget ID. Use describe_widget_type to see all available settings fields for a widget type.',
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
    await api('PATCH', `/api/canvas/widget/${id}`, { x, y, width, height, settings })
    return {
      content: [{ type: 'text', text: `Updated widget ${id}` }],
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
  'minimal', 'slate', 'paper', 'amber', 'rose', 'glass',
  'sage', 'midnight', 'stark', 'forest', 'ocean', 'terminal',
  'carbon', 'dusk', 'espresso', 'slate-dark',
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
    // Normalize: remove hyphens if user pasted a UUID-style ID
    const clean = pageId.replace(/-/g, '').trim()
    // Validate the page is accessible
    try {
      await api('GET', `/api/databases/${clean}`)
    } catch {
      // Page might not be a database — try a broader check via workspace page list
    }
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

async function patchRegistry(params: {
  widgetType:    string
  pascal:        string
  label:         string
  icon:          string
  iconBg:        string
  iconClass:     string
  keywords:      string[]
  defaultWidth:  number
  defaultHeight: number
  hasSettings:   boolean
}) {
  const registryPath = path.join(SRC_WIDGETS_DIR, 'registry.tsx')
  let content = await fs.readFile(registryPath, 'utf-8')

  const { pascal, widgetType, label, icon, iconBg, iconClass, keywords, defaultWidth, defaultHeight, hasSettings } = params

  // Add import before "export type { WidgetProps }"
  const importLine = hasSettings
    ? `import { ${pascal}Widget, ${pascal}Settings } from './${pascal}Widget'`
    : `import { ${pascal}Widget } from './${pascal}Widget'`

  content = content.replace(
    '\nexport type { WidgetProps }',
    `\n${importLine}\n\nexport type { WidgetProps }`
  )

  // Build the widget entry
  const entry = [
    `  {`,
    `    type:              '${widgetType}',`,
    `    label:             '${label}',`,
    `    Icon:              '${icon}',`,
    `    iconBg:            '${iconBg}',`,
    `    iconClass:         '${iconClass}',`,
    `    keywords:          ${JSON.stringify(keywords)},`,
    `    defaultSize:       { width: ${defaultWidth}, height: ${defaultHeight} },`,
    `    component:         ${pascal}Widget,`,
    hasSettings ? `    settingsComponent: ${pascal}Settings,` : null,
    `  },`,
  ].filter(Boolean).join('\n')

  // Insert before the closing ] of BUILTIN_WIDGETS
  content = content.replace(
    '\n]\n\n// ── Plugin registry',
    `\n${entry}\n]\n\n// ── Plugin registry`
  )

  await fs.writeFile(registryPath, content, 'utf-8')
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
      iconBg:        z.string().describe('Tailwind bg class for icon background, e.g. "bg-green-50"'),
      iconClass:     z.string().describe('Tailwind text class for icon color, e.g. "text-green-500"'),
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
  async ({ widgetType, label, icon, iconBg, iconClass, keywords, defaultWidth = 320, defaultHeight = 400, code, hasSettings = true, notion }) => {
    const slug   = widgetType.replace('@whiteboard/', '')
    const pascal = toPascal(slug)
    const file   = path.join(SRC_WIDGETS_DIR, `${pascal}Widget.tsx`)

    // Check for name collision
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

    // Write widget file
    await fs.writeFile(file, code, 'utf-8')

    // Patch registry.tsx
    await patchRegistry({ widgetType, pascal, label, icon, iconBg, iconClass, keywords, defaultWidth, defaultHeight, hasSettings })

    const lines = [
      `Widget "${label}" created successfully.`,
      `File: src/components/widgets/${pascal}Widget.tsx`,
      `Type: ${widgetType}`,
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

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
