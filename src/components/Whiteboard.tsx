import { useState } from 'react'
import { useThemeStore } from '../store/theme'
import { WhiteboardBackground } from './WhiteboardBackground'
import { Logo } from './Logo'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'
import { NotificationToast } from './NotificationToast'
import { useCanvasSocket } from '../hooks/useCanvasSocket'
import type { PendingWidget } from '../types'

export function Whiteboard() {
  useCanvasSocket()
  const [slideDir,      setSlideDir]      = useState<'left' | 'right'>('right')
  const [activeTool,    setActiveTool]    = useState('pointer')
  const [pendingWidget, setPendingWidget] = useState<PendingWidget | null>(null)
  const { background } = useThemeStore()

  return (
    <WhiteboardBackground bg={background.bg} dot={background.dot}>

      <WidgetCanvas
        slideDir={slideDir}
        activeTool={activeTool}
        pendingWidget={pendingWidget}
        onClearPending={() => setPendingWidget(null)}
      />

      <div className="absolute bottom-4 left-4 z-10 pointer-events-none select-none">
        <Logo size={24} />
      </div>

      <NotificationToast />

      <BottomToolbar
        onToolChange={setActiveTool}
        onWidgetSelected={(w) => { setPendingWidget(w); setActiveTool('pointer') }}
        onSlide={setSlideDir}
      />

    </WhiteboardBackground>
  )
}
