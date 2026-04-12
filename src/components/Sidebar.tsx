import { useState, useRef } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'
import { DEFAULT_SETTINGS_ID, DEFAULT_CONNECTORS_ID, DEFAULT_TODAY_ID, DEFAULT_TODO_ID } from '../store/whiteboard'
import { Logo } from './Logo'

type AddStep = 'idle' | 'name-board'

export function Sidebar() {
  const { boards, activeBoardId, setActiveBoardManual, addBoard, removeBoard, reorderBoards } = useWhiteboardStore()
  const setActiveBoard = setActiveBoardManual
  const toggleDisplayMode = useUIStore((s) => s.toggleDisplayMode)

  const dragIndex   = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const [collapsed, setCollapsed] = useState(false)
  const [addStep,   setAddStep]   = useState<AddStep>('idle')
  const [newName,   setNewName]   = useState('')

  // System boards
  const settingsBoard   = boards.find((b) => b.boardType === 'settings')
  const connectorsBoard = boards.find((b) => b.boardType === 'connectors')
  const todayBoard      = boards.find((b) => b.boardType === 'today')
  const calendarBoard   = boards.find((b) => b.boardType === 'calendar')
  const todoBoard       = boards.find((b) => b.boardType === 'todo')

  const settingsId   = settingsBoard?.id   ?? DEFAULT_SETTINGS_ID
  const connectorsId = connectorsBoard?.id ?? DEFAULT_CONNECTORS_ID
  const todayId      = todayBoard?.id      ?? DEFAULT_TODAY_ID
  const calendarId   = calendarBoard?.id   ?? ''
  const todoId       = todoBoard?.id       ?? DEFAULT_TODO_ID

  const isSettingsActive   = activeBoardId === settingsId
  const isConnectorsActive = activeBoardId === connectorsId
  const isTodayActive      = activeBoardId === todayId
  const isCalendarActive   = activeBoardId === calendarId
  const isTodoActive       = activeBoardId === todoId

  // Only user-created boards
  const visibleBoards = boards.filter((b) => !b.boardType)

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

      {/* Top nav — Today + Calendar */}
      <div className="px-2 pt-2 pb-1 flex flex-col gap-0.5">
        <NavBtn
          icon="Sun"
          label="Today"
          collapsed={collapsed}
          active={isTodayActive}
          onClick={() => setActiveBoard(todayId)}
        />
        <NavBtn
          icon="CalendarBlank"
          label="Calendar"
          collapsed={collapsed}
          active={isCalendarActive}
          onClick={() => calendarId && setActiveBoard(calendarId)}
        />
        <NavBtn
          icon="CheckSquare"
          label="Todo"
          collapsed={collapsed}
          active={isTodoActive}
          onClick={() => setActiveBoard(todoId)}
        />
      </div>

      <div className="mx-3 flex-shrink-0" style={{ height: 1, background: 'var(--wt-border)' }} />

      {/* Boards list */}
      <div className="flex-1 overflow-y-auto pt-2 px-2 flex flex-col gap-0.5">
        {!collapsed && (
          <span className="px-1.5 pb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-text-muted)', opacity: 0.6 }}>
            Boards
          </span>
        )}

        {visibleBoards.map((board, index) => {
          const isActive     = board.id === activeBoardId
          const initial      = board.name.charAt(0).toUpperCase()
          const isDropTarget = dragOver === index && dragIndex.current !== index
          const canDelete    = visibleBoards.length > 1

          return (
            <div
              key={board.id}
              draggable
              className="group"
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
                borderTop:  isDropTarget ? '2px solid var(--wt-accent)' : '2px solid transparent',
                transition: 'border-color 0.1s',
              }}
            >
              <div
                className={`w-full flex items-center rounded-lg py-1.5 transition-all ${collapsed ? 'justify-center' : 'gap-2.5 px-1.5'}`}
                style={{ background: isActive ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent' }}
              >
                <button
                  onClick={() => setActiveBoard(board.id)}
                  title={collapsed ? board.name : undefined}
                  className={`flex items-center text-left flex-1 min-w-0 ${collapsed ? 'justify-center' : 'gap-2.5'}`}
                  style={{ background: 'none', border: 'none', cursor: 'grab', padding: 0 }}
                >
                  <span
                    className="flex-shrink-0 flex items-center justify-center rounded-md text-xs font-bold"
                    style={{
                      width:      26,
                      height:     26,
                      background: isActive
                        ? 'var(--wt-accent)'
                        : board.background
                          ? board.background.bg
                          : 'color-mix(in srgb, var(--wt-text) 12%, transparent)',
                      color:      isActive ? '#fff' : 'var(--wt-text)',
                      border:     `1px solid ${isActive ? 'transparent' : 'color-mix(in srgb, var(--wt-text) 15%, transparent)'}`,
                    }}
                  >
                    {initial}
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

                {!collapsed && canDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBoard(board.id) }}
                    title="Delete board"
                    className="flex-shrink-0 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      width:      22,
                      height:     22,
                      background: 'none',
                      border:     'none',
                      cursor:     'pointer',
                      color:      'var(--wt-text-muted)',
                    }}
                    onPointerEnter={(e) => { e.currentTarget.style.color = 'var(--wt-danger)' }}
                    onPointerLeave={(e) => { e.currentTarget.style.color = 'var(--wt-text-muted)' }}
                  >
                    <Icon icon="Trash" size={13} />
                  </button>
                )}
              </div>
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

      {/* Bottom nav — Connectors + Settings */}
      <div className="px-2 pt-1.5 pb-2 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--wt-border)' }}>
        <NavBtn
          icon="Plugs"
          label="Connectors"
          collapsed={collapsed}
          active={isConnectorsActive}
          onClick={() => setActiveBoard(connectorsId)}
        />
        <NavBtn
          icon="Gear"
          label="Settings"
          collapsed={collapsed}
          active={isSettingsActive}
          onClick={() => setActiveBoard(settingsId)}
        />
        <NavBtn
          icon="Monitor"
          label="Display Mode"
          collapsed={collapsed}
          active={false}
          onClick={toggleDisplayMode}
        />
      </div>
    </div>
  )
}

function NavBtn({
  icon, label, collapsed, active, onClick, disabled,
}: {
  icon: string; label: string; collapsed: boolean; active: boolean; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={collapsed ? label : undefined}
      disabled={disabled}
      className={`w-full flex items-center rounded-lg py-2 transition-all text-left ${collapsed ? 'justify-center' : 'gap-3 px-2'} ${disabled ? 'cursor-not-allowed' : 'hover:opacity-80'}`}
      style={{
        color:      'var(--wt-text)',
        background: active ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
        opacity:    disabled ? 0.35 : 1,
      }}
    >
      <Icon
        icon={icon}
        size={18}
        style={{
          opacity:    active ? 1 : 0.75,
          flexShrink: 0,
          color:      active ? 'var(--wt-accent)' : undefined,
        }}
      />
      {!collapsed && (
        <span
          className="text-sm font-medium"
          style={{ color: active ? 'var(--wt-text)' : undefined }}
        >
          {label}
        </span>
      )}
    </button>
  )
}
