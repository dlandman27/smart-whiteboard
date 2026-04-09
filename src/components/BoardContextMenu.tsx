import { useEffect, useRef, useState, useCallback } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'

interface WidgetCtx {
  id:          string
  hasSettings: boolean
}

interface Props {
  x:              number
  y:              number
  canvasW:        number
  canvasH:        number
  onClose:        () => void
  onAddWidget:    () => void
  onChangeLayout: () => void
  widgetCtx?:     WidgetCtx | null
}

const MENU_W = 200
const MENU_H = 280 // upper-bound for clamping

export function BoardContextMenu({ x, y, canvasW, canvasH, onClose, onAddWidget, onChangeLayout, widgetCtx }: Props) {
  const { activeBoardId, renameBoard, boards } = useWhiteboardStore()
  const { sendWidgetCommand, fullscreenWidgetId } = useUIStore()
  const activeBoard  = boards.find((b) => b.id === activeBoardId)
  const menuRef      = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
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
    if (key === 'add')    { dismiss(onAddWidget) }
    if (key === 'layout') { dismiss(onChangeLayout) }
    if (key === 'rename') { handleRename() }
  }

  function handleWidgetItem(key: string) {
    if (!widgetCtx) return
    if (key === 'settings')   { dismiss(() => sendWidgetCommand(widgetCtx.id, 'settings')) }
    if (key === 'fullscreen') { dismiss(() => sendWidgetCommand(widgetCtx.id, 'fullscreen')) }
    if (key === 'delete')     { dismiss(() => sendWidgetCommand(widgetCtx.id, 'delete')) }
  }

  const boardItems = [
    { icon: 'Plus',         label: 'Add widget',    key: 'add'    },
    { icon: 'SquaresFour',  label: 'Change layout', key: 'layout' },
    { icon: 'PencilSimple', label: 'Rename board',  key: 'rename' },
  ]

  const widgetItems = widgetCtx ? [
    ...(widgetCtx.hasSettings ? [{ icon: 'GearSix',       label: 'Widget settings',                               key: 'settings',   danger: false }] : []),
    { icon: isWidgetFullscreen ? 'ArrowsInSimple' : 'ArrowsOutSimple',
                                                          label: isWidgetFullscreen ? 'Exit fullscreen' : 'Fullscreen', key: 'fullscreen', danger: false },
    { icon: 'Trash',        label: 'Delete widget', key: 'delete',   danger: true  },
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
              <MenuItem key={key} icon={icon} label={label} danger={danger} onClick={() => handleWidgetItem(key)} />
            ))}
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

function MenuItem({ icon, label, danger, onClick }: { icon: string; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors"
      style={{ background: 'transparent', color: danger ? 'var(--wt-danger)' : 'var(--wt-text)' }}
      onPointerEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
      onPointerLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon icon={icon} size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
