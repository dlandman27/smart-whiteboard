import { useState } from 'react'
import { useThemeStore } from '../store/theme'
import { WhiteboardBackground } from './WhiteboardBackground'
import { LogoSettings } from './LogoSettings'
import { BoardNav } from './BoardNav'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'

export function Whiteboard() {
  const [slideDir,     setSlideDir]     = useState<'left' | 'right'>('right')
  const [activeTool,   setActiveTool]   = useState('pointer')
  const [showSettings, setShowSettings] = useState(false)
  const { background } = useThemeStore()

  return (
    <WhiteboardBackground bg={background.bg} dot={background.dot}>

      <WidgetCanvas slideDir={slideDir} activeTool={activeTool} />

      <LogoSettings
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
      />

      <BoardNav onSlide={setSlideDir} />

      <BottomToolbar
        onToolChange={setActiveTool}
        onOpenSettings={() => setShowSettings(true)}
        onCloseSettings={() => setShowSettings(false)}
      />

    </WhiteboardBackground>
  )
}
