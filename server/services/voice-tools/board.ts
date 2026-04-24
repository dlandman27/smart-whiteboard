import { canvas, fetchBoardState } from '../board-utils.js'
import { broadcast } from '../../ws.js'
import type { VoiceTool } from './_types.js'

const VOICE_THEMES = ['paper','crimson','amber','lemon','sage','slate','lavender','violet','pink','midnight','volcanic','espresso','golden','forest','ocean','indigo','dracula','midnight-rose']

export const boardTools: VoiceTool[] = [
  {
    definition: {
      name:        'get_board_state',
      description: 'Get all widgets on the active board plus all boards. Always call this first when the user references a widget, list, or board by name.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async (_input, ctx) => {
      const { boards, activeBoardId } = await fetchBoardState(ctx.userId)
      const activeBoard = boards.find((b) => b.id === activeBoardId)
      return JSON.stringify({
        activeBoardId,
        activeBoardName: activeBoard?.name ?? 'Unknown',
        boards:          boards.map((b) => ({ id: b.id, name: b.name })),
        canvas:          { width: 1920, height: 1080 },
        widgets:         activeBoard?.widgets ?? [],
      })
    },
  },

  {
    definition: {
      name:        'create_widget',
      description: 'Add a new widget to the board. Available types: @whiteboard/clock, @whiteboard/weather, @whiteboard/task-list, @whiteboard/note, @whiteboard/pomodoro, @whiteboard/countdown, @whiteboard/quote, @whiteboard/routines, @whiteboard/nfl, @whiteboard/nba, @whiteboard/html, @whiteboard/timers, @whiteboard/image. For @whiteboard/task-list pass settings: { listName: "My Tasks" } (or whichever list name). For @whiteboard/image pass settings: { url: "...", prompt: "..." }.',
      input_schema: {
        type: 'object' as const,
        properties: {
          widgetType: { type: 'string' },
          x:          { type: 'number', description: 'Horizontal position in pixels' },
          y:          { type: 'number', description: 'Vertical position in pixels' },
          width:      { type: 'number' },
          height:     { type: 'number' },
          settings:   { type: 'object' },
        },
        required: ['widgetType'],
      },
    },
    execute: async (input) => {
      const { id } = canvas.createWidget(input)
      return `Created ${input.widgetType} widget (id: ${id})`
    },
  },

  {
    definition: {
      name:        'update_widget',
      description: 'Move, resize, or change settings on a widget. Use get_board_state to find the widget ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id:       { type: 'string' },
          x:        { type: 'number' },
          y:        { type: 'number' },
          width:    { type: 'number' },
          height:   { type: 'number' },
          settings: { type: 'object' },
        },
        required: ['id'],
      },
    },
    execute: async (input) => {
      const { id, ...rest } = input
      canvas.updateWidget(id, rest)
      return `Updated widget ${id}`
    },
  },

  {
    definition: {
      name:        'delete_widget',
      description: 'Remove a widget from the board. Use get_board_state to find the widget ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    execute: async (input) => {
      canvas.deleteWidget(input.id)
      return `Deleted widget ${input.id}`
    },
  },

  {
    definition: {
      name:        'focus_widget',
      description: 'Expand a widget to fullscreen. Use get_board_state to find the widget ID. Call unfocus_widget to exit.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    execute: async (input) => {
      canvas.focusWidget(input.id)
      return `Widget ${input.id} fullscreened`
    },
  },

  {
    definition: {
      name:         'unfocus_widget',
      description:  'Exit fullscreen and return the widget to its normal size.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async () => {
      canvas.focusWidget()
      return 'Fullscreen exited'
    },
  },

  {
    definition: {
      name:        'set_theme',
      description: `Change the whiteboard theme. Available: ${VOICE_THEMES.join(', ')}`,
      input_schema: {
        type: 'object' as const,
        properties: {
          themeId: { type: 'string', enum: VOICE_THEMES },
        },
        required: ['themeId'],
      },
    },
    execute: async (input) => {
      canvas.setTheme(input.themeId)
      return `Theme set to ${input.themeId}`
    },
  },

  {
    definition: {
      name:        'list_boards',
      description: 'List all boards and which one is active.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async (_input, ctx) => {
      return JSON.stringify(await fetchBoardState(ctx.userId))
    },
  },

  {
    definition: {
      name:        'create_board',
      description: 'Create a new board.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
    },
    execute: async (input) => {
      const { id } = canvas.createBoard(input.name)
      return `Created board "${input.name}" (id: ${id})`
    },
  },

  {
    definition: {
      name:        'switch_board',
      description: 'Switch to a different board. Use get_board_state or list_boards to find board IDs.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    execute: async (input) => {
      canvas.activateBoard(input.id)
      return `Switched to board ${input.id}`
    },
  },

  {
    definition: {
      name:        'rename_board',
      description: 'Rename an existing board.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id:   { type: 'string' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      },
    },
    execute: async (input) => {
      canvas.renameBoard(input.id, input.name)
      return `Renamed board to "${input.name}"`
    },
  },

  {
    definition: {
      name:        'delete_board',
      description: 'Delete a board. Cannot delete the last board.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    execute: async (input) => {
      canvas.deleteBoard(input.id)
      return `Deleted board ${input.id}`
    },
  },

  {
    definition: {
      name:        'set_scratch_pad',
      description: 'Write or append text to the scratch pad note widget on the board. If no note widget exists, creates one. Use mode "replace" to overwrite, "append" to add a new timestamped line, "clear" to wipe it.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'The text to write' },
          mode: { type: 'string', enum: ['replace', 'append', 'clear'], description: 'Default: append' },
        },
        required: [],
      },
    },
    execute: async (input, ctx) => {
      const mode = (input.mode as string) ?? 'append'
      const text = (input.text as string) ?? ''

      const { boards, activeBoardId } = await fetchBoardState(ctx.userId)
      const state      = boards.find((b) => b.id === activeBoardId)
      const noteWidget = (state?.widgets ?? []).find((w: any) => w.type === '@whiteboard/note')

      let newContent = ''
      if (mode === 'clear') {
        newContent = ''
      } else if (mode === 'replace') {
        newContent = text
      } else {
        const time     = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        const existing = (noteWidget?.settings?.content as string) ?? ''
        newContent = existing ? `${existing}\n${time}  ${text}` : `${time}  ${text}`
      }

      if (noteWidget) {
        canvas.updateWidget(noteWidget.id, { settings: { content: newContent } })
      } else {
        canvas.createWidget({
          widgetType: '@whiteboard/note',
          width: 360, height: 280,
          settings: { content: newContent, fontSize: 16, align: 'left' },
        })
      }
      return mode === 'clear' ? 'Scratch pad cleared.' : 'Note updated.'
    },
  },

  {
    definition: {
      name:        'start_timer',
      description: 'Start a pomodoro focus session on an existing Pomodoro widget.',
      input_schema: {
        type: 'object' as const,
        properties: {
          widgetId: { type: 'string' },
        },
        required: ['widgetId'],
      },
    },
    execute: async (input) => {
      broadcast({ type: 'widget_event', widgetId: input.widgetId, event: 'start' })
      return 'Timer started'
    },
  },

  {
    definition: {
      name:        'create_notion_view_widget',
      description: `Create a @whiteboard/notion-view widget connected to a Notion database. Choose the best template for the data:
- metric-chart: Single numeric value tracked over time with line/bar chart. fieldMap: { value: "PropName", date: "PropName" }. options: { goal?, unit?, label?, chartType?: "line"|"bar" }
- data-table: All rows as a scrollable table. fieldMap: { columns: ["Prop1","Prop2",...] }. options: { sortBy?, sortDir?: "ascending"|"descending", limit? }
- stat-cards: Aggregate stats (count/sum/avg/latest/min/max). fieldMap: { value: "PropName" }. options: { unit?, stats?: ["count","sum","avg","latest","min","max"] }
- habit-grid: Daily checkbox completion grid. fieldMap: { date: "PropName", done: "PropName" }. options: { weeks? }
- kanban: Cards grouped by a select/status field. fieldMap: { title: "PropName", group: "PropName", subtitle?: "PropName" }. options: { columns?: ["Status1","Status2"] }
- timeline: Date-sorted event list. fieldMap: { title: "PropName", date: "PropName", subtitle?: "PropName", status?: "PropName" }. options: { limit?, sort?: "asc"|"desc" }
- todo-list: Clean todo list with checkboxes, priority badges, due dates, and active/done filters. Best for tasks. fieldMap: { title: "PropName", status?: "PropName", priority?: "PropName", due?: "PropName" }. options: { statusDone?: "Done" }`,
      input_schema: {
        type: 'object' as const,
        properties: {
          databaseId: { type: 'string' },
          template:   { type: 'string', enum: ['metric-chart', 'data-table', 'stat-cards', 'habit-grid', 'kanban', 'timeline', 'todo-list'] },
          title:      { type: 'string', description: 'Widget header label' },
          fieldMap:   { type: 'object', description: 'Template field → Notion property name mapping' },
          options:    { type: 'object', description: 'Template-specific display options' },
          x:          { type: 'number' },
          y:          { type: 'number' },
          width:      { type: 'number' },
          height:     { type: 'number' },
        },
        required: ['databaseId', 'template', 'fieldMap'],
      },
    },
    execute: async (input) => {
      const { databaseId, template, title, fieldMap, options, x, y, width, height } = input
      const { id } = canvas.createWidget({
        widgetType: '@whiteboard/notion-view',
        x, y,
        width:    width  ?? 400,
        height:   height ?? 320,
        settings: { databaseId, template, title, fieldMap, options: options ?? {} },
      })
      return `Created ${template} widget for database (id: ${id})`
    },
  },

  {
    definition: {
      name:        'open_url',
      description: 'Create or update a Website widget that embeds a URL in an iframe. Use this when the user asks to "show me", "open", or "display" a website. Pick the best URL for what they want — e.g. "show me the Premier League table" → "https://www.premierleague.com/tables". Use get_board_state first to find an existing url widget to reuse.',
      input_schema: {
        type: 'object' as const,
        properties: {
          url:      { type: 'string', description: 'Full URL including https://' },
          title:    { type: 'string', description: 'Short label shown above the widget' },
          widgetId: { type: 'string', description: 'Existing @whiteboard/url widget ID to update. Omit to create a new one.' },
        },
        required: ['url'],
      },
    },
    execute: async (input) => {
      const { url, title, widgetId } = input as { url: string; title?: string; widgetId?: string }
      const settings = { url, title: title ?? '' }
      if (widgetId) {
        canvas.updateWidget(widgetId, { settings })
        return `Updated website widget to ${url}`
      }
      const { id } = canvas.createWidget({
        widgetType: '@whiteboard/url',
        width: 800, height: 540,
        label: title ?? 'Website',
        settings,
      })
      return `Created website widget for ${url} (id: ${id})`
    },
  },
]
