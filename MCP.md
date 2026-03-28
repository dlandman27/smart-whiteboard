# Whiteboard MCP — Complete Reference

The whiteboard MCP server lets Claude control your canvas and Notion databases in real time via natural language. Start `npm run dev`, then just talk to Claude Desktop.

---

## Widget Tools

### `list_widgets`
See everything on the current board — widget IDs, positions, sizes, settings, and canvas dimensions.

> "What's on my board?"
> "List all widgets"

---

### `create_widget`
Add a widget to the board. Defaults to centered if no position given.

**Available types:**
| Type | Default Size | Notion? |
|------|-------------|---------|
| `@whiteboard/clock` | 320 × 200 | — |
| `@whiteboard/weather` | 300 × 220 | — |
| `@whiteboard/weight` | 340 × 200 | — |
| `@whiteboard/tasks` | 320 × 400 | ✅ needs `databaseId` |
| `@whiteboard/countdown` | 300 × 240 | — |
| `@whiteboard/quote` | 360 × 260 | — |
| `@whiteboard/routines` | 320 × 480 | ✅ needs `databaseId` |

> "Add a clock widget"
> "Put a weather widget in the top-right corner"
> "Add a tasks widget on the left side"
> "Set up a dashboard with clock, weather, and quote of the day"
> "Add a countdown widget counting down to July 4th"

---

### `update_widget`
Move, resize, or change settings on an existing widget.

> "Move the clock to the top-left"
> "Make the tasks widget taller"
> "Resize the weather widget to 400×300"
> "Set the countdown target to December 25th"
> "Switch the clock to 24-hour format"

---

### `delete_widget`
Remove a widget from the board.

> "Delete the clock"
> "Remove everything on the board"
> "Clear the board and start fresh"

---

## Board Tools

### `list_boards`
See all boards and which one is active.

> "What boards do I have?"

---

### `create_board`
Create a new board and switch to it.

> "Create a board called Work"
> "Make a new board for my morning routine"

---

### `switch_board`
Switch to a different board.

> "Switch to my Work board"
> "Go back to Main"

---

### `rename_board`
Rename an existing board.

> "Rename this board to Focus"

---

### `delete_board`
Delete a board (can't delete the last one).

> "Delete the Work board"

---

## Custom HTML Widgets

### `create_html_widget`
Generate a fully custom widget from HTML/CSS/JS. The widget runs in a sandboxed iframe and can call any external API via `fetch()`.

> "Create a widget that shows a live Bitcoin price"
> "Make a widget that displays a bar chart of my GitHub commit activity"
> "Build a pomodoro timer widget"
> "Create a widget that shows the current weather as a beautiful visual"
> "Make a custom analog clock with a dark background"

Claude generates the full HTML — you just describe what you want.

---

### `update_html_widget`
Update the HTML content of an existing custom widget.

> "Update the Bitcoin widget to also show Ethereum"
> "Make the timer widget count up instead of down"

---

## Notion Integration Tools

### `list_notion_databases`
List all Notion databases accessible via the whiteboard's API key.

> "What Notion databases do I have?"
> "Show me my databases"

---

### `link_notion_database`
Connect an existing widget to a Notion database by ID.

> "Connect the tasks widget to my Work Tasks database"

---

### `create_notion_database`
Create a new Notion database with the correct schema for a widget type, inside a parent page you specify.

- `@whiteboard/tasks` → creates a database with `Name` (title) + `Status` (Not started / In progress / Done)
- `@whiteboard/routines` → creates a database with `Date` (title) for daily routine entries

> "Create a tasks database called 'Work Tasks' in my Projects page"

---

## End-to-End Notion Workflows

### Create a widget already connected to an existing Notion database

```
List my Notion databases, then add a tasks widget connected to my "Work Tasks" database
```

Claude will:
1. Call `list_notion_databases` to get the database ID
2. Call `create_widget` with `settings: { databaseId: "..." }` — widget appears already wired up

---

### Create a brand-new Notion database and widget together

```
Create a new routines database in my Dashboard page, then add a routines widget connected to it
```

Claude will:
1. Call `create_notion_database` with `widgetType: "@whiteboard/routines"` and your parent page ID
2. Call `create_widget` with the returned `databaseId` in settings

---

### Use the Notion MCP + Whiteboard MCP together

If you have the Notion MCP connector enabled, Claude can use both at once:

```
Find my "Morning Routine" page in Notion, create a routines database inside it, then add a routines widget on the left side of my whiteboard
```

Claude will chain: Notion MCP (find page → create database) → Whiteboard MCP (create widget with databaseId)

---

### Full board setup from scratch

```
Create a Work board. In Notion, find my "Tasks" database. Add a tasks widget on the left taking up half the screen, a clock in the top-right, and a weather widget below the clock.
```

---

## Notion Database Schemas

For widgets to work correctly, Notion databases need specific property structures:

### `@whiteboard/tasks`
| Property | Type | Notes |
|----------|------|-------|
| `Name` | Title | Task name |
| `Status` | Status | Options: "Not started", "In progress", "Done" |

### `@whiteboard/routines`
| Property | Type | Notes |
|----------|------|-------|
| `Date` | Title | Entry title = date string, e.g. "Friday, March 27, 2026" |

Each routines page contains heading blocks (sections) and to_do blocks (tasks) as its content.

---

## Architecture

```
Claude Desktop
    │ MCP (stdio)
    ▼
mcp/server.ts              — MCP tools, makes HTTP calls to Express
    │ HTTP
    ▼
server/index.ts            — Express + WebSocket server (port 3001)
    │  ├── /api/canvas/*   — widget + board control → WebSocket broadcast
    │  ├── /api/databases  — Notion database listing
    │  └── /api/notion/*   — Notion database creation
    │ WebSocket
    ▼
Browser (React app)        — useCanvasSocket hook dispatches to Zustand
    │ Zustand → localStorage
    ▼
Widget canvas              — live, instant updates
```
