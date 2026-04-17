import { useState, useEffect, useRef, useCallback } from 'react'
import { useThemeStore } from '../store/theme'
import { useUIStore } from '../store/ui'
import { useWhiteboardStore } from '../store/whiteboard'
import { WhiteboardBackground } from './WhiteboardBackground'
import { WalliChatButton } from './WalliChat'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'
import { CalendarBoardView } from './CalendarBoardView'
import { SettingsBoardView } from './SettingsBoardView'
import { ConnectorsBoardView } from './ConnectorsBoardView'
import { TodayBoardView } from './TodayBoardView'
import { TodoBoardView } from './TodoBoardView'
import { FeedbackBoardView } from './FeedbackBoardView'
import { AgentsBoardView } from './AgentsBoardView'
import { NotificationToast } from './NotificationToast'
import { UndoToast } from './UndoToast'
import { VoiceListener } from './VoiceListener'
import { PetBar } from './PetBar'
import { Sidebar } from './Sidebar'
import { BoardContextMenu } from './BoardContextMenu'
import { LayoutPicker } from './LayoutPicker'
import { BoardSettingsPanel } from './BoardSettingsPanel'
import { useCanvasSocket } from '../hooks/useCanvasSocket'
import { useScheduleEngine } from '../hooks/useScheduleEngine'
import { useHashRouter } from '../hooks/useHashRouter'
import { Screensaver } from './Screensaver'
import type { PendingWidget } from '../types'

export function Whiteboard() {
  useCanvasSocket()
  useScheduleEngine()
  useHashRouter()
  const { focusedWidgetId, setFocusedWidget, setCanvasSize, canvasSize, displayMode, setDisplayMode, toggleDisplayMode, screensaverMode } = useUIStore()
  const { boards, activeBoardId } = useWhiteboardStore()
  const activeBoard        = boards.find(b => b.id === activeBoardId)
  const boardType          = (activeBoard as any)?.boardType as string | undefined
  const isCalendarBoard    = boardType === 'calendar'
  const isSettingsBoard    = boardType === 'settings'
  const isConnectorsBoard  = boardType === 'connectors'
  const isTodayBoard       = boardType === 'today'
  const isTodoBoard        = boardType === 'todo'
  const isFeedbackBoard    = boardType === 'feedback'
  const isAgentsBoard      = boardType === 'agents'
  const isSystemBoard      = isCalendarBoard || isSettingsBoard || isConnectorsBoard || isTodayBoard || isTodoBoard || isFeedbackBoard || isAgentsBoard
  const [activeTool,        setActiveTool]        = useState('pointer')
  const [pendingWidget,     setPendingWidget]     = useState<PendingWidget | null>(null)
  const [boardMenu,         setBoardMenu]         = useState<{ x: number; y: number; widgetCtx?: { id: string; hasSettings: boolean } } | null>(null)
  const [pickerOpen,        setPickerOpen]        = useState(false)
  const [layoutPickerOpen,    setLayoutPickerOpen]    = useState(false)
  const [boardSettingsOpen,   setBoardSettingsOpen]   = useState(false)
  const { background: themeBackground, petsEnabled } = useThemeStore()
  const boardBackground = activeBoard?.background ?? themeBackground
  const boardRef = useRef<HTMLDivElement>(null)

  // Enter fullscreen when display mode turns on, exit when it turns off
  useEffect(() => {
    if (displayMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [displayMode])

  // Exit display mode on browser fullscreen exit (e.g. user pressed Esc in browser)
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement && displayMode) setDisplayMode(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [displayMode, setDisplayMode])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/Cmd + Shift + D → toggle display mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        toggleDisplayMode()
        return
      }
      if (e.key === 'Escape') {
        if (displayMode)     { setDisplayMode(false); return }
        if (boardMenu)       { setBoardMenu(null); return }
        if (focusedWidgetId) { setFocusedWidget(null); return }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedWidgetId, boardMenu, displayMode, setDisplayMode, toggleDisplayMode])

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

  return (
    <div className="flex w-screen h-screen" style={{ background: displayMode ? '#000' : 'var(--wt-bg)' }}>
      {screensaverMode && <Screensaver />}
      {!displayMode && <Sidebar />}

      {/* Inset board */}
      <div className={displayMode ? 'flex-1 min-w-0' : 'flex-1 p-2 min-w-0'}>
        <div
          ref={boardRef}
          className={`relative w-full h-full overflow-hidden ${displayMode ? '' : 'rounded-2xl'}`}
          style={displayMode ? {} : { border: '1px solid var(--wt-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }}
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
            ) : (
              <>
                <WidgetCanvas
                  activeTool={activeTool}
                  pendingWidget={pendingWidget}
                  onClearPending={() => setPendingWidget(null)}
                  onDoubleTap={(x, y) => { setBoardMenu({ x, y }) }}
                  onWidgetDoubleTap={(widgetId, x, y, hasSettings) => {
                    setBoardMenu({ x, y, widgetCtx: { id: widgetId, hasSettings } })
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


                {!displayMode && (
                  <BottomToolbar
                    onToolChange={setActiveTool}
                    onWidgetSelected={(w) => { setPendingWidget(w); setActiveTool('pointer') }}
                    externalPickerOpen={pickerOpen}
                    onExternalPickerClose={() => setPickerOpen(false)}
                  />
                )}
              </>
            )}

            {!isSystemBoard && !displayMode && (
              <div className="absolute bottom-4 left-4 z-[9990] select-none">
                <WalliChatButton />
              </div>
            )}

            {!isSystemBoard && !displayMode && petsEnabled && <PetBar />}

            {/* Display mode exit overlay */}
            {displayMode && <DisplayModeOverlay onExit={() => setDisplayMode(false)} />}
            <NotificationToast />
            <UndoToast />
            <VoiceListener />

          </WhiteboardBackground>
        </div>
      </div>
    </div>
  )
}

// ── Display mode exit overlay ────────────────────────────────────────────────

function DisplayModeOverlay({ onExit }: { onExit: () => void }) {
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { boards, activeBoardId, setActiveBoardManual } = useWhiteboardStore()
  const userBoards = boards.filter((b) => !b.boardType)

  const showBar = useCallback(() => {
    setVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), 3000)
  }, [])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (e.clientY < 60) showBar()
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [showBar])

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[9999] flex items-center px-4 gap-3"
      style={{
        height: 44,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onMouseEnter={showBar}
    >
      <span className="text-xs font-medium flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Display Mode
      </span>

      {/* Board tabs */}
      {userBoards.length > 1 && (
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto px-2" style={{ scrollbarWidth: 'none' }}>
          {userBoards.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBoardManual(b.id)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0"
              style={{
                background: b.id === activeBoardId ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: b.id === activeBoardId ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
                border: b.id === activeBoardId ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onExit}
        className="px-3 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0 ml-auto"
        style={{
          background: 'rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
      >
        Exit (Esc)
      </button>
    </div>
  )
}
