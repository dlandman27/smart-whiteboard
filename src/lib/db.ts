import type { WidgetLayout } from '../types'
import type { Board } from '../store/whiteboard'
import { supabase } from './supabase'

// ── Read ──────────────────────────────────────────────────────────────────────

export async function loadBoards(userId: string): Promise<Board[]> {
  const { data: boardRows, error: boardErr } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', userId)
    .order('ord')

  if (boardErr) throw boardErr
  if (!boardRows?.length) return []

  const { data: widgetRows, error: widgetErr } = await supabase
    .from('widgets')
    .select('*')
    .in('board_id', boardRows.map((b) => b.id))

  if (widgetErr) throw widgetErr

  return boardRows.map((b) => ({
    id:       b.id,
    name:     b.name,
    layoutId: b.layout_id,
    slotGap:  b.slot_gap ?? undefined,
    slotPad:  b.slot_pad ?? undefined,
    widgets:  (widgetRows ?? [])
      .filter((w) => w.board_id === b.id)
      .map(rowToWidget),
  }))
}

function rowToWidget(w: any): WidgetLayout {
  return {
    id:            w.id,
    type:          w.type ?? undefined,
    settings:      w.settings ?? {},
    databaseId:    w.database_id    ?? undefined,
    calendarId:    w.calendar_id    ?? undefined,
    databaseTitle: w.database_title ?? '',
    x:      w.x,
    y:      w.y,
    width:  w.width,
    height: w.height,
    slotId: w.slot_id ?? undefined,
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function upsertBoard(board: Board, userId: string, ord: number): Promise<void> {
  const { error } = await supabase.from('boards').upsert({
    id:        board.id,
    user_id:   userId,
    name:      board.name,
    layout_id: board.layoutId,
    slot_gap:  board.slotGap ?? 12,
    slot_pad:  board.slotPad ?? 16,
    ord,
  })
  if (error) console.error('upsertBoard:', error)
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId)
  if (error) console.error('deleteBoard:', error)
}

export async function upsertWidget(widget: WidgetLayout, boardId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('widgets').upsert({
    id:             widget.id,
    board_id:       boardId,
    user_id:        userId,
    type:           widget.type           ?? null,
    settings:       widget.settings       ?? {},
    database_id:    widget.databaseId     ?? null,
    calendar_id:    widget.calendarId     ?? null,
    database_title: widget.databaseTitle  ?? '',
    x:       Math.round(widget.x),
    y:       Math.round(widget.y),
    width:   Math.round(widget.width),
    height:  Math.round(widget.height),
    slot_id: widget.slotId ?? null,
  })
  if (error) console.error('upsertWidget:', error)
}

export async function deleteWidget(widgetId: string): Promise<void> {
  const { error } = await supabase.from('widgets').delete().eq('id', widgetId)
  if (error) console.error('deleteWidget:', error)
}
