import { useEffect, useRef, useState, useCallback } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore, type WidgetStyle } from '../store/whiteboard'
import { useUIStore } from '../store/ui'

interface WidgetCtx {
  id:          string
  hasSettings: boolean
}

interface Props {
  x:                  number
  y:                  number
  canvasW:            number
  canvasH:            number
  onClose:            () => void
  onAddWidget:        () => void
  onChangeLayout:     () => void
  onBoardSettings: () => void
  widgetCtx?:         WidgetCtx | null
}

const MENU_W = 200
const MENU_H = 280 // upper-bound for clamping

const STYLE_OPTIONS: { id: WidgetStyle; label: string; preview: string }[] = [
  { id: 'solid',       label: 'Solid',       preview: 'bg' },
  { id: 'glass',       label: 'Glass',       preview: 'glass' },
  { id: 'glass-dark',  label: 'Glass Dark',  preview: 'dark' },
  { id: 'glass-light', label: 'Glass Light', preview: 'light' },
  { id: 'borderless',  label: 'Borderless',  preview: 'none' },
  { id: 'none',        label: 'Invisible',   preview: 'inv' },
]

export function BoardContextMenu({ x, y, canvasW, canvasH, onClose, onAddWidget, onChangeLayout, onBoardSettings, widgetCtx }: Props) {
  const { activeBoardId, renameBoard, boards, updateWidgetStyle } = useWhiteboardStore()
  const { sendWidgetCommand, fullscreenWidgetId } = useUIStore()
  const activeBoard  = boards.find((b) => b.id === activeBoardId)
  const menuRef      = useRef<HTMLDivElement>(null)
  const [closing,      setClosing]      = useState(false)
  const [styleOpen,    setStyleOpen]    = useState(false)

  const activeWidgetStyle = widgetCtx
    ? (boards.find(b => b.id === activeBoardId)?.widgets.find(w => w.id === widgetCtx.id)?.widgetStyle)
    : undefined
  const closingRef   = useRef(false)
  const onCloseRef   = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const isWidgetFullscreen = widgetCtx ? fullscreenWidgetId === widgetCtx.id : false

  const dismiss = useCallback((then?: () => void) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    setTimeout(() => { onCloseRef.current(); then?.() }, 120)
  }, [])

  // Clamp to canvas bounds
  const left = Math.min(x, canvasW - MENU_W - 8)
  const top  = Math.min(y, canvasH - MENU_H - 8)

  // Auto-dismiss after 5 seconds — stable, only registers once
  useEffect(() => {
    const t = setTimeout(() => dismiss(), 5000)
    return () => clearTimeout(t)
  }, [])

  // Close on outside click or Escape — stable, only registers once
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') dismiss() }
    function onDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) dismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [])

  function handleRename() {
    const name = window.prompt('Rename board', activeBoard?.name ?? '')
    if (name?.trim()) renameBoard(activeBoardId, name.trim())
    dismiss()
  }

  function handleBoardItem(key: string) {
    if (key === 'add')        { dismiss(onAddWidget) }
    if (key === 'layout')     { dismiss(onChangeLayout) }
    if (key === 'settings') { dismiss(onBoardSettings) }
    if (key === 'rename')     { handleRename() }
  }

  function handleWidgetItem(key: string) {
    if (!widgetCtx) return
    if (key === 'settings')   { dismiss(() => sendWidgetCommand(widgetCtx.id, 'settings')) }
    if (key === 'fullscreen') { dismiss(() => sendWidgetCommand(widgetCtx.id, 'fullscreen')) }
    if (key === 'style')      { setStyleOpen(o => !o); return }
    // if (key === 'split')      { dismiss(() => sendWidgetCommand(widgetCtx.id, 'split')) }
    if (key === 'delete')     { dismiss(() => sendWidgetCommand(widgetCtx.id, 'delete')) }
  }

  const boardItems = [
    { icon: 'Plus',        label: 'Add Wiigit',     key: 'add'      },
    { icon: 'SquaresFour', label: 'Change layout',  key: 'layout'   },
    { icon: 'Gear',        label: 'Board settings', key: 'settings' },
  ]

  const widgetItems = widgetCtx ? [
    ...(widgetCtx.hasSettings ? [{ icon: 'GearSix',       label: 'Wiigit settings',                               key: 'settings',   danger: false }] : []),
    { icon: isWidgetFullscreen ? 'ArrowsInSimple' : 'ArrowsOutSimple',
                                                          label: isWidgetFullscreen ? 'Exit fullscreen' : 'Fullscreen', key: 'fullscreen', danger: false },
    { icon: 'PaintBrush',   label: 'Wiigit style',  key: 'style',    danger: false },
    // { icon: 'SquareSplitHorizontal', label: 'Split widget', key: 'split', danger: false },
    { icon: 'Trash',        label: 'Delete Wiigit', key: 'delete',   danger: true  },
  ] : []

  return (
    <div
      ref={menuRef}
      className="absolute z-[10001] rounded-2xl overflow-hidden"
      style={{
        left,
        top,
        width:           MENU_W,
        backgroundColor: 'var(--wt-settings-bg)',
        border:          '1px solid var(--wt-settings-border)',
        boxShadow:       'var(--wt-shadow-lg)',
        backdropFilter:  'var(--wt-backdrop)',
        animation:       closing ? 'contextMenuOut 0.12s ease-out forwards' : 'contextMenuIn 0.12s ease-out',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="p-1.5 flex flex-col gap-0.5">
        {widgetCtx && widgetItems.length > 0 && (
          <>
            {widgetItems.map(({ icon, label, key, danger }) => (
              <MenuItem key={key} icon={icon} label={label} danger={danger}
                active={key === 'style' && styleOpen}
                onClick={() => handleWidgetItem(key)} />
            ))}
            {styleOpen && widgetCtx && (
              <div style={{ padding: '4px 8px 6px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {STYLE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { updateWidgetStyle(widgetCtx.id, opt.id === activeWidgetStyle ? undefined : opt.id) }}
                    title={opt.label}
                    style={{
                      padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                      border: `1.5px solid ${activeWidgetStyle === opt.id ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                      background: activeWidgetStyle === opt.id ? 'var(--wt-accent)' : 'transparent',
                      color: activeWidgetStyle === opt.id ? 'var(--wt-accent-text)' : 'var(--wt-text)',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ height: 1, background: 'var(--wt-settings-border)', margin: '4px 8px' }} />
          </>
        )}

        {boardItems.map(({ icon, label, key }) => (
          <MenuItem key={key} icon={icon} label={label} onClick={() => handleBoardItem(key)} />
        ))}
      </div>
    </div>
  )
}

function MenuItem({ icon, label, danger, active, onClick }: { icon: string; label: string; danger?: boolean; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors"
      style={{ background: active ? 'var(--wt-surface-hover)' : 'transparent', color: danger ? 'var(--wt-danger)' : 'var(--wt-text)' }}
      onPointerEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
      onPointerLeave={(e) => (e.currentTarget.style.background = active ? 'var(--wt-surface-hover)' : 'transparent')}
    >
      <Icon icon={icon} size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
