import type { WidgetLayout, LayoutSlot } from '../types'
import type { Board, WidgetStyle } from '../store/whiteboard'
import type { Background } from '../constants/backgrounds'
import type { BoardSchedule } from '../constants/schedulePresets'
import { DEFAULT_SCHEDULE } from '../constants/schedulePresets'
import { supabase } from './supabase'
import { useNotificationStore } from '../store/notifications'

// Debounce error notifications to avoid flooding on rapid failures
let lastErrorTime = 0
function notifyError(label: string, error: any) {
  console.error(`${label}:`, error)
  const now = Date.now()
  if (now - lastErrorTime < 5000) return // max one error toast per 5s
  lastErrorTime = now
  useNotificationStore.getState().addNotification({
    title: 'Sync error',
    body:  `Failed to save ${label.replace(/^(upsert|delete)/, '').toLowerCase()}. Changes may not persist.`,
    type:  'error',
  })
}

// ── Board helpers ────────────────────────────────────────────────────────────

function rowToBoard(b: any, widgetRows: any[]): Board {
  return {
    id:          b.id,
    name:        b.name,
    layoutId:    b.layout_id,
    boardType:   b.board_type ?? undefined,
    calendarId:  b.calendar_id ?? undefined,
    slotGap:     b.slot_gap ?? undefined,
    slotPad:     b.slot_pad ?? undefined,
    customSlots: (b.custom_slots as LayoutSlot[]) ?? undefined,
    background:  (b.background && Object.keys(b.background).length > 0)
      ? b.background as Background
      : undefined,
    widgetStyle: (b.widget_style as WidgetStyle) ?? undefined,
    widgets:     widgetRows
      .filter((w) => w.board_id === b.id)
      .map(rowToWidget),
  }
}

function rowToWidget(w: any): WidgetLayout {
  return {
    id:            w.id,
    type:          w.type ?? undefined,
    variantId:     w.variant_id ?? undefined,
    settings:      w.settings ?? {},
    databaseId:    w.database_id ?? undefined,
    calendarId:    w.calendar_id ?? undefined,
    databaseTitle: w.database_title ?? '',
    x:             w.x,
    y:             w.y,
    width:         w.width,
    height:        w.height,
    slotId:        w.slot_id ?? undefined,
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

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

  return boardRows.map((b) => rowToBoard(b, widgetRows ?? []))
}

// ── Write ────────────────────────────────────────────────────────────────────

export async function upsertBoard(board: Board, userId: string, ord: number): Promise<void> {
  const { error } = await supabase.from('boards').upsert({
    id:           board.id,
    user_id:      userId,
    name:         board.name,
    layout_id:    board.layoutId,
    board_type:   board.boardType ?? null,
    calendar_id:  board.calendarId ?? null,
    slot_gap:     board.slotGap ?? 12,
    slot_pad:     board.slotPad ?? 16,
    custom_slots: board.customSlots ?? [],
    background:   board.background ?? {},
    widget_style: board.widgetStyle ?? null,
    ord,
  })
  if (error) notifyError('upsertBoard', error)
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId)
  if (error) notifyError('deleteBoard', error)
}

export async function upsertWidget(widget: WidgetLayout, boardId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('widgets').upsert({
    id:             widget.id,
    board_id:       boardId,
    user_id:        userId,
    type:           widget.type ?? null,
    variant_id:     widget.variantId ?? null,
    settings:       widget.settings ?? {},
    database_id:    widget.databaseId ?? null,
    calendar_id:    widget.calendarId ?? null,
    database_title: widget.databaseTitle ?? '',
    x:              Math.round(widget.x),
    y:              Math.round(widget.y),
    width:          Math.round(widget.width),
    height:         Math.round(widget.height),
    slot_id:        widget.slotId ?? null,
  })
  if (error) notifyError('upsertWidget', error)
}

export async function deleteWidget(widgetId: string): Promise<void> {
  const { error } = await supabase.from('widgets').delete().eq('id', widgetId)
  if (error) notifyError('deleteWidget', error)
}

// ── Theme ────────────────────────────────────────────────────────────────────

export interface ThemeRow {
  activeThemeId: string
  customOverrides: Record<string, string>
  customTheme: Record<string, string> | null
  background: Background
  petsEnabled: boolean
}

export async function loadTheme(userId: string): Promise<ThemeRow | null> {
  const { data, error } = await supabase
    .from('user_theme')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return {
    activeThemeId:  data.active_theme_id,
    customOverrides: data.custom_overrides ?? {},
    customTheme:    data.custom_theme ?? null,
    background:     data.background ?? {},
    petsEnabled:    data.pets_enabled ?? false,
  }
}

export async function upsertTheme(userId: string, theme: ThemeRow): Promise<void> {
  const { error } = await supabase.from('user_theme').upsert({
    user_id:          userId,
    active_theme_id:  theme.activeThemeId,
    custom_overrides: theme.customOverrides,
    custom_theme:     theme.customTheme,
    background:       theme.background,
    pets_enabled:     theme.petsEnabled,
  })
  if (error) notifyError('upsertTheme', error)
}

// ── Drawings ─────────────────────────────────────────────────────────────────

export async function loadDrawing(boardId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('board_drawings')
    .select('data_url')
    .eq('board_id', boardId)
    .single()

  if (error || !data) return null
  return data.data_url
}

export async function upsertDrawing(boardId: string, userId: string, dataUrl: string): Promise<void> {
  const { error } = await supabase.from('board_drawings').upsert({
    board_id: boardId,
    user_id:  userId,
    data_url: dataUrl,
  })
  if (error) notifyError('upsertDrawing', error)
}

// ── Schedule ────────────────────────────────────────────────────────────────

export async function loadSchedule(userId: string): Promise<BoardSchedule | null> {
  const { data, error } = await supabase
    .from('board_schedule')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return (data.schedule as BoardSchedule) ?? DEFAULT_SCHEDULE
}

export async function upsertSchedule(userId: string, schedule: BoardSchedule): Promise<void> {
  const { error } = await supabase.from('board_schedule').upsert({
    user_id:  userId,
    schedule,
  })
  if (error) notifyError('upsertSchedule', error)
}
