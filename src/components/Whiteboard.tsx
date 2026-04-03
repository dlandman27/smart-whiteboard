import { useState, useEffect } from 'react'
import { useThemeStore } from '../store/theme'
import { useUIStore } from '../store/ui'
import { WhiteboardBackground } from './WhiteboardBackground'
import { WalliChatButton } from './WalliChat'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'
import { NotificationToast } from './NotificationToast'
import { UndoToast } from './UndoToast'
import { VoiceListener } from './VoiceListener'
import { useCanvasSocket } from '../hooks/useCanvasSocket'
import type { PendingWidget } from '../types'

export function Whiteboard() {
  useCanvasSocket()
  const { focusedWidgetId, setFocusedWidget } = useUIStore()
  const [slideDir,      setSlideDir]      = useState<'left' | 'right'>('right')
  const [activeTool,    setActiveTool]    = useState('pointer')
  const [pendingWidget, setPendingWidget] = useState<PendingWidget | null>(null)
  const { background } = useThemeStore()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && focusedWidgetId) setFocusedWidget(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedWidgetId])

  return (
    <WhiteboardBackground background={background}>

      <WidgetCanvas
        slideDir={slideDir}
        activeTool={activeTool}
        pendingWidget={pendingWidget}
        onClearPending={() => setPendingWidget(null)}
      />

      <div className="absolute bottom-4 left-4 z-[9990] select-none">
        <WalliChatButton />
      </div>


      <NotificationToast />
      <UndoToast />
      <VoiceListener />

      <BottomToolbar
        onToolChange={setActiveTool}
        onWidgetSelected={(w) => { setPendingWidget(w); setActiveTool('pointer') }}
        onSlide={setSlideDir}
      />

    </WhiteboardBackground>
  )
}
