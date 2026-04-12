import { useEffect, useRef } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'

/**
 * Two-way sync between the URL hash and the active board.
 *
 * System boards get friendly slugs:  #/calendar  #/settings  #/todo  etc.
 * User boards use their UUID:        #/board/<id>
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

function boardIdToHash(boards: { id: string; boardType?: string }[], id: string): string {
  const board = boards.find((b) => b.id === id)
  if (!board) return ''
  if (board.boardType && BOARD_TYPE_SLUGS[board.boardType]) {
    return `#/${BOARD_TYPE_SLUGS[board.boardType]}`
  }
  return `#/board/${id}`
}

function hashToBoardId(boards: { id: string; boardType?: string }[]): string | null {
  const hash = window.location.hash
  if (!hash || hash === '#' || hash === '#/') return null

  // #/calendar, #/settings, etc.
  const slugMatch = hash.match(/^#\/(\w+)$/)
  if (slugMatch) {
    const boardType = SLUG_TO_TYPE[slugMatch[1]]
    if (boardType) {
      const board = boards.find((b) => b.boardType === boardType)
      return board?.id ?? null
    }
  }

  // #/board/<uuid>
  const boardMatch = hash.match(/^#\/board\/(.+)$/)
  if (boardMatch) {
    const id = boardMatch[1]
    const board = boards.find((b) => b.id === id)
    return board?.id ?? null
  }

  return null
}

export function useHashRouter() {
  const suppressRef = useRef(false)

  useEffect(() => {
    // Sync hash → store on popstate (browser back/forward)
    function onPopState() {
      const { boards, setActiveBoardManual, activeBoardId } = useWhiteboardStore.getState()
      const targetId = hashToBoardId(boards)
      if (targetId && targetId !== activeBoardId) {
        suppressRef.current = true
        setActiveBoardManual(targetId)
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
      const targetId = hashToBoardId(boards)
      if (targetId && targetId !== activeBoardId) {
        suppressRef.current = true
        setActiveBoardManual(targetId)
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
