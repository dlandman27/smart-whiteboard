---
name: board-core
description: Work on the Board Core pillar — layouts, multi-board, templates, screen scheduling, sharing, display mode, themes, backgrounds. Use when building or improving the board infrastructure.
---

# Board Core Pillar

You are working on the Board Core pillar of the smart-whiteboard app. This is the foundation everything else sits on.

## Architecture

- **Store**: Zustand at `src/store/whiteboard.ts` — boards, widgets, layouts, active board
- **Layout engine**: `src/layouts/presets.ts` — 16+ presets with fractional slot positioning
- **Widget canvas**: `src/components/WidgetCanvas.tsx` — drag/resize, slot snapping, occupant swapping
- **Themes**: `src/store/theme.ts` — 23 presets (10 light, 13 dark), CSS custom properties
- **Backgrounds**: `src/constants/backgrounds.ts` — 28 presets (dots, lines, grid, solid, gradient, image)
- **Display mode**: `src/store/ui.ts` (displayMode state), overlay in `src/components/Whiteboard.tsx`
- **Persistence**: Supabase tables: `boards`, `widgets`, `board_drawings`, `user_theme`, `board_shares`
- **Real-time sync**: WebSocket in `server/ws.ts`, client hook `src/hooks/useCanvasSocket.ts`

## Current state (7/10)

**Fully built**: Layout engine (16+ presets, custom AI layouts), drag/resize with slot snapping, unlimited multi-board with reordering, 23 themes, 28 backgrounds, display mode (fullscreen + overlay with board tabs), Supabase persistence, WebSocket sync

**Half-built**:
- Board templates: system boards (Calendar, Settings, Connectors, Today, Todo) have special renderers, but NO "new board from template" for users
- Sharing: `board_shares` table exists with viewer/editor/admin roles, `is_public` + `share_code` fields — but ZERO UI or logic implemented

**Missing**:
- Screen scheduling (auto-switch boards by time of day)
- User-facing board templates ("Family Hub", "Home Office", "Kitchen Display")
- Multi-user collaboration (real-time presence, cursors, live sync)
- Photo wallpapers (Google Photos as board background)
- Display mode improvements (auto-cycling boards, motion-triggered wake, screen dimming schedule)

## Key files

- `src/store/whiteboard.ts` — Board + widget state (Zustand)
- `src/store/ui.ts` — UI state including displayMode
- `src/store/theme.ts` — Theme state + CSS var application
- `src/components/Whiteboard.tsx` — Main layout, display mode overlay
- `src/components/WidgetCanvas.tsx` — Widget rendering, drag/resize, slot logic
- `src/components/Sidebar.tsx` — Board navigation, display mode toggle
- `src/components/BottomToolbar.tsx` — Tool picker, widget picker
- `src/layouts/presets.ts` — Layout definitions
- `src/constants/backgrounds.ts` — Background presets
- `src/lib/db.ts` — Supabase persistence layer
- `server/ws.ts` — WebSocket server for real-time sync
- `supabase/migrations/001_initial_schema.sql` — Database schema

## Key types

```typescript
interface Board {
  id: string; name: string; layoutId: string;
  boardType?: 'calendar' | 'settings' | 'connectors' | 'today' | 'todo';
  widgets: WidgetLayout[]; background?: Background;
  widgetStyle?: 'solid' | 'glass' | 'borderless';
  slotGap?: number; slotPad?: number; customSlots?: LayoutSlot[];
}

interface WidgetLayout {
  id: string; type: string; variantId?: string;
  x: number; y: number; width: number; height: number;
  settings: Record<string, unknown>; slotId?: string;
}
```

## Conventions

- Board IDs are UUIDs; system boards use deterministic UUIDs (`00000000-0000-4000-8000-00000000000X`)
- Layouts use fractional coordinates (0-1) for slot positions
- Theme changes apply via CSS custom properties on `:root`
- Widget styles: 'solid' (default), 'glass' (backdrop-filter), 'borderless'
- All Supabase operations go through `src/lib/db.ts`
- Board changes sync via WebSocket broadcast

## When working on this pillar

1. Read `src/store/whiteboard.ts` and `src/components/Whiteboard.tsx` first
2. Layout changes must preserve existing widget positions
3. Theme CSS vars are defined in `packages/ui-kit/src/theme/` — don't hardcode colors
4. Test with multiple boards and different layout presets
5. Display mode must remain functional (Escape to exit, hover overlay for board tabs)
6. Dark theme compliance — match Dracula's comfortable mid-dark level, not pitch-black
