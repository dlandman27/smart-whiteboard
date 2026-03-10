import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react'
import { IconButton } from '../ui/web'
import { useWhiteboardStore } from '../store/whiteboard'
import { Pill } from './Pill'

interface Props {
  onSlide: (dir: 'left' | 'right') => void
}

export function BoardNav({ onSlide }: Props) {
  const { boards, activeBoardId, setActiveBoard, addBoard, renameBoard } = useWhiteboardStore()

  const [isNaming, setIsNaming]         = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [isRenaming, setIsRenaming]     = useState(false)
  const [renameValue, setRenameValue]   = useState('')

  const activeIndex = boards.findIndex((b) => b.id === activeBoardId)
  const activeBoard = boards[activeIndex]
  const prevBoard   = boards[activeIndex - 1]
  const nextBoard   = boards[activeIndex + 1]

  function goTo(id: string, dir: 'left' | 'right') {
    onSlide(dir)
    setActiveBoard(id)
  }

  function handleAddBoard() {
    if (!newBoardName.trim()) return
    onSlide('right')
    addBoard(newBoardName.trim())
    setNewBoardName('')
    setIsNaming(false)
  }

  function startRename() {
    setRenameValue(activeBoard?.name ?? '')
    setIsRenaming(true)
  }

  function commitRename() {
    if (renameValue.trim()) renameBoard(activeBoardId, renameValue.trim())
    setIsRenaming(false)
  }

  return (
    <Pill className="absolute top-4 right-4 z-20 flex items-center gap-px px-2 py-2 pointer-events-auto select-none">
      <IconButton
        icon={ChevronLeft}
        onClick={() => prevBoard && goTo(prevBoard.id, 'left')}
        disabled={!prevBoard}
        title={prevBoard?.name}
      />

      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setIsRenaming(false)
          }}
          className="w-28 bg-stone-100 text-stone-800 text-xs text-center rounded-md px-2 py-1 outline-none border border-stone-300"
        />
      ) : isNaming ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            placeholder="Board name…"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddBoard()
              if (e.key === 'Escape') { setIsNaming(false); setNewBoardName('') }
            }}
            className="w-28 bg-stone-100 text-stone-800 text-xs text-center rounded-md px-2 py-1 outline-none border border-stone-300 placeholder-stone-400"
          />
          <IconButton icon={Check} size="sm" onClick={handleAddBoard} className="text-green-500 hover:text-green-600 hover:bg-stone-100" />
          <IconButton icon={XIcon} size="sm" onClick={() => { setIsNaming(false); setNewBoardName('') }} />
        </div>
      ) : (
        <button
          onDoubleClick={startRename}
          className="px-2 py-1.5 rounded-md text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors min-w-[5rem] text-center"
          title="Double-click to rename"
        >
          {activeBoard?.name ?? 'Board'}
        </button>
      )}

      <IconButton
        icon={ChevronRight}
        onClick={() => nextBoard && goTo(nextBoard.id, 'right')}
        disabled={!nextBoard}
        title={nextBoard?.name}
      />

      <IconButton
        icon={Plus}
        onClick={() => !isNaming && setIsNaming(true)}
        title="New board"
      />
    </Pill>
  )
}
