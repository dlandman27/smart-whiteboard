import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { LAYOUT_PRESETS } from '../../layouts/presets'
import { useWhiteboardStore } from '../../store/whiteboard'
import { useLayout, DEFAULT_SLOT_GAP, DEFAULT_SLOT_PAD } from '../../hooks/useLayout'
import { LayoutThumbnail } from './LayoutThumbnail'
import { IconButton } from '../../ui/web'

interface Props {
  onClose: () => void
}

export function LayoutPicker({ onClose }: Props) {
  const boards             = useWhiteboardStore((s) => s.boards)
  const activeBoardId      = useWhiteboardStore((s) => s.activeBoardId)
  const setLayout          = useWhiteboardStore((s) => s.setLayout)
  const setLayoutSpacing   = useWhiteboardStore((s) => s.setLayoutSpacing)
  const activeBoard        = boards.find((b) => b.id === activeBoardId)
  const currentLayout      = activeBoard?.layoutId ?? 'dashboard'
  const { slotGap, slotPad } = useLayout()

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  function selectLayout(id: string) {
    setLayout(activeBoardId, id)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div
        ref={panelRef}
        className="fixed bottom-20 left-1/2 z-40 rounded-2xl overflow-hidden"
        style={{
          transform:       'translateX(-50%)',
          width:           480,
          backgroundColor: 'var(--wt-settings-bg)',
          border:          '1px solid var(--wt-settings-border)',
          boxShadow:       'var(--wt-shadow-lg)',
          backdropFilter:  'var(--wt-backdrop)',
          animation:       'slideUp 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--wt-settings-label)' }}
          >
            Layout
          </span>
          <IconButton icon={X} onClick={onClose} />
        </div>

        {/* Grid of layouts */}
        <div className="grid grid-cols-3 gap-3 p-4">
          {LAYOUT_PRESETS.map((layout) => {
            const isActive = layout.id === currentLayout
            return (
              <button
                key={layout.id}
                onClick={() => selectLayout(layout.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: isActive ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'var(--wt-surface)',
                  border: `1.5px solid ${isActive ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                }}
              >
                <LayoutThumbnail layout={layout} active={isActive} />
                <span
                  className="text-xs font-medium"
                  style={{ color: isActive ? 'var(--wt-accent)' : 'var(--wt-text)' }}
                >
                  {layout.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Spacing controls */}
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: '1px solid var(--wt-settings-divider)', paddingTop: '12px' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--wt-settings-label)' }}>
              Widget gap
            </span>
            <input
              type="range" min={0} max={48} value={slotGap}
              onChange={(e) => setLayoutSpacing(activeBoardId, Number(e.target.value), slotPad)}
              className="flex-1 accent-[var(--wt-accent)]"
            />
            <span className="text-xs w-7 text-right tabular-nums" style={{ color: 'var(--wt-text-muted)' }}>
              {slotGap}px
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--wt-settings-label)' }}>
              Edge padding
            </span>
            <input
              type="range" min={0} max={64} value={slotPad}
              onChange={(e) => setLayoutSpacing(activeBoardId, slotGap, Number(e.target.value))}
              className="flex-1 accent-[var(--wt-accent)]"
            />
            <span className="text-xs w-7 text-right tabular-nums" style={{ color: 'var(--wt-text-muted)' }}>
              {slotPad}px
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
