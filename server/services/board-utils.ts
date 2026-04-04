import { broadcast, getWidgets, getCanvas, getBoards, getActiveBoardId } from '../ws.js'
import { loadMemory, saveMemory } from './memory.js'

// ── Typed canvas operations (direct in-process, no HTTP round-trip) ────────────

export const canvas = {
  getWidgets:    (): { widgets: unknown[]; canvas: { width: number; height: number } } =>
    ({ widgets: getWidgets(), canvas: getCanvas() }),

  getBoards:     (): { boards: unknown[]; activeBoardId: string } =>
    ({ boards: getBoards(), activeBoardId: getActiveBoardId() }),

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

// ── Board snapshot helpers ─────────────────────────────────────────────────────

export function autoSaveDatabases() {
  const boards = getBoards()
  if (!boards.length) return
  const mem = loadMemory()
  const knownIds = new Set(Object.values(mem.databases))
  let changed = false
  for (const board of boards) {
    for (const w of (board.widgets ?? []) as any[]) {
      const dbId = w.settings?.databaseId as string | undefined
      if (!dbId || knownIds.has(dbId)) continue
      const label: string = w.databaseTitle ?? w.settings?.title ?? w.settings?.label ?? w.type ?? dbId
      mem.databases[label] = dbId
      knownIds.add(dbId)
      changed = true
      console.log(`[memory] auto-saved database "${label}" → ${dbId}`)
    }
  }
  if (changed) saveMemory(mem)
}

export function getBoardSnapshot(): string {
  autoSaveDatabases()
  const boards        = getBoards()
  const activeBoardId = getActiveBoardId()
  const board = (boards ?? []).find((b: any) => b.id === activeBoardId)
  if (!board) return ''
  const widgets = (board.widgets ?? []).map((w: any) =>
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
