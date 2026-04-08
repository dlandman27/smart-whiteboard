import { useEffect, useState } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'
import { Icon, IconButton, Panel, PanelHeader, Input, Button, Text } from '@whiteboard/ui-kit'
import { BoardThumbnail } from './BoardThumbnail'

interface Props {
  onClose:  () => void
  onSlide:  (dir: 'left' | 'right') => void
}

export function BoardMenu({ onClose, onSlide }: Props) {
  const {
    boards, activeBoardId,
    setActiveBoard, addBoard, removeBoard,
  } = useWhiteboardStore()

  const [isAdding,   setIsAdding]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const activeIndex = boards.findIndex((b) => b.id === activeBoardId)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
      const idx = boards.findIndex((b) => b.id === id)
      if (id === activeBoardId) {
        const next = boards[idx - 1] ?? boards[idx + 1]
        if (next) { onSlide(idx > 0 ? 'left' : 'right'); setActiveBoard(next.id) }
      }
      removeBoard(id)
      setDeletingId(null)
      if (boards.length <= 2) onClose()
    } else {
      setDeletingId(id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  return (
    <Panel width={460} maxHeight="calc(100vh - 120px)" onClose={onClose}>
      <PanelHeader title="Boards" onClose={onClose} />

      <div className="px-2 pt-2 pb-1 space-y-0.5">
        {boards.map((board) => {
          const isActive   = board.id === activeBoardId
          const isDeleting = deletingId === board.id

          return (
            <div key={board.id} className="flex items-center gap-1 group rounded-xl px-1">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => !isActive && switchBoard(board.id)}
                className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors"
                style={{
                  background: isActive ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'transparent',
                  cursor:     isActive ? 'default' : 'pointer',
                }}
              >
                {/* Board thumbnail */}
                <div
                  className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
                  style={{
                    boxShadow: isActive
                      ? `0 0 0 1.5px var(--wt-accent)`
                      : `0 0 0 1px var(--wt-border)`,
                  }}
                >
                  <BoardThumbnail board={board} width={60} height={40} />
                </div>
                <Text variant="body" size="small" style={{ flex: 1 }}>{board.name}</Text>
                {isActive && <Icon icon="Check" size={12} style={{ color: 'var(--wt-accent)', opacity: 0.7 }} />}
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
                  <Icon icon="Trash" size={12} />
                  {isDeleting && <span>Confirm?</span>}
                </button>
              )}
            </div>
          )
        })}

        {isAdding ? (
          <div className="flex items-center gap-1 px-2 py-1">
            <Input
              autoFocus
              placeholder="Board name…"
              value={newName}
              size="sm"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleAddBoard()
                if (e.key === 'Escape') { setIsAdding(false); setNewName('') }
              }}
            />
            <Button variant="accent" size="sm" onClick={handleAddBoard}>Add</Button>
            <IconButton icon="X" size="sm" onClick={() => { setIsAdding(false); setNewName('') }} />
          </div>
        ) : (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--wt-text-muted)' }}
          >
            <Icon icon="Plus" size={13} />
            <Text variant="body" size="small" color="muted" as="span">New board</Text>
          </button>
        )}
      </div>

      <div className="h-2" />
    </Panel>
  )
}
