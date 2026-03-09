import { useState } from 'react'
import { Plus, Wifi, WifiOff, ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react'
import { useWhiteboardStore } from '../store/whiteboard'
import { useNotionHealth } from '../hooks/useNotion'
import { Widget } from './Widget'
import { DatabaseWidget } from './widgets/DatabaseWidget'
import { DatabasePicker } from './DatabasePicker'

export function Whiteboard() {
  const { boards, activeBoardId, setActiveBoard, addBoard, renameBoard } = useWhiteboardStore()
  const [showPicker, setShowPicker] = useState(false)
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right')

  // Board naming state
  const [isNaming, setIsNaming] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  // Board renaming state
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const health = useNotionHealth()
  const isConnected = health.data?.ok && health.data?.configured

  const activeIndex = boards.findIndex((b) => b.id === activeBoardId)
  const activeBoard = boards[activeIndex]
  const widgets = activeBoard?.widgets ?? []

  function goTo(id: string, dir: 'left' | 'right') {
    setSlideDir(dir)
    setActiveBoard(id)
  }

  function handleAddBoard() {
    if (!newBoardName.trim()) return
    setSlideDir('right')
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

  const prevBoard = boards[activeIndex - 1]
  const nextBoard = boards[activeIndex + 1]

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: '#f5f0eb',
        backgroundImage: 'radial-gradient(circle, #c9bfb5 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* Canvas — key change triggers slide animation */}
      <div
        key={activeBoardId}
        className={`absolute inset-0 ${slideDir === 'right' ? 'board-slide-right' : 'board-slide-left'}`}
      >
        {widgets.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-stone-400 text-base font-medium">This board is empty</p>
            <p className="text-stone-400 text-sm mt-1">
              Click <span className="text-stone-500 font-medium">Add Widget</span> to pin a Notion database
            </p>
          </div>
        )}

        {widgets.map((widget) => (
          <Widget
            key={widget.id}
            id={widget.id}
            title={widget.databaseTitle}
            x={widget.x}
            y={widget.y}
            width={widget.width}
            height={widget.height}
          >
            <DatabaseWidget databaseId={widget.databaseId} />
          </Widget>
        ))}
      </div>

      {/* Bottom toolbar — Figma-style */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-px bg-[#1e1e1e] rounded-xl shadow-2xl px-1 py-1 pointer-events-auto select-none">

        {/* Notion status */}
        {!health.isLoading && (
          <>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                isConnected ? 'text-[#a8d8a8]' : 'text-[#888]'
              }`}
              title={isConnected ? 'Notion connected' : 'Notion not configured'}
            >
              {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{isConnected ? 'Notion' : 'Disconnected'}</span>
            </div>
            <div className="w-px h-5 bg-[#3a3a3a] mx-1" />
          </>
        )}

        {/* Prev board */}
        <button
          onClick={() => prevBoard && goTo(prevBoard.id, 'left')}
          disabled={!prevBoard}
          title={prevBoard ? prevBoard.name : undefined}
          className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Board name — rename mode or display */}
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
            className="w-28 bg-white/10 text-white text-xs text-center rounded-md px-2 py-1 outline-none border border-white/20"
          />
        ) : isNaming ? (
          /* New board name entry */
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
              className="w-28 bg-white/10 text-white text-xs text-center rounded-md px-2 py-1 outline-none border border-white/20 placeholder-white/30"
            />
            <button
              onClick={handleAddBoard}
              className="p-1 rounded text-[#a8d8a8] hover:bg-white/10 transition-colors"
            >
              <Check size={13} />
            </button>
            <button
              onClick={() => { setIsNaming(false); setNewBoardName('') }}
              className="p-1 rounded text-[#888] hover:bg-white/10 transition-colors"
            >
              <XIcon size={13} />
            </button>
          </div>
        ) : (
          /* Board name button — double-click to rename */
          <button
            onDoubleClick={startRename}
            className="px-2 py-1.5 rounded-md text-white text-xs font-medium hover:bg-white/10 transition-colors min-w-[5rem] text-center"
            title="Double-click to rename"
          >
            {activeBoard?.name ?? 'Board'}
          </button>
        )}

        {/* Next board */}
        <button
          onClick={() => nextBoard && goTo(nextBoard.id, 'right')}
          disabled={!nextBoard}
          title={nextBoard ? nextBoard.name : undefined}
          className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>

        {/* New board */}
        <button
          onClick={() => !isNaming && setIsNaming(true)}
          title="New board"
          className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-white/10 transition-colors"
        >
          <Plus size={13} />
        </button>

        <div className="w-px h-5 bg-[#3a3a3a] mx-1" />

        {/* Add widget */}
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/10 active:bg-white/15 transition-colors"
        >
          <Plus size={14} />
          Add Widget
        </button>
      </div>

      {showPicker && <DatabasePicker onClose={() => setShowPicker(false)} />}
    </div>
  )
}
