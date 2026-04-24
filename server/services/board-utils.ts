import { broadcast, getActiveBoardId } from '../ws.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { loadMemory, saveMemory } from './memory.js'
import { log } from '../lib/logger.js'

// ── Supabase board state ──────────────────────────────────────────────────────

export async function fetchBoardState(userId: string): Promise<{
  boards: any[]
  activeBoardId: string
}> {
  const { data } = await supabaseAdmin
    .from('boards')
    .select('id, name, widgets:widgets(id, type, variant_id, settings, database_id, database_title, x, y, width, height)')
    .eq('user_id', userId)

  const boards = (data ?? []).map((b: any) => ({
    id:      b.id,
    name:    b.name,
    widgets: (b.widgets ?? []).map((w: any) => ({
      id:            w.id,
      type:          w.type,
      settings:      w.settings ?? {},
      databaseId:    w.database_id,
      databaseTitle: w.database_title ?? '',
      x: w.x, y: w.y, width: w.width, height: w.height,
    })),
  }))

  const explicit      = getActiveBoardId()
  const activeBoardId = (explicit && boards.find((b) => b.id === explicit))
    ? explicit
    : boards[0]?.id ?? ''

  return { boards, activeBoardId }
}

// ── Typed canvas operations (direct in-process, no HTTP round-trip) ───────────

export const canvas = {
  createWidget:  (body: Record<string, unknown>): { id: string } => {
    const id = crypto.randomUUID()
    broadcast({ type: 'create_widget', id, ...body })
    return { id }
  },

  updateWidget:  (id: string, body: Record<string, unknown>): void => {
    broadcast({ type: 'update_widget', id, ...body })
  },

  deleteWidget:  (id: string): void => { broadcast({ type: 'delete_widget', id }) },

  focusWidget:   (id?: string): void => {
    if (id) broadcast({ type: 'focus_widget', id })
    else    broadcast({ type: 'unfocus_widget' })
  },

  setTheme:      (themeId: string): void => { broadcast({ type: 'set_theme', themeId }) },

  createBoard:   (name: string): { id: string } => {
    const id = crypto.randomUUID()
    broadcast({ type: 'create_board', id, name })
    return { id }
  },

  activateBoard: (id: string): void => { broadcast({ type: 'switch_board', id }) },
  renameBoard:   (id: string, name: string): void => { broadcast({ type: 'rename_board', id, name }) },
  deleteBoard:   (id: string): void => { broadcast({ type: 'delete_board', id }) },
}

// ── Board snapshot helpers ────────────────────────────────────────────────────

export async function autoSaveDatabases(userId: string): Promise<void> {
  const { boards } = await fetchBoardState(userId)
  if (!boards.length) return
  const mem      = loadMemory()
  const knownIds = new Set(Object.values(mem.databases))
  let changed    = false
  for (const board of boards) {
    for (const w of board.widgets) {
      const dbId = w.settings?.databaseId as string | undefined
      if (!dbId || knownIds.has(dbId)) continue
      const label: string = w.databaseTitle ?? w.settings?.title ?? w.settings?.label ?? w.type ?? dbId
      mem.databases[label] = dbId
      knownIds.add(dbId)
      changed = true
      log(`[memory] auto-saved database "${label}" → ${dbId}`)
    }
  }
  if (changed) saveMemory(mem)
}

export async function getBoardSnapshot(userId: string): Promise<string> {
  await autoSaveDatabases(userId)
  const { boards, activeBoardId } = await fetchBoardState(userId)
  const board = boards.find((b) => b.id === activeBoardId)
  if (!board) return ''
  const widgets = board.widgets.map((w: any) =>
    `  - id:${w.id} type:${w.type}${w.settings?.databaseId ? ` databaseId:${w.settings.databaseId}` : ''}${w.settings?.title ? ` title:"${w.settings.title}"` : ''}${w.databaseTitle ? ` label:"${w.databaseTitle}"` : ''}`
  ).join('\n')
  return `\nCurrent board: "${board.name}" (id:${board.id})\nWidgets on board:\n${widgets || '  (none)'}`
}

// ── Misc utilities ─────────────────────────────────────────────────────────────

export function ordinal(n: number): string {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

export function leagueLabel(key: string): string {
  const labels: Record<string, string> = {
    premierleague: 'Premier League', epl: 'Premier League',
    laliga: 'La Liga', bundesliga: 'Bundesliga',
    seriea: 'Serie A', ligue1: 'Ligue 1',
    ucl: 'Champions League', mls: 'MLS',
  }
  return labels[key] ?? key
}
