import { useState, useRef, useEffect, useCallback } from 'react'
import { soundPanelOpen, soundSwipe, soundClick } from '../lib/sounds'
import { Icon, IconButton } from '@whiteboard/ui-kit'
import { DRAWING_COLORS, STROKE_WIDTHS, DEFAULT_COLOR, DEFAULT_STROKE, DEFAULT_ERASER_SIZE } from '../constants/drawing'
import { useWhiteboardStore } from '../store/whiteboard'
import { useVoiceStore } from '../store/voice'
import { useUIStore } from '../store/ui'
import { DrawingCanvas } from './DrawingCanvas'
import type { DrawingCanvasHandle } from './DrawingCanvas'
import { NotificationCenter, NotificationCenterButton } from './NotificationCenter'
import { DatabasePicker } from './DatabasePicker'
import { Pill } from './Pill'
import type { PendingWidget } from '../types'

type Tool = 'pointer' | 'marker' | 'eraser'
type ActivePanel = 'picker' | 'notif' | null

interface Props {
  onToolChange:          (tool: Tool) => void
  onWidgetSelected:      (widget: PendingWidget) => void
  externalPickerOpen?:   boolean
  onExternalPickerClose?: () => void
}

const WAVEFORM_BARS = [
  { delay: '0ms',    durations: { listening: '0.55s', processing: '0.7s' } },
  { delay: '120ms',  durations: { listening: '0.7s',  processing: '0.7s' } },
  { delay: '60ms',   durations: { listening: '0.62s', processing: '0.7s' } },
  { delay: '200ms',  durations: { listening: '0.5s',  processing: '0.7s' } },
]

function WaveformBars({ state }: { state: ReturnType<typeof useVoiceStore>['state'] }) {
  const isListening  = state === 'listening'
  const isProcessing = state === 'processing'
  const isResponding = state === 'responding'
  const isActive     = isListening || isProcessing || isResponding

  return (
    <>
      <style>{`
        @keyframes wf-bounce {
          0%, 100% { height: 3px; }
          50%       { height: 16px; }
        }
        @keyframes wf-pulse {
          0%, 100% { height: 6px;  opacity: 0.5; }
          50%       { height: 10px; opacity: 1;   }
        }
        @keyframes wf-respond {
          0%, 100% { height: 4px; }
          50%       { height: 14px; }
        }
      `}</style>
      <div className="flex items-center gap-[3px]" style={{ height: 20 }}>
        {WAVEFORM_BARS.map((bar, i) => {
          let animation = 'none'
          if (isListening)  animation = `wf-bounce  ${bar.durations.listening}  ease-in-out ${bar.delay} infinite`
          if (isProcessing) animation = `wf-pulse   ${bar.durations.processing} ease-in-out ${bar.delay} infinite`
          if (isResponding) animation = `wf-respond 0.45s                       ease-in-out ${bar.delay} infinite`
          return (
            <div
              key={i}
              style={{
                width:           3,
                height:          isActive ? undefined : 3,
                borderRadius:    2,
                backgroundColor: isActive ? 'var(--wt-accent-text)' : 'var(--wt-text)',
                opacity:         isActive ? 1 : 0.45,
                alignSelf:       'center',
                animation,
                transition:      'background-color 0.2s, opacity 0.2s',
              }}
            />
          )
        })}
      </div>
    </>
  )
}

function VoiceButton({ state }: { state: ReturnType<typeof useVoiceStore>['state'] }) {
  const isActive = state === 'listening' || state === 'processing' || state === 'responding'

  return (
    <div className="relative flex items-center justify-center">
      {state === 'listening' && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: 'var(--wt-accent)', opacity: 0.2 }}
        />
      )}
      <button
        data-no-click-sound
        title={state === 'unsupported' ? 'Voice not supported' : `Voice — ${state}`}
        className="relative flex items-center justify-center rounded-full transition-all"
        style={{
          width:           44,
          height:          44,
          backgroundColor: isActive
            ? 'var(--wt-accent)'
            : 'color-mix(in srgb, var(--wt-text) 8%, transparent)',
          opacity:         state === 'unsupported' ? 0.3 : 1,
          boxShadow:       isActive ? '0 0 0 3px color-mix(in srgb, var(--wt-accent) 25%, transparent)' : 'none',
          cursor:          state === 'unsupported' ? 'not-allowed' : 'default',
        }}
      >
        <WaveformBars state={state} />
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div
      className="flex-shrink-0 self-stretch"
      style={{
        width:           1,
        margin:          '6px 2px',
        backgroundColor: 'var(--wt-text)',
        opacity:         0.12,
      }}
    />
  )
}

export function BottomToolbar({ onToolChange, onWidgetSelected, externalPickerOpen, onExternalPickerClose }: Props) {
  const { activeBoardId } = useWhiteboardStore()
  const voiceState = useVoiceStore((s) => s.state)
  const setScreensaverMode = useUIStore((s) => s.setScreensaverMode)

  const drawingRef                    = useRef<DrawingCanvasHandle>(null)
  const [activeTool,  setActiveTool]  = useState<Tool>('pointer')
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE)
  const [eraserSize,  setEraserSize]  = useState(DEFAULT_ERASER_SIZE)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [hidden,      setHidden]      = useState(false)
  const touchStartY                   = useRef(0)
  const pillRef                       = useRef<HTMLDivElement>(null)

  function togglePanel(panel: Exclude<ActivePanel, null>) {
    setActivePanel((p) => (p !== panel ? panel : null))
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function onToolbarTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 20) { setHidden(true); setActivePanel(null) }
  }

  // Click sound on every button inside the pill
  useEffect(() => {
    const pill = pillRef.current
    if (!pill) return
    function onDown(e: PointerEvent) {
      const btn = (e.target as HTMLElement).closest('button')
      if (btn && !btn.hasAttribute('data-no-click-sound')) soundClick()
    }
    pill.addEventListener('pointerdown', onDown)
    return () => pill.removeEventListener('pointerdown', onDown)
  }, [])

  useEffect(() => {
    if (externalPickerOpen) {
      setActivePanel('picker')
      onExternalPickerClose?.()
    }
  }, [externalPickerOpen])

  const [openKey, setOpenKey] = useState(0)

  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (hidden) soundSwipe()
    else { soundPanelOpen(); setOpenKey((k) => k + 1) }
  }, [hidden])

  function selectTool(tool: Tool) {
    setActiveTool(tool)
    onToolChange(tool)
  }

  // Shared tab style for both show and hide handles
  const tabStyle: React.CSSProperties = {
    position:     'absolute',
    left:         '50%',
    transform:    'translate(-50%, -100%)',
    top:          0,
    background:   'var(--wt-bg)',
    border:       '1px solid var(--wt-border)',
    borderBottom: 'none',
    borderRadius: '6px 6px 0 0',
    padding:      '3px 24px',
    cursor:       'pointer',
    color:        'var(--wt-text-muted)',
    display:      'flex',
    alignItems:   'center',
  }

  return (
    <>
      <DrawingCanvas
        ref={drawingRef}
        boardId={activeBoardId}
        tool={activeTool}
        color={activeColor}
        strokeWidth={strokeWidth}
        eraserSize={eraserSize}
      />

      {/* ── Drawing options pill (floats above toolbar when marker active) ── */}
      {activeTool === 'marker' && (
        <Pill
          className="absolute left-1/2 z-[9999] flex items-center gap-1.5 p-2 select-none"
          style={{
            transform:  'translateX(-50%)',
            bottom:     hidden ? 14 : 'calc(3.5rem + 14px)',
            transition: 'bottom 0.25s ease',
          }}
        >
          <div className="flex items-center gap-1">
            {DRAWING_COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => setActiveColor(c)}
                style={{
                  width:           20,
                  height:          20,
                  borderRadius:    '50%',
                  backgroundColor: c,
                  border:          activeColor === c
                    ? '2px solid var(--wt-text)'
                    : '2px solid transparent',
                  outline:         activeColor === c
                    ? '1px solid var(--wt-bg)'
                    : 'none',
                  flexShrink:      0,
                }}
              />
            ))}
          </div>
          <Divider />
          <div className="flex items-center gap-1">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                title={`${sw.value}px`}
                onClick={() => setStrokeWidth(sw.value)}
                className="flex items-center justify-center"
                style={{ width: 28, height: 28 }}
              >
                <div
                  className={`${sw.dot} rounded-full`}
                  style={{
                    backgroundColor: strokeWidth === sw.value
                      ? 'var(--wt-text)'
                      : 'color-mix(in srgb, var(--wt-text) 35%, transparent)',
                  }}
                />
              </button>
            ))}
          </div>
        </Pill>
      )}

      {/* ── Main toolbar ────────────────────────────────────────── */}
      <Pill
        ref={pillRef}
        className="absolute bottom-2 left-1/2 z-[9999] flex items-center gap-1.5 p-2 select-none"
        style={{
          transform:     hidden ? 'translateX(-50%) translateY(calc(100% + 12px))' : 'translateX(-50%)',
          transition:    'transform 0.25s ease, opacity 0.25s ease',
          opacity:       hidden ? 0 : 1,
          pointerEvents: hidden ? 'none' : 'auto',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onToolbarTouchEnd}
      >
        {/* Hide handle */}
        <button data-no-click-sound style={tabStyle} onClick={() => { setHidden(true); setActivePanel(null) }}>
          <Icon icon="CaretDown" size={11} />
        </button>

        <Divider />

        {/* ── Left group: drawing tools ── */}
        <div key={`draw-${openKey}`} className="toolbar-drop-in flex items-center gap-1" style={{ animationDelay: '80ms' }}>
          <IconButton
            icon="PencilSimple"
            size="xl"
            variant={activeTool === 'marker' ? 'active' : 'default'}
            onClick={() => selectTool(activeTool === 'marker' ? 'pointer' : 'marker')}
            title="Draw"
          />
          <IconButton
            icon="Eraser"
            size="xl"
            variant={activeTool === 'eraser' ? 'active' : 'default'}
            onClick={() => selectTool(activeTool === 'eraser' ? 'pointer' : 'eraser')}
            title="Eraser"
          />
          <IconButton
            icon="Trash"
            size="xl"
            variant="default"
            onClick={() => drawingRef.current?.clear()}
            title="Clear drawing"
          />
        </div>

        <Divider />

        {/* ── Center: voice ── */}
        <div key={`voice-${openKey}`} className="toolbar-drop-in" style={{ animationDelay: '120ms' }}>
          <VoiceButton state={voiceState} />
        </div>

        <Divider />

        {/* ── Right group: actions ── */}
        <div key={`plus-${openKey}`} className="toolbar-drop-in" style={{ animationDelay: '160ms' }}>
          <IconButton
            icon="Plus"
            size="xl"
            variant={activePanel === 'picker' ? 'active' : 'default'}
            onClick={() => { selectTool('pointer'); togglePanel('picker') }}
            title="Add Wiigit"
          />
        </div>

        <div key={`notif-${openKey}`} className="toolbar-drop-in" style={{ animationDelay: '200ms' }}>
          <NotificationCenterButton
            active={activePanel === 'notif'}
            onClick={() => togglePanel('notif')}
          />
        </div>

        <div key={`ss-${openKey}`} className="toolbar-drop-in" style={{ animationDelay: '240ms' }}>
          <IconButton
            icon="Moon"
            size="xl"
            variant="default"
            onClick={() => setScreensaverMode(true)}
            title="Screensaver"
          />
        </div>
      </Pill>

      {/* ── Show handle (visible when toolbar is hidden) ──────��──── */}
      <button
        data-no-click-sound
        onClick={() => setHidden(false)}
        className="absolute bottom-0 left-1/2 z-[9999] flex items-center gap-1 select-none"
        style={{
          transform:    hidden ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
          transition:   'transform 0.25s ease',
          background:   'var(--wt-bg)',
          border:       '1px solid var(--wt-border)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          padding:      '3px 24px',
          cursor:       'pointer',
          color:        'var(--wt-text-muted)',
        }}
      >
        <Icon icon="CaretUp" size={11} />
      </button>

      {activePanel === 'notif' && <NotificationCenter onClose={() => setActivePanel(null)} />}
      {activePanel === 'picker' && (
        <DatabasePicker
          onClose={() => setActivePanel(null)}
          onWidgetSelected={(w) => { onWidgetSelected(w) }}
        />
      )}
    </>
  )
}
