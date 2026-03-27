# MCP Canvas Control — Tech Plan

## Goal

Let Claude (via Claude Desktop) control the whiteboard canvas using natural language. Claude can create, move, resize, update settings on, and delete widgets in real time.

---

## Architecture

```
Claude Desktop
    │  (MCP stdio transport)
    ▼
mcp/server.ts          ← Node.js MCP server process
    │  HTTP  POST/PATCH/DELETE  http://localhost:3001/api/canvas/...
    ▼
server/index.ts        ← Express + WebSocket server
    │  ws.send(command)
    ▼
Browser (React app)    ← WebSocket client hook
    │  Zustand store actions
    ▼
WidgetCanvas           ← renders updated widgets
```

State ownership: the browser owns all widget state (Zustand → localStorage).
The Express server caches a snapshot of the active board's widgets (sent by the browser via WebSocket on every change) so that `list_widgets` can respond without a round-trip back to the browser.

---

## New Files

| File | Purpose |
|------|---------|
| `mcp/server.ts` | MCP server — defines 4 tools, makes HTTP requests to Express |
| `src/hooks/useCanvasSocket.ts` | React hook — opens WebSocket to Express, dispatches incoming commands to Zustand |

## Modified Files

| File | Change |
|------|--------|
| `server/index.ts` | Add `ws` WebSocket server + 4 canvas HTTP endpoints |
| `src/store/whiteboard.ts` | Allow optional `id` in `addWidget` so server-generated IDs stick |
| `src/components/Whiteboard.tsx` | Mount `useCanvasSocket()` |
| `package.json` | Add deps (`ws`, `@types/ws`, `@modelcontextprotocol/sdk`, `zod`) and `mcp` script |

---

## MCP Tools

### `create_widget`
Creates a new widget on the active board.

**Input:**
```json
{
  "widgetType": "@whiteboard/clock",   // required — see widget types below
  "x": 100,                            // optional, pixels from left (default: centered)
  "y": 100,                            // optional, pixels from top  (default: centered)
  "width": 320,                        // optional, falls back to widget default
  "height": 200,                       // optional, falls back to widget default
  "settings": {}                       // optional, widget-specific settings
}
```

**Returns:** `{ id: string }` — the widget's ID for subsequent operations.

---

### `update_widget`
Moves, resizes, or changes settings on an existing widget.

**Input:**
```json
{
  "id": "uuid",
  "x": 200,          // optional
  "y": 300,          // optional
  "width": 400,      // optional
  "height": 300,     // optional
  "settings": {}     // optional — merged with existing settings
}
```

---

### `delete_widget`
Removes a widget from the board.

**Input:** `{ "id": "uuid" }`

---

### `list_widgets`
Returns all widgets on the currently active board.

**Returns:**
```json
{
  "widgets": [
    { "id": "...", "type": "@whiteboard/clock", "x": 100, "y": 100, "width": 320, "height": 200, "settings": {} }
  ]
}
```

---

## Widget Types

| Type | Default Size |
|------|-------------|
| `@whiteboard/clock` | 320 × 200 |
| `@whiteboard/weather` | 300 × 220 |
| `@whiteboard/weight` | 340 × 200 |
| `@whiteboard/tasks` | 320 × 400 |
| `@whiteboard/countdown` | 300 × 240 |
| `@whiteboard/quote` | 360 × 260 |
| `@whiteboard/routines` | 320 × 480 |

---

## WebSocket Message Protocol

### Server → Browser (commands)
```json
{ "type": "create_widget", "id": "uuid", "widgetType": "@whiteboard/clock", "x": 100, "y": 100, "width": 320, "height": 200, "settings": {} }
{ "type": "update_widget", "id": "uuid", "x": 200, "settings": { "timezone": "US/Pacific" } }
{ "type": "delete_widget", "id": "uuid" }
```

### Browser → Server (state sync)
```json
{ "type": "state_update", "widgets": [ /* WidgetLayout[] */ ] }
```
Sent on connection and on every Zustand store change.

---

## Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "whiteboard": {
      "command": "npx",
      "args": ["tsx", "/path/to/smart-whiteboard/mcp/server.ts"]
    }
  }
}
```

Or after building:
```json
{
  "mcpServers": {
    "whiteboard": {
      "command": "node",
      "args": ["/path/to/smart-whiteboard/mcp/server.js"]
    }
  }
}
```

---

## Implementation Steps

1. ✅ Install packages: `ws`, `@types/ws`, `@modelcontextprotocol/sdk`, `zod`
2. ✅ Modify `server/index.ts` — WebSocket server + 4 canvas endpoints
3. ✅ Modify `src/store/whiteboard.ts` — allow optional `id` in `addWidget`
4. ✅ Create `src/hooks/useCanvasSocket.ts`
5. ✅ Modify `src/components/Whiteboard.tsx` — mount hook
6. ✅ Create `mcp/server.ts`
7. ✅ Update `package.json` — deps + `mcp` script
