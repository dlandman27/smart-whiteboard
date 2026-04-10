import { useWhiteboardStore, type Board } from '../store/whiteboard'
import { upsertBoard, deleteBoard, upsertWidget, deleteWidget } from './db'
import { touchId } from './realtimeSync'

let unsub: (() => void) | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Subscribe to whiteboard store changes and sync to Supabase.
 * Board add/remove/rename: immediate. Widget position: debounced 300ms.
 */
export function startBoardSync(userId: string) {
  stopBoardSync()

  let prevBoards = useWhiteboardStore.getState().boards

  unsub = useWhiteboardStore.subscribe((state) => {
    const nextBoards = state.boards

    // Detect added/removed boards
    const prevIds = new Set(prevBoards.map(b => b.id))
    const nextIds = new Set(nextBoards.map(b => b.id))

    // Deleted boards
    for (const b of prevBoards) {
      if (!nextIds.has(b.id)) {
        touchId(b.id)
        deleteBoard(b.id)
      }
    }

    // Added or changed boards — debounce position updates, immediate for structural changes
    for (let i = 0; i < nextBoards.length; i++) {
      const board = nextBoards[i]
      const prev = prevBoards.find(b => b.id === board.id)

      if (!prev) {
        // New board — immediate upsert
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
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
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
        scheduleDebouncedWidgetSync(w, next.id, userId)
      } else {
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

function scheduleDebouncedWidgetSync(widget: any, boardId: string, userId: string) {
  touchId(widget.id)
  const existing = pendingWidgetSyncs.get(widget.id)
  if (existing) clearTimeout(existing)
  pendingWidgetSyncs.set(widget.id, setTimeout(() => {
    touchId(widget.id)
    upsertWidget(widget, boardId, userId)
    pendingWidgetSyncs.delete(widget.id)
  }, 300))
}

function scheduleDebouncedSync(boards: Board[], userId: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    boards.forEach((board, i) => {
      touchId(board.id)
      upsertBoard(board, userId, i)
    })
  }, 300)
}
