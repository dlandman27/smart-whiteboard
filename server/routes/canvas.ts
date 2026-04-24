import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import {
  broadcast,
  getActiveBoardId, setActiveBoardId,
  getBoardEvents, recordBoardEvent,
} from '../ws.js'
import { AppError, asyncRoute } from '../middleware/error.js'
import { supabaseAdmin } from '../lib/supabase.js'

// ── Row → API shape helpers ──────────────────────────────────────────────────
// The MCP tools and the kiosk frontend both expect camelCase shapes; the
// Supabase tables are snake_case. Centralize the conversion here so the rest
// of the app sees a stable shape regardless of source.

function rowToWidget(w: any) {
  return {
    id:             w.id,
    type:           w.type ?? undefined,
    variantId:      w.variant_id ?? undefined,
    settings:       w.settings ?? {},
    databaseId:     w.database_id ?? undefined,
    calendarId:     w.calendar_id ?? undefined,
    databaseTitle: w.database_title ?? '',
    x:              w.x,
    y:              w.y,
    width:          w.width,
    height:         w.height,
    slotId:         w.slot_id ?? undefined,
  }
}

function rowToBoard(b: any, widgets: any[] = []) {
  return {
    id:           b.id,
    name:         b.name,
    layoutId:     b.layout_id,
    boardType:    b.board_type ?? undefined,
    calendarId:   b.calendar_id ?? undefined,
    slotGap:      b.slot_gap,
    slotPad:      b.slot_pad,
    customSlots: (b.custom_slots ?? []) as any[],
    background:   b.background ?? undefined,
    widgetStyle:  b.widget_style ?? undefined,
    widgets:      widgets,
  }
}

const DEFAULT_CANVAS = { width: 1920, height: 1080 }

async function requireUserId(userId: string | undefined): Promise<string> {
  if (!userId) {
    throw new AppError(
      401,
      'No user_id available. Set DEV_USER_ID in .env (your Supabase auth.users id) or send a Bearer token.',
      'NO_USER',
    )
  }
  return userId
}

/**
 * Resolve the active board for a user.
 * Priority: explicitly set via switch_board → first non-system board by ord → first board → null.
 */
async function resolveActiveBoardId(userId: string): Promise<string | null> {
  const explicit = getActiveBoardId()
  if (explicit) {
    // Verify it actually belongs to this user — if it was set for a different user
    // session, fall through to the default.
    const { data } = await supabaseAdmin
      .from('boards').select('id').eq('id', explicit).eq('user_id', userId).maybeSingle()
    if (data) return explicit
  }
  const { data: boards } = await supabaseAdmin
    .from('boards')
    .select('id, board_type, ord')
    .eq('user_id', userId)
    .order('ord', { ascending: true })
  if (!boards?.length) return null
  // Prefer user boards over system boards
  const userBoard = boards.find((b: any) => !b.board_type)
  return (userBoard ?? boards[0]).id
}

async function loadWidgetsForBoard(boardId: string) {
  const { data, error } = await supabaseAdmin
    .from('widgets')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })
  if (error) throw new AppError(500, `Failed to load widgets: ${error.message}`)
  return (data ?? []).map(rowToWidget)
}

async function loadAllBoards(userId: string) {
  const [{ data: boardRows, error: boardErr }, { data: widgetRows, error: widgetErr }] = await Promise.all([
    supabaseAdmin.from('boards').select('*').eq('user_id', userId).order('ord', { ascending: true }),
    supabaseAdmin.from('widgets').select('*').eq('user_id', userId),
  ])
  if (boardErr) throw new AppError(500, `Failed to load boards: ${boardErr.message}`)
  if (widgetErr) throw new AppError(500, `Failed to load widgets: ${widgetErr.message}`)
  const widgetsByBoard = new Map<string, any[]>()
  for (const w of widgetRows ?? []) {
    if (!widgetsByBoard.has(w.board_id)) widgetsByBoard.set(w.board_id, [])
    widgetsByBoard.get(w.board_id)!.push(rowToWidget(w))
  }
  return (boardRows ?? []).map((b: any) => rowToBoard(b, widgetsByBoard.get(b.id) ?? []))
}

async function loadTheme(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_theme')
    .select('active_theme_id, custom_theme, custom_overrides, background')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return { themeId: null, vars: undefined, background: undefined }
  return {
    themeId:    data.active_theme_id ?? null,
    vars:       data.custom_theme ?? data.custom_overrides ?? undefined,
    background: data.background ?? undefined,
  }
}

export function canvasRouter(): Router {
  const router = Router()

  // ── Widgets ───────────────────────────────────────────────────────────────

  router.get('/canvas/widgets', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const boardId = await resolveActiveBoardId(userId)
    const widgets = boardId ? await loadWidgetsForBoard(boardId) : []
    res.json({ widgets, canvas: DEFAULT_CANVAS, activeBoardId: boardId })
  }))

  router.post('/canvas/widget', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const boardId = req.body.boardId ?? await resolveActiveBoardId(userId)
    if (!boardId) throw new AppError(400, 'No active board to add widget to. Create a board first.')

    const { widgetType, x, y, width, height, label, settings, slotId, variantId, databaseId, calendarId } = req.body
    const { data, error } = await supabaseAdmin
      .from('widgets')
      .insert({
        board_id:       boardId,
        user_id:        userId,
        type:           widgetType ?? null,
        variant_id:     variantId ?? null,
        settings:       settings ?? {},
        database_id:    databaseId ?? null,
        calendar_id:    calendarId ?? null,
        database_title: label ?? '',
        x:              Math.round(x ?? 0),
        y:              Math.round(y ?? 0),
        width:          Math.round(width ?? 300),
        height:         Math.round(height ?? 200),
        slot_id:        slotId ?? null,
      })
      .select()
      .single()
    if (error) throw new AppError(500, `Failed to create widget: ${error.message}`)

    const widget = rowToWidget(data)
    broadcast({ type: 'create_widget', id: widget.id, widgetType, x: widget.x, y: widget.y, width: widget.width, height: widget.height, label, settings: widget.settings })
    recordBoardEvent({ type: 'widget_added', widgetType, widgetId: widget.id })
    res.json({ id: widget.id, widget })
  }))

  router.patch('/canvas/widget/:id', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const { id } = req.params
    const updates: Record<string, unknown> = {}
    if (req.body.x      !== undefined) updates.x      = Math.round(req.body.x)
    if (req.body.y      !== undefined) updates.y      = Math.round(req.body.y)
    if (req.body.width  !== undefined) updates.width  = Math.round(req.body.width)
    if (req.body.height !== undefined) updates.height = Math.round(req.body.height)
    if (req.body.slotId !== undefined) updates.slot_id = req.body.slotId

    if (req.body.settings !== undefined) {
      // Merge settings rather than overwrite, matching the kiosk's update_widget semantics.
      const { data: existing } = await supabaseAdmin
        .from('widgets').select('settings').eq('id', id).eq('user_id', userId).maybeSingle()
      updates.settings = { ...(existing?.settings ?? {}), ...req.body.settings }
    }

    const { data, error } = await supabaseAdmin
      .from('widgets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new AppError(500, `Failed to update widget: ${error.message}`)
    if (!data)  throw new AppError(404, `Widget ${id} not found`)

    broadcast({ type: 'update_widget', id, ...req.body })
    res.json({ ok: true, widget: rowToWidget(data) })
  }))

  router.delete('/canvas/widget/:id', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const { error } = await supabaseAdmin
      .from('widgets').delete().eq('id', req.params.id).eq('user_id', userId)
    if (error) throw new AppError(500, `Failed to delete widget: ${error.message}`)
    broadcast({ type: 'delete_widget', id: req.params.id })
    res.json({ ok: true })
  }))

  router.post('/canvas/clear-widgets', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const boardId = await resolveActiveBoardId(userId)
    if (!boardId) return res.json({ ok: true })
    const { error } = await supabaseAdmin
      .from('widgets').delete().eq('board_id', boardId).eq('user_id', userId)
    if (error) throw new AppError(500, `Failed to clear widgets: ${error.message}`)
    broadcast({ type: 'clear_widgets' })
    res.json({ ok: true })
  }))

  // ── Layout (custom slots stored on board row) ─────────────────────────────

  router.post('/canvas/layout', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const { slots } = req.body
    if (!Array.isArray(slots)) throw new AppError(400, 'slots must be an array')
    const boardId = await resolveActiveBoardId(userId)
    if (!boardId) throw new AppError(400, 'No active board')
    const { error } = await supabaseAdmin
      .from('boards')
      .update({ custom_slots: slots, layout_id: 'custom' })
      .eq('id', boardId).eq('user_id', userId)
    if (error) throw new AppError(500, `Failed to save layout: ${error.message}`)
    broadcast({ type: 'set_custom_layout', slots })
    recordBoardEvent({ type: 'layout_changed', slotCount: slots.length })
    res.json({ ok: true })
  }))

  router.post('/canvas/screensaver', (req, res) => {
    const active = !!req.body.active
    broadcast({ type: 'set_screensaver', active })
    recordBoardEvent({ type: 'screensaver_changed', active })
    res.json({ ok: true, active })
  })

  router.post('/canvas/focus-widget', (req, res) => {
    const { id } = req.body
    if (id) {
      broadcast({ type: 'focus_widget', id })
      recordBoardEvent({ type: 'widget_focused', widgetId: id })
    } else {
      broadcast({ type: 'unfocus_widget' })
      recordBoardEvent({ type: 'widget_focused', widgetId: null })
    }
    res.json({ ok: true })
  })

  // ── Theme (persisted in user_theme) ───────────────────────────────────────

  router.post('/canvas/theme', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const themeId = req.body.themeId
    const { error } = await supabaseAdmin
      .from('user_theme')
      .upsert({ user_id: userId, active_theme_id: themeId, custom_theme: null }, { onConflict: 'user_id' })
    if (error) throw new AppError(500, `Failed to set theme: ${error.message}`)
    broadcast({ type: 'set_theme', themeId })
    recordBoardEvent({ type: 'theme_changed', themeId })
    res.json({ ok: true })
  }))

  router.post('/canvas/custom-theme', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const { vars, background } = req.body
    const { error } = await supabaseAdmin
      .from('user_theme')
      .upsert({
        user_id:         userId,
        active_theme_id: 'custom',
        custom_theme:    vars ?? {},
        background:      background ?? {},
      }, { onConflict: 'user_id' })
    if (error) throw new AppError(500, `Failed to set custom theme: ${error.message}`)
    broadcast({ type: 'set_custom_theme', vars: vars ?? {}, background })
    recordBoardEvent({ type: 'theme_changed', themeId: 'custom' })
    res.json({ ok: true })
  }))

  // ── Snapshot & events ─────────────────────────────────────────────────────

  router.get('/canvas/state', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const boardId = await resolveActiveBoardId(userId)

    const [boards, theme] = await Promise.all([
      loadAllBoards(userId),
      loadTheme(userId),
    ])
    const activeBoard = boards.find((b: any) => b.id === boardId)
    const widgets = activeBoard?.widgets ?? []
    const slots   = activeBoard?.customSlots ?? []

    res.json({
      canvas:        DEFAULT_CANVAS,
      activeBoardId: boardId,
      widgets,
      slots,
      theme,
      boards: boards.map((b: any) => ({ id: b.id, name: b.name, widgetCount: (b.widgets ?? []).length })),
    })
  }))

  router.get('/canvas/events', (req, res) => {
    const since = req.query.since ? Number(req.query.since) : undefined
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : undefined
    const events = getBoardEvents(since)
    res.json({ events: limit != null ? events.slice(-limit) : events })
  })

  router.post('/theme/generate', asyncRoute(async (req, res) => {
    const { description } = req.body as { description?: string }
    if (!description?.trim()) throw new AppError(400, 'description required')

    const apiKey = process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new AppError(503, 'ANTHROPIC_API_KEY not set', 'MISSING_CONFIG')

    const themeAnthropic = new Anthropic({ apiKey })
    const msg = await themeAnthropic.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages:   [{
        role:    'user',
        content: `Generate a whiteboard theme based on this description: "${description}"

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "name": "Theme Name",
  "dark": true or false,
  "background": { "label": "...", "bg": "#hex", "dot": "#hex" },
  "vars": {
    "widgetBg": "#hex",
    "widgetBorder": "#hex or rgba(...)",
    "widgetBorderActive": "#hex",
    "shadowSm": "0 1px 3px rgba(...)",
    "shadowMd": "0 4px 12px rgba(...)",
    "shadowLg": "0 20px 40px rgba(...)",
    "backdropFilter": "none",
    "textPrimary": "#hex",
    "textMuted": "#hex",
    "surfaceSubtle": "#hex",
    "surfaceHover": "#hex",
    "surfaceDanger": "#hex",
    "accent": "#hex",
    "accentText": "#hex",
    "danger": "#hex",
    "actionBg": "#hex",
    "actionBorder": "#hex",
    "settingsBg": "#hex",
    "settingsBorder": "#hex",
    "settingsDivider": "#hex",
    "settingsLabel": "#hex",
    "scrollThumb": "#hex",
    "clockFaceFill": "#hex",
    "clockFaceStroke": "#hex",
    "clockTickMajor": "#hex",
    "clockTickMinor": "#hex",
    "clockHands": "#hex",
    "clockSecond": "#hex",
    "clockCenter": "#hex",
    "noteDefaultBg": "#hex"
  }
}`,
      }],
    })

    const raw  = (msg.content[0] as any).text as string
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim())
    if (req.userId) {
      await supabaseAdmin.from('user_theme').upsert({
        user_id:         req.userId,
        active_theme_id: 'custom',
        custom_theme:    json.vars,
        background:      json.background,
      }, { onConflict: 'user_id' })
    }
    broadcast({ type: 'set_custom_theme', vars: json.vars, background: json.background })
    res.json({ ok: true, theme: json })
  }))

  // Avoid unused-import lint: setActiveBoardId is used by boards router via getter,
  // but we re-export it through ws.ts so other modules can mutate the active board.
  void setActiveBoardId

  return router
}
