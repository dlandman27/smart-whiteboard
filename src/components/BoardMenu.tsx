import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { LAYOUT_PRESETS } from '../layouts/presets'
import { useWhiteboardStore } from '../store/whiteboard'
import { useLayout } from '../hooks/useLayout'
import { LayoutThumbnail } from './layout/LayoutThumbnail'
import { Icon, IconButton } from '../ui/web'

interface Props {
  onClose:  () => void
  onSlide:  (dir: 'left' | 'right') => void
}

export function BoardMenu({ onClose, onSlide }: Props) {
  const {
    boards, activeBoardId,
    setActiveBoard, addBoard, removeBoard, renameBoard,
    setLayout, setLayoutSpacing,
  } = useWhiteboardStore()
  const { slotGap, slotPad } = useLayout()

  const panelRef       = useRef<HTMLDivElement>(null)
  const [isAdding, setIsAdding]   = useState(false)
  const [newName,  setNewName]    = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const activeBoard   = boards.find((b) => b.id === activeBoardId)
  const currentLayout = activeBoard?.layoutId ?? 'dashboard'
  const activeIndex   = boards.findIndex((b) => b.id === activeBoardId)

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

  function switchBoard(id: string) {
    const targetIndex = boards.findIndex((b) => b.id === id)
    onSlide(targetIndex > activeIndex ? 'right' : 'left')
    setActiveBoard(id)
    onClose()
  }

  function handleAddBoard() {
    if (!newName.trim()) return
    onSlide('right')
    addBoard(newName.trim())
    setNewName('')
    setIsAdding(false)
  }

  function handleDelete(id: string) {
    if (deletingId === id) {
      // second click confirms
      const idx = boards.findIndex((b) => b.id === id)
      if (id === activeBoardId) {
        const next = boards[idx - 1] ?? boards[idx + 1]
        if (next) { onSlide(idx > 0 ? 'left' : 'right'); setActiveBoard(next.id) }
      }
      removeBoard(id)
      setDeletingId(null)
      if (boards.length <= 2) onClose() // only 1 left after delete
    } else {
      setDeletingId(id)
      // auto-cancel confirm after 3s
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[10000]" onClick={onClose} />

      <div
        ref={panelRef}
        className="fixed bottom-20 left-1/2 z-[10001] rounded-2xl overflow-hidden"
        style={{
          transform:       'translateX(-50%)',
          width:           460,
          maxHeight:       'calc(100vh - 120px)',
          overflowY:       'auto',
          backgroundColor: 'var(--wt-settings-bg)',
          border:          '1px solid var(--wt-settings-border)',
          boxShadow:       'var(--wt-shadow-lg)',
          backdropFilter:  'var(--wt-backdrop)',
          animation:       'slideUp 0.15s ease-out',
        }}
      >
        {/* ── Boards ───────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-settings-label)' }}>
            Boards
          </span>
          <IconButton icon={X} size="sm" onClick={onClose} />
        </div>

        <div className="px-2 pt-2 pb-1 space-y-0.5">
          {boards.map((board) => {
            const isActive    = board.id === activeBoardId
            const isDeleting  = deletingId === board.id
            return (
              <div key={board.id} className="flex items-center gap-1 group rounded-xl px-1">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => !isActive && switchBoard(board.id)}
                  className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
                  style={{
                    background: isActive ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'transparent',
                    color: 'var(--wt-text)',
                    cursor: isActive ? 'default' : 'pointer',
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                    style={{ background: isActive ? 'var(--wt-accent)' : 'var(--wt-border)' }}
                  />
                  <span className="text-sm font-medium flex-1">{board.name}</span>
                  {isActive && (
                    <Icon icon={Check} size={12} style={{ color: 'var(--wt-accent)', opacity: 0.7 }} />
                  )}
                </button>

                {boards.length > 1 && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => handleDelete(board.id)}
                    title={isDeleting ? 'Click again to confirm' : 'Delete board'}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                    style={{
                      color:      isDeleting ? '#fff' : 'var(--wt-text-muted)',
                      background: isDeleting ? '#ef4444' : 'transparent',
                      opacity:    isDeleting ? 1 : undefined,
                    }}
                  >
                    <Icon icon={Trash2} size={12} />
                    {isDeleting && <span>Confirm?</span>}
                  </button>
                )}
              </div>
            )
          })}

          {/* Add board */}
          {isAdding ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                autoFocus
                placeholder="Board name…"
                value={newName}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  handleAddBoard()
                  if (e.key === 'Escape') { setIsAdding(false); setNewName('') }
                }}
                className="wt-input flex-1 text-sm px-3 py-1.5 rounded-xl"
              />
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleAddBoard}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}
              >
                Add
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => { setIsAdding(false); setNewName('') }}
                className="p-1.5 rounded-xl transition-opacity hover:opacity-60"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                <Icon icon={X} size={13} />
              </button>
            </div>
          ) : (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--wt-text-muted)' }}
            >
              <Icon icon={Plus} size={13} />
              New board
            </button>
          )}
        </div>

        {/* ── Layout ───────────────────────────────────────────────── */}
        <div
          className="px-4 pt-3 pb-1"
          style={{ borderTop: '1px solid var(--wt-settings-divider)', marginTop: 4 }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-settings-label)' }}>
            Layout
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 px-4 py-3">
          {LAYOUT_PRESETS.map((layout) => {
            const isActive = layout.id === currentLayout
            return (
              <button
                key={layout.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setLayout(activeBoardId, layout.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: isActive ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'var(--wt-surface)',
                  border: `1.5px solid ${isActive ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                }}
              >
                <LayoutThumbnail layout={layout} active={isActive} />
                <span className="text-xs font-medium" style={{ color: isActive ? 'var(--wt-accent)' : 'var(--wt-text)' }}>
                  {layout.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Spacing controls */}
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: '1px solid var(--wt-settings-divider)', paddingTop: 12 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--wt-settings-label)' }}>Widget gap</span>
            <input
              type="range" min={0} max={48} value={slotGap}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setLayoutSpacing(activeBoardId, Number(e.target.value), slotPad)}
              className="flex-1 accent-[var(--wt-accent)]"
            />
            <span className="text-xs w-7 text-right tabular-nums" style={{ color: 'var(--wt-text-muted)' }}>{slotGap}px</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--wt-settings-label)' }}>Edge padding</span>
            <input
              type="range" min={0} max={64} value={slotPad}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setLayoutSpacing(activeBoardId, slotGap, Number(e.target.value))}
              className="flex-1 accent-[var(--wt-accent)]"
            />
            <span className="text-xs w-7 text-right tabular-nums" style={{ color: 'var(--wt-text-muted)' }}>{slotPad}px</span>
          </div>
        </div>
      </div>
    </>
  )
}
