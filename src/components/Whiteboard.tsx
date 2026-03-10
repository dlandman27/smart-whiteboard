import { useState } from 'react'
import { DEFAULT_BACKGROUND, type Background } from '../constants/backgrounds'
import { WhiteboardBackground } from './WhiteboardBackground'
import { LogoSettings } from './LogoSettings'
import { BoardNav } from './BoardNav'
import { BottomToolbar } from './BottomToolbar'
import { WidgetCanvas } from './WidgetCanvas'

export function Whiteboard() {
  const [slideDir, setSlideDir]     = useState<'left' | 'right'>('right')
  const [background, setBackground] = useState<Background>(DEFAULT_BACKGROUND)
  const [activeTool, setActiveTool] = useState('pointer')

  return (
    <WhiteboardBackground bg={background.bg} dot={background.dot}>

      {/* Widget canvas */}
      <WidgetCanvas slideDir={slideDir} activeTool={activeTool} />

      {/* ── Top left: logo + settings ──────────────────────────────── */}
      <LogoSettings background={background} onBackgroundChange={setBackground} />

      {/* ── Top right: board navigation ────────────────────────────── */}
      <BoardNav onSlide={setSlideDir} />

      {/* ── Bottom: tools + drawing canvas + widget picker ─────────── */}
      <BottomToolbar onToolChange={setActiveTool} />

    </WhiteboardBackground>
  )
}
