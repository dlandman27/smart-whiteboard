import { useState, useEffect, useRef } from 'react'
import { useThemeStore } from '../store/theme'
import { useUIStore } from '../store/ui'
import { useWhiteboardStore } from '../store/whiteboard'
import { WhiteboardBackground } from './WhiteboardBackground'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'
import { CalendarBoardView } from './CalendarBoardView'
import { SettingsBoardView } from './SettingsBoardView'
import { ConnectorsBoardView } from './ConnectorsBoardView'
import { TodayBoardView } from './TodayBoardView'
import { TodoBoardView } from './TodoBoardView'
import { FeedbackBoardView } from './FeedbackBoardView'
import { AgentsBoardView } from './AgentsBoardView'
import { RoutinesBoardView } from './RoutinesBoardView'
import { GoalsBoardView } from './GoalsBoardView'
import { NotificationToast } from './NotificationToast'
import { UndoToast } from './UndoToast'
import { VoiceListener } from './VoiceListener'
import { Sidebar } from './Sidebar'
import { BoardContextMenu } from './BoardContextMenu'
import { LayoutPicker } from './LayoutPicker'
import { BoardSettingsPanel } from './BoardSettingsPanel'
import { useCanvasSocket } from '../hooks/useCanvasSocket'
import { useScheduleEngine } from '../hooks/useScheduleEngine'
import { widgetDragState } from '../lib/dragState'
import { useHashRouter } from '../hooks/useHashRouter'
import { Screensaver } from './Screensaver'
import { Icon } from '@whiteboard/ui-kit'
import type { PendingWidget } from '../types'

// System board labels + icons for the nav sheet
const SYSTEM_BOARDS = [
  { type: 'today',      label: 'Today',     icon: 'Sun'          },
  { type: 'calendar',   label: 'Calendar',  icon: 'CalendarBlank' },
  { type: 'routines',   label: 'Routines',  icon: 'Repeat'       },
  { type: 'goals',      label: 'Goals',     icon: 'Target'       },
  { type: 'todo',       label: 'Todo',      icon: 'CheckSquare'  },
  { type: 'connectors', label: 'Connectors',icon: 'Plugs'        },
  { type: 'settings',   label: 'Settings',  icon: 'Gear'         },
] as const

export function Whiteboard() {
  useCanvasSocket()
  useScheduleEngine()
  useHashRouter()
  const {
    focusedWidgetId, setFocusedWidget, setCanvasSize, canvasSize,
    displayMode, setDisplayMode, toggleDisplayMode,
    screensaverMode, sidebarMode, editMode, setEditMode,
  } = useUIStore()
  const sidebarHidden = sidebarMode === 'hidden'
  const { boards, activeBoardId, setActiveBoardManual } = useWhiteboardStore()
  const activeBoard       = boards.find(b => b.id === activeBoardId)
  const boardType         = (activeBoard as any)?.boardType as string | undefined
  const isCalendarBoard   = boardType === 'calendar'
  const isSettingsBoard   = boardType === 'settings'
  const isConnectorsBoard = boardType === 'connectors'
  const isTodayBoard      = boardType === 'today'
  const isTodoBoard       = boardType === 'todo'
  const isFeedbackBoard   = boardType === 'feedback'
  const isAgentsBoard     = boardType === 'agents'
  const isRoutinesBoard   = boardType === 'routines'
  const isGoalsBoard      = boardType === 'goals'
  const isSystemBoard     = isCalendarBoard || isSettingsBoard || isConnectorsBoard || isTodayBoard
    || isTodoBoard || isFeedbackBoard || isAgentsBoard || isRoutinesBoard || isGoalsBoard

  const [activeTool,      setActiveTool]      = useState('pointer')
  const [pendingWidget,   setPendingWidget]   = useState<PendingWidget | null>(null)
  const [boardMenu,       setBoardMenu]       = useState<{ x: number; y: number; widgetCtx?: { id: string; hasSettings: boolean } } | null>(null)
  const [pickerOpen,      setPickerOpen]      = useState(false)
  const [layoutPickerOpen,  setLayoutPickerOpen]  = useState(false)
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false)
  const [navOpen,           setNavOpen]           = useState(false)

  const { background: themeBackground } = useThemeStore()
  const boardBackground = activeBoard?.background ?? themeBackground
  const boardRef = useRef<HTMLDivElement>(null)

  // ── Swipe navigation ───────────────────────────────────────────────────────
  const userBoards  = boards.filter(b => !b.boardType)
  const boardIndex  = userBoards.findIndex(b => b.id === activeBoardId)

  const swipeStart    = useRef<{ x: number; y: number; locked: boolean } | null>(null)
  const [swipeDx,   setSwipeDx]   = useState(0)
  const [snapping,  setSnapping]  = useState(false)
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onBoardTouchStart(e: React.TouchEvent) {
    if (editMode || isSystemBoard) return
    if (widgetDragState.active) return
    const target = e.target as Element
    if (target.closest('[data-widget]')) return
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: false }
    setSnapping(false)
    editTimer.current = setTimeout(() => {
      setEditMode(true)
      navigator.vibrate?.(30)
      swipeStart.current = null
    }, 600)
  }

  function onBoardTouchMove(e: React.TouchEvent) {
    if (editTimer.current) { clearTimeout(editTimer.current); editTimer.current = null }
    if (widgetDragState.active) { swipeStart.current = null; return }
    if (!swipeStart.current) return
    const dx = e.touches[0].clientX - swipeStart.current.x
    const dy = e.touches[0].clientY - swipeStart.current.y
    if (!swipeStart.current.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) > Math.abs(dx) * 0.8) { swipeStart.current = null; return }
      swipeStart.current.locked = true
    }
    const atLeftEdge  = boardIndex <= 0
    const atRightEdge = boardIndex >= userBoards.length - 1
    const resist = (dx > 0 && atLeftEdge) || (dx < 0 && atRightEdge)
    setSwipeDx(resist ? dx * 0.25 : dx)
  }

  function onBoardTouchEnd(e: React.TouchEvent) {
    if (editTimer.current) { clearTimeout(editTimer.current); editTimer.current = null }
    if (!swipeStart.current) return
    const dx = e.changedTouches[0].clientX - swipeStart.current.x
    swipeStart.current = null
    if (Math.abs(dx) > 70) {
      const dir = dx < 0 ? 1 : -1
      const next = boardIndex + dir
      if (next >= 0 && next < userBoards.length) {
        setSwipeDx(0)
        setActiveBoardManual(userBoards[next].id)
        return
      }
    }
    setSnapping(true)
    setSwipeDx(0)
  }

  // ── Fullscreen / display mode ──────────────────────────────────────────────
  useEffect(() => {
    if (displayMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [displayMode])

  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement && displayMode) setDisplayMode(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [displayMode, setDisplayMode])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault(); toggleDisplayMode(); return
      }
      if (e.key === 'Escape') {
        if (editMode)        { setEditMode(false); return }
        if (displayMode)     { setDisplayMode(false); return }
        if (boardMenu)       { setBoardMenu(null); return }
        if (focusedWidgetId) { setFocusedWidget(null); return }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedWidgetId, boardMenu, displayMode, editMode, setDisplayMode, toggleDisplayMode])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCanvasSize(width, height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [setCanvasSize])

  // ── Nav sheet: find active system board id ─────────────────────────────────
  function navToSystemBoard(type: string) {
    const board = boards.find(b => b.boardType === type)
    if (board) setActiveBoardManual(board.id)
    setNavOpen(false)
  }

  return (
    <div className="relative flex w-screen" style={{ background: 'var(--wt-bg)', height: '100dvh' }}>
      {screensaverMode && <Screensaver />}
      <Sidebar />

      {/* Board area */}
      <div className="flex-1 min-w-0">
        <div
          ref={boardRef}
          className={`relative w-full h-full overflow-hidden ${sidebarHidden ? '' : 'rounded-r-2xl'}`}
          style={{
            transform:  swipeDx ? `translateX(${swipeDx}px)` : undefined,
            transition: snapping ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : undefined,
          }}
          onTouchStart={onBoardTouchStart}
          onTouchMove={onBoardTouchMove}
          onTouchEnd={onBoardTouchEnd}
        >
          <WhiteboardBackground background={boardBackground}>

            {isCalendarBoard ? (
              <CalendarBoardView />
            ) : isSettingsBoard ? (
              <SettingsBoardView />
            ) : isConnectorsBoard ? (
              <ConnectorsBoardView />
            ) : isTodayBoard ? (
              <TodayBoardView />
            ) : isTodoBoard ? (
              <TodoBoardView />
            ) : isFeedbackBoard ? (
              <FeedbackBoardView />
            ) : isAgentsBoard ? (
              <AgentsBoardView />
            ) : isRoutinesBoard ? (
              <RoutinesBoardView />
            ) : isGoalsBoard ? (
              <GoalsBoardView />
            ) : (
              <>
                <WidgetCanvas
                  activeTool={activeTool}
                  pendingWidget={pendingWidget}
                  onClearPending={() => setPendingWidget(null)}
                  onDoubleTap={(x, y) => { if (!editMode) setBoardMenu({ x, y }) }}
                  onWidgetDoubleTap={(widgetId, x, y, hasSettings) => {
                    if (!editMode) setBoardMenu({ x, y, widgetCtx: { id: widgetId, hasSettings } })
                  }}
                />

                {boardMenu && (
                  <BoardContextMenu
                    x={boardMenu.x}
                    y={boardMenu.y}
                    canvasW={canvasSize.w}
                    canvasH={canvasSize.h}
                    onClose={() => setBoardMenu(null)}
                    onAddWidget={() => { setBoardMenu(null); setPickerOpen(true) }}
                    onChangeLayout={() => { setBoardMenu(null); setLayoutPickerOpen(true) }}
                    onBoardSettings={() => { setBoardMenu(null); setBoardSettingsOpen(true) }}
                    widgetCtx={boardMenu.widgetCtx}
                  />
                )}

                {layoutPickerOpen && (
                  <LayoutPicker onClose={() => setLayoutPickerOpen(false)} />
                )}

                {boardSettingsOpen && (
                  <BoardSettingsPanel onClose={() => setBoardSettingsOpen(false)} />
                )}

                <BottomToolbar
                  onToolChange={setActiveTool}
                  onWidgetSelected={(w) => { setPendingWidget(w); setActiveTool('pointer') }}
                  externalPickerOpen={pickerOpen}
                  onExternalPickerClose={() => setPickerOpen(false)}
                />
              </>
            )}

            <NotificationToast />
            <UndoToast />
            <VoiceListener />

          </WhiteboardBackground>

          {/* ── Page dots (user boards only) ───────────────────────────────── */}
          {!isSystemBoard && userBoards.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 flex items-center gap-1.5 pointer-events-none"
              style={{ transform: 'translateX(-50%)' }}
            >
              {userBoards.map((b, i) => (
                <div
                  key={b.id}
                  style={{
                    width:      i === boardIndex ? 18 : 6,
                    height:     6,
                    borderRadius: 3,
                    background: i === boardIndex
                      ? 'var(--wt-text)'
                      : 'color-mix(in srgb, var(--wt-text) 25%, transparent)',
                    transition: 'all 0.25s ease',
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Edit mode "Done" button ────────────────────────────────────── */}
          {editMode && (
            <button
              onClick={() => setEditMode(false)}
              className="absolute top-4 right-4 z-50 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{
                background: 'var(--wt-accent)',
                color:      'var(--wt-accent-text, #fff)',
                border:     'none',
                cursor:     'pointer',
              }}
            >
              Done
            </button>
          )}


        </div>
      </div>

      {/* ── Floating nav button ────────────────────────────────────────────── */}
      {!editMode && (
        <button
          onClick={() => setNavOpen(v => !v)}
          className="absolute z-50 flex items-center justify-center rounded-2xl transition-opacity hover:opacity-80"
          style={{
            bottom:     24,
            right:      24,
            width:      44,
            height:     44,
            background: 'var(--wt-bg)',
            border:     '1px solid var(--wt-border)',
            color:      'var(--wt-text)',
            boxShadow:  'var(--wt-shadow-md)',
          }}
        >
          <Icon icon="SquaresFour" size={20} />
        </button>
      )}

      {/* ── Nav sheet ─────────────────────────────────────────────────────── */}
      {navOpen && (
        <>
          <div
            className="absolute inset-0 z-40"
            onClick={() => setNavOpen(false)}
          />
          <div
            className="absolute z-50 rounded-2xl p-2 flex flex-col gap-0.5"
            style={{
              bottom:     76,
              right:      24,
              minWidth:   180,
              background: 'var(--wt-bg)',
              border:     '1px solid var(--wt-border)',
              boxShadow:  'var(--wt-shadow-lg)',
            }}
          >
            {SYSTEM_BOARDS.map(({ type, label, icon }) => {
              const board   = boards.find(b => b.boardType === type)
              const isActive = activeBoardId === board?.id
              return (
                <button
                  key={type}
                  onClick={() => navToSystemBoard(type)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition-all hover:opacity-80"
                  style={{
                    background: isActive ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
                    color:      isActive ? 'var(--wt-accent)' : 'var(--wt-text)',
                    border:     'none',
                    cursor:     'pointer',
                  }}
                >
                  <Icon icon={icon} size={16} style={{ opacity: isActive ? 1 : 0.7 }} />
                  <span className="font-medium">{label}</span>
                </button>
              )
            })}

            <div style={{ height: 1, background: 'var(--wt-border)', margin: '4px 8px' }} />

            {/* User boards */}
            {userBoards.map((b, i) => {
              const isActive = activeBoardId === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => { setActiveBoardManual(b.id); setNavOpen(false) }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition-all hover:opacity-80"
                  style={{
                    background: isActive ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
                    color:      isActive ? 'var(--wt-accent)' : 'var(--wt-text)',
                    border:     'none',
                    cursor:     'pointer',
                  }}
                >
                  <span
                    className="flex items-center justify-center rounded-md text-xs font-bold flex-shrink-0"
                    style={{ width: 20, height: 20, background: isActive ? 'var(--wt-accent)' : 'color-mix(in srgb, var(--wt-text) 15%, transparent)', color: isActive ? '#fff' : 'var(--wt-text)' }}
                  >
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium truncate">{b.name}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
