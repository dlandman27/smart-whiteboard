import { useEffect, useRef } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore, type WidgetStyle } from '../store/whiteboard'
import { useThemeStore } from '../store/theme'
import { DEFAULT_SLOT_GAP, DEFAULT_SLOT_PAD } from '../hooks/useLayout'
import { BackgroundPicker } from './BackgroundPicker'

interface Props {
  onClose: () => void
}

// ── Widget Style Picker ───────────────────────────────────────────────────────

const WIDGET_STYLES: { id: WidgetStyle; label: string; description: string }[] = [
  { id: 'solid',      label: 'Solid',      description: 'Opaque background with shadow' },
  { id: 'glass',      label: 'Glass',      description: 'Frosted blur with transparency' },
  { id: 'borderless', label: 'Borderless', description: 'Content only, no frame' },
]

function StylePreview({ style }: { style: WidgetStyle }) {
  const baseStyle: React.CSSProperties = {
    width: '100%', height: '100%', borderRadius: 8,
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: 8, position: 'relative', overflow: 'hidden',
  }

  if (style === 'solid') return (
    <div style={{ ...baseStyle, background: 'var(--wt-bg)', border: '1.5px solid var(--wt-border)', boxShadow: '0 3px 0 rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--wt-accent)', width: '60%', opacity: 0.7 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '90%', opacity: 0.15 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '70%', opacity: 0.1 }} />
    </div>
  )

  if (style === 'glass') return (
    <div style={{ ...baseStyle, background: 'color-mix(in srgb, var(--wt-bg) 55%, transparent)', border: '1.5px solid color-mix(in srgb, var(--wt-border) 60%, transparent)', backdropFilter: 'blur(12px)', boxShadow: '0 3px 0 rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--wt-accent)', width: '60%', opacity: 0.7 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '90%', opacity: 0.15 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '70%', opacity: 0.1 }} />
    </div>
  )

  // borderless
  return (
    <div style={{ ...baseStyle, background: 'transparent', border: '1.5px dashed color-mix(in srgb, var(--wt-border) 40%, transparent)' }}>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--wt-accent)', width: '60%', opacity: 0.7 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '90%', opacity: 0.15 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '70%', opacity: 0.1 }} />
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--wt-text-muted)' }}>
      {children}
    </p>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function BoardSettingsPanel({ onClose }: Props) {
  const { boards, activeBoardId, setBoardWidgetStyle, setBoardBackground, setLayoutSpacing, renameBoard } = useWhiteboardStore()
  const { background: themeBackground } = useThemeStore()
  const activeBoard = boards.find((b) => b.id === activeBoardId)
  const panelRef    = useRef<HTMLDivElement>(null)

  const widgetStyle = activeBoard?.widgetStyle ?? 'solid'
  const slotGap     = activeBoard?.slotGap ?? DEFAULT_SLOT_GAP
  const slotPad     = activeBoard?.slotPad ?? DEFAULT_SLOT_PAD
  const boardBg     = activeBoard?.background ?? themeBackground

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [onClose])

  if (!activeBoard || activeBoard.boardType) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-0 right-0 bottom-0 z-[10003] flex flex-col overflow-hidden"
      style={{
        width:           320,
        backgroundColor: 'var(--wt-settings-bg)',
        borderLeft:      '1px solid var(--wt-settings-border)',
        boxShadow:       '-4px 0 24px rgba(0,0,0,0.12)',
        animation:       'wt-settings-in 0.22s cubic-bezier(0.34, 1.2, 0.64, 1) forwards',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: '1px solid var(--wt-settings-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <Icon icon="Gear" size={16} style={{ color: 'var(--wt-accent)' }} />
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--wt-text)', maxWidth: 180 }}>
            {activeBoard.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg"
          style={{ width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)' }}
          onPointerEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
          onPointerLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon icon="X" size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

        {/* Board name */}
        <div>
          <SectionLabel>Board Name</SectionLabel>
          <input
            className="wt-input w-full text-sm px-3 py-2 rounded-lg"
            defaultValue={activeBoard.name}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== activeBoard.name) renameBoard(activeBoardId, v)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
        </div>

        <div style={{ height: 1, background: 'var(--wt-settings-border)' }} />

        {/* Widget style */}
        <div>
          <SectionLabel>Widget Style</SectionLabel>
          <div className="flex flex-col gap-2">
            {WIDGET_STYLES.map((s) => {
              const isActive = widgetStyle === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setBoardWidgetStyle(activeBoardId, s.id)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={{
                    background: isActive ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'var(--wt-surface)',
                    border:     `1.5px solid ${isActive ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                    cursor:     'pointer',
                  }}
                  onPointerEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--wt-surface-hover)' }}
                  onPointerLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--wt-surface)' }}
                >
                  {/* Mini preview */}
                  <div className="flex-shrink-0" style={{ width: 52, height: 40 }}>
                    <StylePreview style={s.id} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: isActive ? 'var(--wt-accent)' : 'var(--wt-text)' }}>
                      {s.label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--wt-text-muted)' }}>
                      {s.description}
                    </p>
                  </div>
                  {isActive && <Icon icon="CheckCircle" size={15} style={{ color: 'var(--wt-accent)', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--wt-settings-border)' }} />

        {/* Background */}
        <div>
          <SectionLabel>Background</SectionLabel>
          <BackgroundPicker
            background={boardBg}
            onSelect={(bg) => setBoardBackground(activeBoardId, bg)}
          />
        </div>

        <div style={{ height: 1, background: 'var(--wt-settings-border)' }} />

        {/* Slot spacing */}
        <div>
          <SectionLabel>Slot Spacing</SectionLabel>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--wt-text)' }}>Gap</span>
                <span className="text-xs font-mono" style={{ color: 'var(--wt-text-muted)' }}>{slotGap}px</span>
              </div>
              <input
                type="range" min={0} max={32} step={2} value={slotGap}
                onChange={(e) => setLayoutSpacing(activeBoardId, Number(e.target.value), slotPad)}
                className="w-full"
                style={{ accentColor: 'var(--wt-accent)', height: 3 }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--wt-text)' }}>Padding</span>
                <span className="text-xs font-mono" style={{ color: 'var(--wt-text-muted)' }}>{slotPad}px</span>
              </div>
              <input
                type="range" min={0} max={48} step={2} value={slotPad}
                onChange={(e) => setLayoutSpacing(activeBoardId, slotGap, Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--wt-accent)', height: 3 }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
