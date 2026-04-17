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
  { id: 'solid',       label: 'Solid',       description: 'Opaque background with shadow' },
  { id: 'glass',       label: 'Glass',       description: 'Frosted blur with transparency' },
  { id: 'glass-dark',  label: 'Glass Dark',  description: 'Dark frosted glass, white text' },
  { id: 'glass-light', label: 'Glass Light', description: 'Light frosted glass' },
  { id: 'borderless',  label: 'Borderless',  description: 'Content only, no frame' },
  { id: 'none',        label: 'Invisible',   description: 'No container, widget floats raw' },
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

  if (style === 'glass-dark') return (
    <div style={{ ...baseStyle, background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
      <div style={{ height: 6, borderRadius: 4, background: '#fff', width: '60%', opacity: 0.6 }} />
      <div style={{ height: 4, borderRadius: 4, background: '#fff', width: '90%', opacity: 0.2 }} />
      <div style={{ height: 4, borderRadius: 4, background: '#fff', width: '70%', opacity: 0.15 }} />
    </div>
  )

  if (style === 'glass-light') return (
    <div style={{ ...baseStyle, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--wt-accent)', width: '60%', opacity: 0.8 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '90%', opacity: 0.2 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '70%', opacity: 0.15 }} />
    </div>
  )

  if (style === 'borderless') return (
    <div style={{ ...baseStyle, background: 'transparent', border: '1.5px dashed color-mix(in srgb, var(--wt-border) 40%, transparent)' }}>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--wt-accent)', width: '60%', opacity: 0.7 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '90%', opacity: 0.15 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '70%', opacity: 0.1 }} />
    </div>
  )

  // none
  return (
    <div style={{ ...baseStyle, background: 'transparent', border: 'none' }}>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--wt-accent)', width: '60%', opacity: 0.5 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '90%', opacity: 0.1 }} />
      <div style={{ height: 4, borderRadius: 4, background: 'var(--wt-text)', width: '70%', opacity: 0.07 }} />
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

// ── Size presets ─────────────────────────────────────────────────────────────

const GAP_OPTIONS: { label: string; value: number }[] = [
  { label: 'None', value: 0 },
  { label: 'SM',   value: 6 },
  { label: 'MD',   value: 12 },
  { label: 'LG',   value: 20 },
  { label: 'XL',   value: 28 },
]

const PAD_OPTIONS: { label: string; value: number }[] = [
  { label: 'None', value: 0 },
  { label: 'SM',   value: 8 },
  { label: 'MD',   value: 16 },
  { label: 'LG',   value: 28 },
  { label: 'XL',   value: 40 },
]

function SizeSegment({ options, value, onChange }: { options: { label: string; value: number }[]; value: number; onChange: (v: number) => void }) {
  // Find closest option to current value
  const activeIdx = options.reduce((best, opt, i) =>
    Math.abs(opt.value - value) < Math.abs(options[best].value - value) ? i : best, 0)

  return (
    <div
      className="flex rounded-lg overflow-hidden"
      style={{ border: '1.5px solid var(--wt-border)', background: 'var(--wt-surface)' }}
    >
      {options.map((opt, i) => {
        const isActive = i === activeIdx
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            className="flex-1 text-[11px] font-semibold py-1.5"
            style={{
              background: isActive ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
              color: isActive ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
              border: 'none',
              borderRight: i < options.length - 1 ? '1px solid var(--wt-border)' : 'none',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
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
              <span className="text-xs font-medium mb-2 block" style={{ color: 'var(--wt-text)' }}>Gap</span>
              <SizeSegment
                options={GAP_OPTIONS}
                value={slotGap}
                onChange={(v) => setLayoutSpacing(activeBoardId, v, slotPad)}
              />
            </div>
            <div>
              <span className="text-xs font-medium mb-2 block" style={{ color: 'var(--wt-text)' }}>Padding</span>
              <SizeSegment
                options={PAD_OPTIONS}
                value={slotPad}
                onChange={(v) => setLayoutSpacing(activeBoardId, slotGap, v)}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
