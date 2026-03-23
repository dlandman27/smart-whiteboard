import { useState } from 'react'
import { useThemeStore } from '../store/theme'
import { WhiteboardBackground } from './WhiteboardBackground'
import { LogoSettings } from './LogoSettings'
import { Logo } from './Logo'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'
import type { PendingWidget } from '../types'

export function Whiteboard() {
  const [slideDir,      setSlideDir]      = useState<'left' | 'right'>('right')
  const [activeTool,    setActiveTool]    = useState('pointer')
  const [showSettings,  setShowSettings]  = useState(false)
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

      <LogoSettings
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
      />

      <BottomToolbar
        onToolChange={setActiveTool}
        settingsOpen={showSettings}
        onOpenSettings={() => setShowSettings(true)}
        onCloseSettings={() => setShowSettings(false)}
        onWidgetSelected={(w) => { setPendingWidget(w); setActiveTool('pointer') }}
        onSlide={setSlideDir}
      />

    </WhiteboardBackground>
  )
}
