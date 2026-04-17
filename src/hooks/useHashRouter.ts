import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'

/**
 * Two-way sync between the URL hash and the active board.
 *
 * System boards get friendly slugs:  #/calendar  #/settings  #/todo  etc.
 * User boards use their UUID:        #/board/<id>
 * Sub-paths are supported:           #/connectors/tasks  #/connectors/calendar
 *
 * - On board change → update hash (replaceState, no history noise)
 * - On popstate (back/forward) → navigate to the board in the hash
 * - On init, if a hash is present → navigate to that board after store hydration
 */

const BOARD_TYPE_SLUGS: Record<string, string> = {
  calendar:   'calendar',
  settings:   'settings',
  connectors: 'connectors',
  today:      'today',
  todo:       'todo',
  feedback:   'feedback',
}

const SLUG_TO_TYPE = Object.fromEntries(
  Object.entries(BOARD_TYPE_SLUGS).map(([type, slug]) => [slug, type])
)

// ── Hash fragment (sub-path) store ──────────────────────────────────────────
// Stores the sub-path portion of the hash, e.g. "tasks" from #/connectors/tasks.
// Consumed by board views to set initial state (e.g. category filter).

let _hashFragment: string | null = null
const _listeners = new Set<() => void>()

function setHashFragment(fragment: string | null) {
  if (_hashFragment === fragment) return
  _hashFragment = fragment
  _listeners.forEach((l) => l())
}

/** Read the current hash sub-path (e.g. "tasks" from #/connectors/tasks). Consumed once on read. */
export function useHashFragment(): string | null {
  const fragment = useSyncExternalStore(
    (cb) => { _listeners.add(cb); return () => _listeners.delete(cb) },
    () => _hashFragment,
  )
  // Consume on first read so it doesn't re-trigger on subsequent renders
  useEffect(() => {
    if (fragment != null) setHashFragment(null)
  }, [fragment])
  return fragment
}

// ── Hash parsing ────────────────────────────────────────────────────────────

function boardIdToHash(boards: { id: string; boardType?: string }[], id: string): string {
  const board = boards.find((b) => b.id === id)
  if (!board) return ''
  if (board.boardType && BOARD_TYPE_SLUGS[board.boardType]) {
    return `#/${BOARD_TYPE_SLUGS[board.boardType]}`
  }
  return `#/board/${id}`
}

interface ParsedHash {
  boardId: string | null
  fragment: string | null
}

function parseHash(boards: { id: string; boardType?: string }[]): ParsedHash {
  const hash = window.location.hash
  if (!hash || hash === '#' || hash === '#/') return { boardId: null, fragment: null }

  // #/connectors/tasks, #/settings/theme, etc. — slug with sub-path
  const subMatch = hash.match(/^#\/(\w+)\/(.+)$/)
  if (subMatch) {
    const boardType = SLUG_TO_TYPE[subMatch[1]]
    if (boardType) {
      const board = boards.find((b) => b.boardType === boardType)
      return { boardId: board?.id ?? null, fragment: subMatch[2] }
    }
  }

  // #/calendar, #/settings, etc. — plain slug
  const slugMatch = hash.match(/^#\/(\w+)$/)
  if (slugMatch) {
    const boardType = SLUG_TO_TYPE[slugMatch[1]]
    if (boardType) {
      const board = boards.find((b) => b.boardType === boardType)
      return { boardId: board?.id ?? null, fragment: null }
    }
  }

  // #/board/<uuid>
  const boardMatch = hash.match(/^#\/board\/(.+)$/)
  if (boardMatch) {
    const id = boardMatch[1]
    const board = boards.find((b) => b.id === id)
    return { boardId: board?.id ?? null, fragment: null }
  }

  return { boardId: null, fragment: null }
}

/** Navigate to a board with an optional sub-path fragment. */
export function navigateHash(slug: string, fragment?: string) {
  const hash = fragment ? `#/${slug}/${fragment}` : `#/${slug}`
  history.pushState(null, '', hash)
  // Trigger popstate so the router picks it up
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useHashRouter() {
  const suppressRef = useRef(false)

  useEffect(() => {
    // Sync hash → store on popstate (browser back/forward)
    function onPopState() {
      const { boards, setActiveBoardManual, activeBoardId } = useWhiteboardStore.getState()
      const { boardId, fragment } = parseHash(boards)
      if (boardId && boardId !== activeBoardId) {
        suppressRef.current = true
        setHashFragment(fragment)
        setActiveBoardManual(boardId)
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    // Sync store → hash whenever activeBoardId changes
    const unsub = useWhiteboardStore.subscribe(
      (state, prev) => {
        if (state.activeBoardId === prev.activeBoardId) return
        if (suppressRef.current) {
          suppressRef.current = false
          return
        }
        // Don't overwrite the URL hash during init — let applyHash() restore it
        if (prev.isLoading && !state.isLoading) return
        const hash = boardIdToHash(state.boards, state.activeBoardId)
        if (hash && window.location.hash !== hash) {
          history.pushState(null, '', hash)
        }
      }
    )
    return unsub
  }, [])

  useEffect(() => {
    // After hydration, if a hash is present navigate to that board;
    // otherwise set the hash from the current board.
    function applyHash() {
      const { boards, activeBoardId, setActiveBoardManual } = useWhiteboardStore.getState()
      const { boardId, fragment } = parseHash(boards)
      if (boardId && boardId !== activeBoardId) {
        suppressRef.current = true
        setHashFragment(fragment)
        setActiveBoardManual(boardId)
      } else if (boards.length > 0) {
        const hash = boardIdToHash(boards, activeBoardId)
        if (hash && window.location.hash !== hash) {
          history.replaceState(null, '', hash)
        }
      }
    }

    // Apply immediately (works if store is already hydrated)
    applyHash()

    // Also apply when isLoading transitions false→true→false (init completes)
    const unsub = useWhiteboardStore.subscribe(
      (state, prev) => {
        if (prev.isLoading && !state.isLoading) applyHash()
      }
    )
    return unsub
  }, [])
}
