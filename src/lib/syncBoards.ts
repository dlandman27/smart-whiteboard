import { useWhiteboardStore, type Board } from '../store/whiteboard'
import { upsertBoard, deleteBoard, upsertWidget, deleteWidget, upsertSchedule } from './db'
import { touchId, markBoardDeleted } from './realtimeSync'

let unsub: (() => void) | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let scheduleDebounce: ReturnType<typeof setTimeout> | null = null
const deletedBoardIds = new Set<string>()
const createdThisSession = new Set<string>()
const prevKnownIds = new Set<string>()

export function markBoardCreated(id: string) { createdThisSession.add(id); prevKnownIds.add(id) }

/**
 * Subscribe to whiteboard store changes and sync to Supabase.
 * Board add/remove/rename: immediate. Widget position: debounced 300ms.
 */
let activeSyncUserId: string | null = null

export function startBoardSync(userId: string) {
  // Prevent double-init — if already syncing for this user, skip
  if (activeSyncUserId === userId && unsub) return
  stopBoardSync()
  activeSyncUserId = userId

  let prevBoards = useWhiteboardStore.getState().boards
  let prevSchedule = useWhiteboardStore.getState().schedule

  // Track all boards from initial load as "known" — safe to upsert for ord changes
  prevBoards.forEach(b => prevKnownIds.add(b.id))

  unsub = useWhiteboardStore.subscribe((state) => {
    const nextBoards = state.boards
    // Schedule sync (debounced)
    if (state.schedule !== prevSchedule) {
      prevSchedule = state.schedule
      if (scheduleDebounce) clearTimeout(scheduleDebounce)
      scheduleDebounce = setTimeout(() => {
        upsertSchedule(userId, state.schedule)
      }, 500)
    }

    // Detect added/removed boards
    const prevIds = new Set(prevBoards.map(b => b.id))
    const nextIds = new Set(nextBoards.map(b => b.id))

    // Deleted boards
    for (const b of prevBoards) {
      if (!nextIds.has(b.id)) {
        deletedBoardIds.add(b.id)
        markBoardDeleted(b.id)
        touchId(b.id)
        deleteBoard(b.id)
      }
    }

    // Added or changed boards — debounce position updates, immediate for structural changes
    for (let i = 0; i < nextBoards.length; i++) {
      const board = nextBoards[i]
      const prev = prevBoards.find(b => b.id === board.id)

      if (!prev) {
        // Skip system boards
        if (board.boardType) continue
        // Skip deleted boards
        if (deletedBoardIds.has(board.id)) continue
        // Only upsert boards we explicitly created this session
        if (!createdThisSession.has(board.id)) continue
        touchId(board.id)
        upsertBoard(board, userId, i)
        for (const w of board.widgets) {
          touchId(w.id)
          upsertWidget(w, board.id, userId)
        }
      } else if (boardMetaChanged(prev, board)) {
        // Board metadata changed — immediate
        touchId(board.id)
        upsertBoard(board, userId, i)
      }

      // Widget changes
      if (prev) {
        syncWidgets(prev, board, userId)
      }
    }

    // Debounced: upsert all boards for ord changes (reorder)
    if (boardOrderChanged(prevBoards, nextBoards)) {
      scheduleDebouncedSync(nextBoards, userId)
    }

    prevBoards = nextBoards
  })
}

export function stopBoardSync() {
  unsub?.()
  unsub = null
  activeSyncUserId = null
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (scheduleDebounce) {
    clearTimeout(scheduleDebounce)
    scheduleDebounce = null
  }
}

function boardMetaChanged(a: Board, b: Board): boolean {
  return (
    a.name !== b.name ||
    a.layoutId !== b.layoutId ||
    a.boardType !== b.boardType ||
    a.widgetStyle !== b.widgetStyle ||
    a.slotGap !== b.slotGap ||
    a.slotPad !== b.slotPad ||
    JSON.stringify(a.background) !== JSON.stringify(b.background) ||
    JSON.stringify(a.customSlots) !== JSON.stringify(b.customSlots)
  )
}

function boardOrderChanged(a: Board[], b: Board[]): boolean {
  if (a.length !== b.length) return true
  return a.some((board, i) => board.id !== b[i].id)
}

function syncWidgets(prev: Board, next: Board, userId: string) {
  const prevIds = new Set(prev.widgets.map(w => w.id))
  const nextIds = new Set(next.widgets.map(w => w.id))

  // Deleted widgets
  for (const w of prev.widgets) {
    if (!nextIds.has(w.id)) {
      touchId(w.id)
      deleteWidget(w.id)
    }
  }

  // Added or changed widgets
  for (const w of next.widgets) {
    const prevW = prev.widgets.find(pw => pw.id === w.id)
    if (!prevW || widgetChanged(prevW, w)) {
      // Debounce position-only changes
      if (prevW && onlyPositionChanged(prevW, w)) {
        scheduleDebouncedWidgetSync(w.id, next.id, userId)
      } else {
        // Cancel any pending debounced sync — this immediate write is authoritative
        const pending = pendingWidgetSyncs.get(w.id)
        if (pending) { clearTimeout(pending); pendingWidgetSyncs.delete(w.id) }
        touchId(w.id)
        upsertWidget(w, next.id, userId)
      }
    }
  }
}

function widgetChanged(a: any, b: any): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

function onlyPositionChanged(a: any, b: any): boolean {
  const { x: ax, y: ay, width: aw, height: ah, ...aRest } = a
  const { x: bx, y: by, width: bw, height: bh, ...bRest } = b
  return (ax !== bx || ay !== by || aw !== bw || ah !== bh) &&
    JSON.stringify(aRest) === JSON.stringify(bRest)
}

const pendingWidgetSyncs = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleDebouncedWidgetSync(widgetId: string, boardId: string, userId: string) {
  const existing = pendingWidgetSyncs.get(widgetId)
  if (existing) clearTimeout(existing)
  pendingWidgetSyncs.set(widgetId, setTimeout(() => {
    // Fetch latest state so stale closures never overwrite newer writes
    const state = useWhiteboardStore.getState()
    const widget = state.boards.find(b => b.id === boardId)?.widgets.find(w => w.id === widgetId)
    if (widget) {
      touchId(widget.id)
      upsertWidget(widget, boardId, userId)
    }
    pendingWidgetSyncs.delete(widgetId)
  }, 300))
}

function scheduleDebouncedSync(boards: Board[], userId: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    boards.forEach((board, i) => {
      // Only upsert boards that are either system boards or were created this session
      // Skip ghost boards that came from Realtime or stale state
      if (!board.boardType && !createdThisSession.has(board.id) && !prevKnownIds.has(board.id)) return
      touchId(board.id)
      upsertBoard(board, userId, i)
    })
  }, 300)
}
