import { Router } from 'express'
import { broadcast, getActiveBoardId, setActiveBoardId, recordBoardEvent } from '../ws.js'
import { AppError, asyncRoute } from '../middleware/error.js'
import { supabaseAdmin } from '../lib/supabase.js'

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
    customSlots: (b.custom_slots ?? []) as any[],
    background:   b.background ?? undefined,
    widgetStyle:  b.widget_style ?? undefined,
    widgets,
  }
}

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

export function boardsRouter(): Router {
  const router = Router()

  router.get('/canvas/boards', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
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
    const boards = (boardRows ?? []).map((b: any) => rowToBoard(b, widgetsByBoard.get(b.id) ?? []))

    // Resolve active board: cached value if it belongs to the user, else first non-system board
    let activeBoardId: string | null = getActiveBoardId() || null
    if (!activeBoardId || !boards.some((b: any) => b.id === activeBoardId)) {
      const userBoard = boards.find((b: any) => !b.boardType)
      activeBoardId = (userBoard ?? boards[0])?.id ?? null
    }

    res.json({ boards, activeBoardId })
  }))

  router.post('/canvas/board', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const name = req.body.name ?? 'New Board'

    // Find max ord for this user
    const { data: existing } = await supabaseAdmin
      .from('boards').select('ord').eq('user_id', userId).order('ord', { ascending: false }).limit(1).maybeSingle()
    const ord = (existing?.ord ?? -1) + 1

    const { data, error } = await supabaseAdmin
      .from('boards')
      .insert({
        user_id:   userId,
        name,
        layout_id: 'dashboard',
        ord,
      })
      .select()
      .single()
    if (error) throw new AppError(500, `Failed to create board: ${error.message}`)

    setActiveBoardId(data.id)
    broadcast({ type: 'create_board', id: data.id, name })
    broadcast({ type: 'switch_board', id: data.id })
    recordBoardEvent({ type: 'board_switched', boardId: data.id, boardName: name })
    res.json({ id: data.id, board: rowToBoard(data) })
  }))

  router.patch('/canvas/board/:id', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    const updates: Record<string, unknown> = {}
    if (req.body.name        !== undefined) updates.name         = req.body.name
    if (req.body.layoutId    !== undefined) updates.layout_id    = req.body.layoutId
    if (req.body.background  !== undefined) updates.background   = req.body.background
    if (req.body.widgetStyle !== undefined) updates.widget_style = req.body.widgetStyle
    if (req.body.customSlots !== undefined) updates.custom_slots = req.body.customSlots

    const { data, error } = await supabaseAdmin
      .from('boards').update(updates).eq('id', req.params.id).eq('user_id', userId).select().single()
    if (error) throw new AppError(500, `Failed to update board: ${error.message}`)
    if (!data)  throw new AppError(404, `Board ${req.params.id} not found`)

    if (req.body.name !== undefined) {
      broadcast({ type: 'rename_board', id: req.params.id, name: req.body.name })
    }
    res.json({ ok: true, board: rowToBoard(data) })
  }))

  router.delete('/canvas/board/:id', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    // Refuse to delete the last board
    const { data: boards } = await supabaseAdmin
      .from('boards').select('id').eq('user_id', userId)
    if ((boards?.length ?? 0) <= 1) {
      throw new AppError(400, 'Cannot delete the last remaining board.')
    }
    const { error } = await supabaseAdmin
      .from('boards').delete().eq('id', req.params.id).eq('user_id', userId)
    if (error) throw new AppError(500, `Failed to delete board: ${error.message}`)

    // If we just deleted the active board, fall back to another
    if (getActiveBoardId() === req.params.id) {
      const next = (boards ?? []).find((b: any) => b.id !== req.params.id)
      setActiveBoardId(next?.id ?? '')
      if (next) broadcast({ type: 'switch_board', id: next.id })
    }
    broadcast({ type: 'delete_board', id: req.params.id })
    res.json({ ok: true })
  }))

  router.post('/canvas/board/:id/activate', asyncRoute(async (req, res) => {
    const userId = await requireUserId(req.userId)
    // Verify the board exists for this user
    const { data } = await supabaseAdmin
      .from('boards').select('id, name').eq('id', req.params.id).eq('user_id', userId).maybeSingle()
    if (!data) throw new AppError(404, `Board ${req.params.id} not found`)
    setActiveBoardId(req.params.id)
    broadcast({ type: 'switch_board', id: req.params.id })
    recordBoardEvent({ type: 'board_switched', boardId: req.params.id, boardName: data.name })
    res.json({ ok: true })
  }))

  return router
}
