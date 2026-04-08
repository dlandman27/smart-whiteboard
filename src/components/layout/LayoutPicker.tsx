import { useEffect } from 'react'
import { LAYOUT_PRESETS, getLayoutPreset } from '../../layouts/presets'
import { useWhiteboardStore } from '../../store/whiteboard'
import { useLayout, computeSlotRect, TOOLBAR_RESERVED } from '../../hooks/useLayout'
import { LayoutThumbnail } from './LayoutThumbnail'
import { Panel, PanelHeader, Slider, Text } from '@whiteboard/ui-kit'

interface Props {
  onClose: () => void
}

export function LayoutPicker({ onClose }: Props) {
  const boards           = useWhiteboardStore((s) => s.boards)
  const activeBoardId    = useWhiteboardStore((s) => s.activeBoardId)
  const setLayout        = useWhiteboardStore((s) => s.setLayout)
  const setLayoutSpacing = useWhiteboardStore((s) => s.setLayoutSpacing)
  const activeBoard      = boards.find((b) => b.id === activeBoardId)
  const currentLayout    = activeBoard?.layoutId ?? 'dashboard'
  const widgets          = activeBoard?.widgets ?? []
  const { slotGap, slotPad, slotMap } = useLayout()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSelectLayout(newLayoutId: string) {
    if (newLayoutId === currentLayout) { onClose(); return }

    const newLayoutDef = getLayoutPreset(newLayoutId)
    const canvasW      = window.innerWidth
    const canvasH      = window.innerHeight - TOOLBAR_RESERVED
    const newSlotRects = newLayoutDef.slots.map((s) => computeSlotRect(s, canvasW, canvasH, slotGap, slotPad))

    const curLayoutDef = getLayoutPreset(currentLayout)
    const curSlotOrder = Object.fromEntries(curLayoutDef.slots.map((s, i) => [s.id, i]))
    const sorted = [...widgets].sort((a, b) => {
      const ai = a.slotId !== undefined ? (curSlotOrder[a.slotId] ?? 999) : 999
      const bi = b.slotId !== undefined ? (curSlotOrder[b.slotId] ?? 999) : 999
      return ai !== bi ? ai - bi : (a.x ?? 0) - (b.x ?? 0)
    })

    const widgetUpdates = sorted.map((widget, i) => {
      const newSlot = newSlotRects[i]
      if (newSlot) {
        return { id: widget.id, slotId: newSlot.id, x: newSlot.x, y: newSlot.y, width: newSlot.width, height: newSlot.height }
      }
      const curRect = widget.slotId ? slotMap[widget.slotId] : null
      return {
        id: widget.id, slotId: null as null,
        x: curRect?.x ?? widget.x, y: curRect?.y ?? widget.y,
        width: curRect?.width ?? widget.width, height: curRect?.height ?? widget.height,
      }
    })

    setLayout(activeBoardId, newLayoutId, widgetUpdates)
    onClose()
  }

  return (
    <Panel width={520} onClose={onClose}>
      <PanelHeader title="Layout" onClose={onClose} />

      <div className="grid grid-cols-4 gap-2.5 p-4">
        {LAYOUT_PRESETS.filter((l) => l.id !== 'custom').map((layout) => {
          const isActive = layout.id === currentLayout
          return (
            <button
              key={layout.id}
              onClick={() => handleSelectLayout(layout.id)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all"
              style={{
                backgroundColor: isActive ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'var(--wt-surface)',
                border: `1.5px solid ${isActive ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
              }}
            >
              <LayoutThumbnail layout={layout} active={isActive} width={80} height={52} />
              <Text
                variant="label"
                size="small"
                style={{ color: isActive ? 'var(--wt-accent)' : undefined }}
              >
                {layout.name}
              </Text>
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--wt-settings-divider)', paddingTop: 12 }}>
        <Slider
          label="Widget gap"
          value={slotGap}
          min={0}
          max={48}
          onChange={(v) => setLayoutSpacing(activeBoardId, v, slotPad)}
        />
        <Slider
          label="Edge padding"
          value={slotPad}
          min={0}
          max={64}
          onChange={(v) => setLayoutSpacing(activeBoardId, slotGap, v)}
        />
      </div>
    </Panel>
  )
}
