import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

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
  '@whiteboard/html':      { width: 400, height: 300, label: 'Custom' },
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
      'Available widget types: @whiteboard/clock, @whiteboard/weather, @whiteboard/weight,',
      '@whiteboard/tasks, @whiteboard/countdown, @whiteboard/quote, @whiteboard/routines.',
      'Position (x, y) is in pixels from the top-left of the canvas.',
      'Width and height default to the widget\'s standard size if omitted.',
      'Notion-connected widgets (@whiteboard/tasks, @whiteboard/routines) accept settings: { databaseId: "notion-db-id" } to link to a Notion database immediately on creation.',
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
    description: 'Move, resize, or change settings on an existing widget. Use list_widgets first to get the widget ID.',
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

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
