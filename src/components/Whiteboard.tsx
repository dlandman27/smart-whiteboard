import { useState } from 'react'
import { DEFAULT_BACKGROUND, type Background } from '../constants/backgrounds'
import { WhiteboardBackground } from './WhiteboardBackground'
import { LogoSettings } from './LogoSettings'
import { BoardNav } from './BoardNav'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'

export function Whiteboard() {
  const [slideDir,     setSlideDir]     = useState<'left' | 'right'>('right')
  const [background,   setBackground]   = useState<Background>(DEFAULT_BACKGROUND)
  const [activeTool,   setActiveTool]   = useState('pointer')
  const [showSettings, setShowSettings] = useState(false)

  return (
    <WhiteboardBackground bg={background.bg} dot={background.dot}>

      <WidgetCanvas slideDir={slideDir} activeTool={activeTool} />

      <LogoSettings
        background={background}
        onBackgroundChange={setBackground}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        onCloseSettings={() => setShowSettings(false)}
      />

      <BoardNav onSlide={setSlideDir} />

      <BottomToolbar
        onToolChange={setActiveTool}
        onOpenSettings={() => setShowSettings(true)}
      />

    </WhiteboardBackground>
  )
}
