import { useState } from 'react'
import { Panel, PanelHeader, Slider, Text } from '../ui/web'
import { ThemePicker } from './ThemePicker'
import { BackgroundPicker } from './BackgroundPicker'
import { LAYOUT_PRESETS, getLayoutPreset } from '../layouts/presets'
import { useWhiteboardStore } from '../store/whiteboard'
import { useLayout, computeSlotRect, TOOLBAR_RESERVED } from '../hooks/useLayout'
import { LayoutThumbnail } from './layout/LayoutThumbnail'
import { useThemeStore } from '../store/theme'
import { SPRITES, PX, PixelSprite } from './PetBar'

interface Props {
  onClose: () => void
}

function LayoutSection() {
  const boards           = useWhiteboardStore((s) => s.boards)
  const activeBoardId    = useWhiteboardStore((s) => s.activeBoardId)
  const setLayout        = useWhiteboardStore((s) => s.setLayout)
  const setLayoutSpacing = useWhiteboardStore((s) => s.setLayoutSpacing)
  const activeBoard      = boards.find((b) => b.id === activeBoardId)
  const currentLayout    = activeBoard?.layoutId ?? 'dashboard'
  const widgets          = activeBoard?.widgets ?? []
  const { slotGap, slotPad, slotMap } = useLayout()

  function handleSelectLayout(newLayoutId: string) {
    if (newLayoutId === currentLayout) return
    const newLayoutDef  = getLayoutPreset(newLayoutId)
    const canvasW       = window.innerWidth
    const canvasH       = window.innerHeight - TOOLBAR_RESERVED
    const newSlotRects  = newLayoutDef.slots.map((s) => computeSlotRect(s, canvasW, canvasH, slotGap, slotPad))
    const curLayoutDef  = getLayoutPreset(currentLayout)
    const curSlotOrder  = Object.fromEntries(curLayoutDef.slots.map((s, i) => [s.id, i]))
    const sorted        = [...widgets].sort((a, b) => {
      const ai = a.slotId !== undefined ? (curSlotOrder[a.slotId] ?? 999) : 999
      const bi = b.slotId !== undefined ? (curSlotOrder[b.slotId] ?? 999) : 999
      return ai !== bi ? ai - bi : (a.x ?? 0) - (b.x ?? 0)
    })
    const widgetUpdates = sorted.map((widget, i) => {
      const newSlot = newSlotRects[i]
      if (newSlot) return { id: widget.id, slotId: newSlot.id, x: newSlot.x, y: newSlot.y, width: newSlot.width, height: newSlot.height }
      const curRect = widget.slotId ? slotMap[widget.slotId] : null
      return { id: widget.id, slotId: null as null, x: curRect?.x ?? widget.x, y: curRect?.y ?? widget.y, width: curRect?.width ?? widget.width, height: curRect?.height ?? widget.height }
    })
    setLayout(activeBoardId, newLayoutId, widgetUpdates)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {LAYOUT_PRESETS.filter((l) => l.id !== 'custom').map((layout) => {
          const isActive = layout.id === currentLayout
          return (
            <button
              key={layout.id}
              onClick={() => handleSelectLayout(layout.id)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
              style={{
                backgroundColor: isActive ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'var(--wt-surface)',
                border: `1.5px solid ${isActive ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
              }}
            >
              <LayoutThumbnail layout={layout} active={isActive} width={70} height={44} />
              <Text variant="label" size="small" style={{ color: isActive ? 'var(--wt-accent)' : undefined }}>
                {layout.name}
              </Text>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-2.5 pt-1">
        <Slider label="Widget gap"    value={slotGap} min={0} max={48} onChange={(v) => setLayoutSpacing(activeBoardId, v, slotPad)} />
        <Slider label="Edge padding"  value={slotPad} min={0} max={64} onChange={(v) => setLayoutSpacing(activeBoardId, slotGap, v)} />
      </div>
    </div>
  )
}

type Tab = 'theme' | 'background' | 'layout' | 'misc'

const TABS: { id: Tab; label: string }[] = [
  { id: 'theme',      label: 'Theme'      },
  { id: 'background', label: 'Background' },
  { id: 'layout',     label: 'Layout'     },
  { id: 'misc',       label: 'Pets'       },
]

const SPRITE_NAMES: Record<string, string> = {
  cat: 'Cat', dog: 'Dog', robot: 'Robot', bunny: 'Bunny',
  ghost: 'Ghost', owl: 'Owl', bear: 'Bear', frog: 'Frog',
  penguin: 'Penguin', alien: 'Alien', dragon: 'Dragon', fox: 'Fox',
  wizard: 'Wizard', ninja: 'Ninja', dino: 'Dino', astronaut: 'Astro',
}

function MiscSection() {
  const { petsEnabled, setPetsEnabled } = useThemeStore()

  return (
    <div className="flex flex-col gap-5">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--wt-text)' }}>Agent Pets</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--wt-text-muted)' }}>
            Pixel art pets that walk along the bottom of the board
          </p>
        </div>
        <button
          onClick={() => setPetsEnabled(!petsEnabled)}
          className="relative flex-shrink-0 transition-colors rounded-full"
          style={{
            width: 42, height: 24,
            backgroundColor: petsEnabled ? 'var(--wt-accent)' : 'var(--wt-border)',
            border: 'none', cursor: 'pointer', padding: 3,
          }}
        >
          <span
            className="block rounded-full bg-white transition-transform"
            style={{
              width: 18, height: 18,
              transform: petsEnabled ? 'translateX(18px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      {/* Sprite gallery */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--wt-text-muted)' }}>
          Available Sprites
        </p>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(SPRITES).map(([key, sprite]) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}
            >
              <PixelSprite sprite={sprite} frameIdx={0} flip={false} />
              <span className="text-[11px]" style={{ color: 'var(--wt-text-muted)' }}>
                {SPRITE_NAMES[key] ?? key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SettingsPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('theme')

  return (
    <Panel width={460} onClose={onClose}>
      <PanelHeader title="Customize" onClose={onClose} />

      {/* Tab bar */}
      <div
        className="flex items-center gap-0 px-3"
        style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-xs font-semibold transition-colors"
            style={{
              color:        tab === t.id ? 'var(--wt-text)' : 'var(--wt-text-muted)',
              borderTop:    'none',
              borderLeft:   'none',
              borderRight:  'none',
              borderBottom: tab === t.id ? '2px solid var(--wt-accent)' : '2px solid transparent',
              marginBottom: -1,
              background:   'none',
              cursor:       'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-4 overflow-y-auto settings-scroll" style={{ height: 480 }}>
        {tab === 'theme'      && <ThemePicker />}
        {tab === 'background' && <BackgroundPicker />}
        {tab === 'layout'     && <LayoutSection />}
        {tab === 'misc'       && <MiscSection />}
      </div>
    </Panel>
  )
}
