import { useState, useRef } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore } from '../store/whiteboard'
import { Logo } from './Logo'

type AddStep = 'idle' | 'name-board'

interface Props {
  onOpenCustomize: () => void
  onOpenSettings:  () => void
}

export function Sidebar({ onOpenCustomize, onOpenSettings }: Props) {
  const { boards, activeBoardId, setActiveBoard, addBoard, reorderBoards } = useWhiteboardStore()

  const dragIndex   = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const [collapsed, setCollapsed] = useState(false)
  const [addStep,   setAddStep]   = useState<AddStep>('idle')
  const [newName,   setNewName]   = useState('')

  function handleAdd() {
    if (!newName.trim()) return
    addBoard(newName.trim())
    setNewName('')
    setAddStep('idle')
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 h-full transition-[width] duration-200 overflow-hidden"
      style={{
        width:      collapsed ? 56 : 200,
        background: 'var(--wt-bg)',
      }}
    >
      {/* Brand */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`flex items-center h-12 flex-shrink-0 hover:opacity-70 transition-opacity ${collapsed ? 'justify-center' : 'gap-2.5 px-4'}`}
      >
        <Logo size={20} />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight truncate" style={{ color: 'var(--wt-text)' }}>
            wiigit
          </span>
        )}
      </button>

      <div className="mx-3 flex-shrink-0" style={{ height: 1, background: 'var(--wt-border)' }} />

      {/* Boards list */}
      <div className="flex-1 overflow-y-auto pt-3 px-2 flex flex-col gap-0.5">
        {!collapsed && (
          <span className="px-1.5 pb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-text-muted)', opacity: 0.6 }}>
            Boards
          </span>
        )}

        {boards.map((board, index) => {
          const isActive   = board.id === activeBoardId
          const isCalendar = (board as any).boardType === 'calendar'
          const initial    = board.name.charAt(0).toUpperCase()
          const isDropTarget = dragOver === index && dragIndex.current !== index

          return (
            <div
              key={board.id}
              draggable
              onDragStart={() => { dragIndex.current = index }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(index) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragIndex.current !== null && dragIndex.current !== index) {
                  reorderBoards(dragIndex.current, index)
                }
                dragIndex.current = null
                setDragOver(null)
              }}
              onDragEnd={() => { dragIndex.current = null; setDragOver(null) }}
              style={{
                borderTop: isDropTarget ? '2px solid var(--wt-accent)' : '2px solid transparent',
                transition: 'border-color 0.1s',
              }}
            >
              <button
                onClick={() => setActiveBoard(board.id)}
                title={collapsed ? board.name : undefined}
                className={`w-full flex items-center rounded-lg py-1.5 text-left transition-all ${collapsed ? 'justify-center' : 'gap-2.5 px-1.5'}`}
                style={{
                  background: isActive ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
                  cursor: 'grab',
                }}
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-md text-xs font-bold"
                  style={{
                    width:      26,
                    height:     26,
                    background: isActive
                      ? 'var(--wt-accent)'
                      : 'color-mix(in srgb, var(--wt-text) 12%, transparent)',
                    color:      isActive ? '#fff' : 'var(--wt-text)',
                    border:     `1px solid ${isActive ? 'transparent' : 'color-mix(in srgb, var(--wt-text) 15%, transparent)'}`,
                  }}
                >
                  {isCalendar ? <Icon icon="CalendarBlank" size={13} /> : initial}
                </span>
                {!collapsed && (
                  <span
                    className="text-sm font-medium truncate flex-1"
                    style={{ color: isActive ? 'var(--wt-text)' : 'color-mix(in srgb, var(--wt-text) 70%, transparent)' }}
                  >
                    {board.name}
                  </span>
                )}
              </button>
            </div>
          )
        })}

        {addStep === 'name-board' && (
          <div className="px-1 py-0.5">
            <input
              autoFocus
              placeholder="Board name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleAdd()
                if (e.key === 'Escape') { setAddStep('idle'); setNewName('') }
              }}
              onBlur={() => { if (!newName.trim()) setAddStep('idle') }}
              className="wt-input w-full text-xs px-2 py-1.5 rounded-md"
            />
          </div>
        )}

        {addStep === 'idle' && (
          <button
            onClick={() => collapsed ? addBoard('Board') : setAddStep('name-board')}
            title={collapsed ? 'New board' : undefined}
            className={`w-full flex items-center rounded-lg py-1.5 transition-opacity hover:opacity-70 ${collapsed ? 'justify-center' : 'gap-2.5 px-1.5'}`}
            style={{ color: 'color-mix(in srgb, var(--wt-text) 40%, transparent)' }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 26, height: 26 }}>
              <Icon icon="Plus" size={15} />
            </span>
            {!collapsed && <span className="text-sm">New board</span>}
          </button>
        )}
      </div>

      {/* Bottom nav — Customize + Settings */}
      <div className="px-2 pt-1.5 pb-2 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--wt-border)' }}>
        <NavBtn icon="Palette" label="Customize" collapsed={collapsed} onClick={onOpenCustomize} />
        <NavBtn icon="Gear"    label="Settings"  collapsed={collapsed} onClick={onOpenSettings}  />
      </div>
    </div>
  )
}

function NavBtn({
  icon, label, collapsed, onClick,
}: {
  icon: string; label: string; collapsed: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center rounded-lg py-2 transition-all hover:opacity-80 text-left ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}
      style={{
        color:      'var(--wt-text)',
        background: 'transparent',
      }}
    >
      <Icon icon={icon} size={18} style={{ opacity: 0.75, flexShrink: 0 }} />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  )
}
