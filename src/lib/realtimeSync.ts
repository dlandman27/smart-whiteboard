import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useWhiteboardStore } from '../store/whiteboard'

let channel: RealtimeChannel | null = null

// Track IDs that were recently changed locally — skip Realtime updates for these
const recentlyTouched = new Map<string, number>() // id → timestamp
const TOUCH_TTL = 2000 // ignore remote updates for 2s after local change

// Permanently track deleted board IDs to prevent Realtime from re-inserting them
const deletedBoardIds = new Set<string>()
export function markBoardDeleted(id: string) { deletedBoardIds.add(id) }

export function touchId(id: string) {
  recentlyTouched.set(id, Date.now())
}

function isRecentlyTouched(id: string): boolean {
  const ts = recentlyTouched.get(id)
  if (!ts) return false
  if (Date.now() - ts > TOUCH_TTL) {
    recentlyTouched.delete(id)
    return false
  }
  return true
}

/**
 * Subscribe to Supabase Realtime for boards and widgets.
 * Applies remote changes to the Zustand store, skipping recently-touched items.
 */
export function startRealtimeSync(userId: string) {
  stopRealtimeSync()

  // Realtime disabled for boards — single-user app, sync subscriber handles everything.
  // Board Realtime was causing deleted boards to reappear due to Supabase event log replay.
  // Re-enable when multi-user collaboration is implemented.
  channel = supabase
    .channel('board-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'widgets', filter: `user_id=eq.${userId}` },
      (payload) => handleWidgetChange(payload)
    )
    .subscribe()
}

export function stopRealtimeSync() {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
}

function handleBoardChange(payload: any) {
  const { eventType, new: newRow, old: oldRow } = payload
  const store = useWhiteboardStore

  if (eventType === 'DELETE' && oldRow?.id) {
    deletedBoardIds.add(oldRow.id)
    if (isRecentlyTouched(oldRow.id)) return
    store.setState((s) => ({
      boards: s.boards.filter((b) => b.id !== oldRow.id),
    }))
    return
  }

  if (eventType === 'INSERT' && newRow) {
    // Skip — boards are synced via syncBoards.ts. Realtime INSERT caused ghost boards in multi-tab.
    return
  }

  if (eventType === 'UPDATE' && newRow) {
    if (isRecentlyTouched(newRow.id)) return
    store.setState((s) => ({
      boards: s.boards.map((b) =>
        b.id === newRow.id
          ? {
              ...b,
              name:        newRow.name,
              layoutId:    newRow.layout_id,
              boardType:   newRow.board_type ?? undefined,
              calendarId:  newRow.calendar_id ?? undefined,
              slotGap:     newRow.slot_gap ?? undefined,
              slotPad:     newRow.slot_pad ?? undefined,
              customSlots: newRow.custom_slots ?? undefined,
              background:  newRow.background && Object.keys(newRow.background).length > 0 ? newRow.background : undefined,
              widgetStyle: newRow.widget_style ?? undefined,
            }
          : b
      ),
    }))
  }
}

function handleWidgetChange(payload: any) {
  const { eventType, new: newRow, old: oldRow } = payload
  const store = useWhiteboardStore

  if (eventType === 'DELETE' && oldRow?.id) {
    if (isRecentlyTouched(oldRow.id)) return
    store.setState((s) => ({
      boards: s.boards.map((b) => ({
        ...b,
        widgets: b.widgets.filter((w) => w.id !== oldRow.id),
      })),
    }))
    return
  }

  const widget = newRow ? {
    id:            newRow.id,
    type:          newRow.type ?? undefined,
    variantId:     newRow.variant_id ?? undefined,
    settings:      newRow.settings ?? {},
    databaseId:    newRow.database_id ?? undefined,
    calendarId:    newRow.calendar_id ?? undefined,
    databaseTitle: newRow.database_title ?? '',
    x:             newRow.x,
    y:             newRow.y,
    width:         newRow.width,
    height:        newRow.height,
    slotId:        newRow.slot_id ?? undefined,
  } : null

  if (eventType === 'INSERT' && widget && newRow.board_id) {
    if (isRecentlyTouched(widget.id)) return
    store.setState((s) => ({
      boards: s.boards.map((b) =>
        b.id === newRow.board_id && !b.widgets.some((w) => w.id === widget.id)
          ? { ...b, widgets: [...b.widgets, widget] }
          : b
      ),
    }))
    return
  }

  if (eventType === 'UPDATE' && widget && newRow.board_id) {
    if (isRecentlyTouched(widget.id)) return
    store.setState((s) => ({
      boards: s.boards.map((b) =>
        b.id === newRow.board_id
          ? { ...b, widgets: b.widgets.map((w) => w.id === widget.id ? widget : w) }
          : b
      ),
    }))
  }
}
