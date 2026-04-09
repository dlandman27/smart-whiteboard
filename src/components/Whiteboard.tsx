import { useState, useEffect, useRef } from 'react'
import { useThemeStore } from '../store/theme'
import { useUIStore } from '../store/ui'
import { useWhiteboardStore } from '../store/whiteboard'
import { WhiteboardBackground } from './WhiteboardBackground'
import { WalliChatButton } from './WalliChat'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'
import { CalendarBoardView } from './CalendarBoardView'
import { NotificationToast } from './NotificationToast'
import { UndoToast } from './UndoToast'
import { VoiceListener } from './VoiceListener'
import { PetBar } from './PetBar'
import { Sidebar } from './Sidebar'
import { SettingsPanel } from './SettingsPanel'
import { ConfigPanel } from './ConfigPanel'
import { BoardContextMenu } from './BoardContextMenu'
import { useCanvasSocket } from '../hooks/useCanvasSocket'
import type { PendingWidget } from '../types'

type SidePanel = 'customize' | 'settings' | 'layout' | null

export function Whiteboard() {
  useCanvasSocket()
  const { focusedWidgetId, setFocusedWidget, setCanvasSize, canvasSize } = useUIStore()
  const { boards, activeBoardId } = useWhiteboardStore()
  const activeBoard   = boards.find(b => b.id === activeBoardId)
  const isCalendarBoard = (activeBoard as any)?.boardType === 'calendar'
  const [activeTool,    setActiveTool]    = useState('pointer')
  const [pendingWidget, setPendingWidget] = useState<PendingWidget | null>(null)
  const [sidePanel,     setSidePanel]     = useState<SidePanel>(null)
  const [boardMenu,     setBoardMenu]     = useState<{ x: number; y: number; widgetCtx?: { id: string; hasSettings: boolean } } | null>(null)
  const [pickerOpen,    setPickerOpen]    = useState(false)
  const { background, petsEnabled } = useThemeStore()
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (boardMenu)       { setBoardMenu(null); return }
        if (focusedWidgetId) { setFocusedWidget(null); return }
        if (sidePanel)       { setSidePanel(null) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedWidgetId, sidePanel, boardMenu])

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
    <div className="flex w-screen h-screen" style={{ background: 'var(--wt-bg)' }}>
      {sidePanel === 'customize' && <SettingsPanel onClose={() => setSidePanel(null)} />}
      {sidePanel === 'settings'  && <ConfigPanel   onClose={() => setSidePanel(null)} />}
      {sidePanel === 'layout'    && <SettingsPanel onClose={() => setSidePanel(null)} defaultTab="layout" />}

      <Sidebar
        onOpenCustomize={() => setSidePanel((p) => p === 'customize' ? null : 'customize')}
        onOpenSettings={() => setSidePanel((p) => p === 'settings'  ? null : 'settings')}
      />

      {/* Inset board */}
      <div className="flex-1 p-2 min-w-0">
        <div
          ref={boardRef}
          className="relative w-full h-full rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--wt-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }}
        >
          <WhiteboardBackground background={background}>

            {isCalendarBoard ? (
              <CalendarBoardView />
            ) : (
              <>
                <WidgetCanvas
                  activeTool={activeTool}
                  pendingWidget={pendingWidget}
                  onClearPending={() => setPendingWidget(null)}
                  onDoubleTap={(x, y) => { setSidePanel(null); setBoardMenu({ x, y }) }}
                  onWidgetDoubleTap={(widgetId, x, y, hasSettings) => {
                    setSidePanel(null)
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
                    onChangeLayout={() => { setBoardMenu(null); setSidePanel('layout') }}
                    widgetCtx={boardMenu.widgetCtx}
                  />
                )}

                <BottomToolbar
                  onToolChange={setActiveTool}
                  onWidgetSelected={(w) => { setPendingWidget(w); setActiveTool('pointer') }}
                  externalPickerOpen={pickerOpen}
                  onExternalPickerClose={() => setPickerOpen(false)}
                />
              </>
            )}

            <div className="absolute bottom-4 left-4 z-[9990] select-none">
              <WalliChatButton />
            </div>

            {petsEnabled && <PetBar />}
            <NotificationToast />
            <UndoToast />
            <VoiceListener />

          </WhiteboardBackground>
        </div>
      </div>
    </div>
  )
}
