import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useNotionPages, useUpdatePage, useCreatePage } from '../../hooks/useNotion'
import { Divider, Icon, Input, Text } from '../../ui/web'

const DB_ID = '325b3daa10f0805fb7f1d1e230ee477f'

function getTitle(page: any): string {
  return page.properties.Name?.title?.map((t: any) => t.plain_text).join('') ?? ''
}

function getStatus(page: any): string {
  return page.properties.Status?.status?.name ?? 'Not started'
}

export function TasksWidget({ widgetId: _ }: { widgetId: string }) {
  const { data, isLoading, error } = useNotionPages(DB_ID)
  const updatePage = useUpdatePage(DB_ID)
  const createPage = useCreatePage(DB_ID)

  const [newTask, setNewTask]   = useState('')
  const [isAdding, setIsAdding] = useState(false)

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Text variant="caption" color="muted">Loading…</Text></div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full"><Text variant="caption" color="danger">{(error as Error).message}</Text></div>
  }

  const pages: any[] = data?.results ?? []
  const active = pages.filter((p) => getStatus(p) !== 'Done')
  const done   = pages.filter((p) => getStatus(p) === 'Done')

  function markDone(pageId: string) {
    updatePage.mutate({ pageId, properties: { Status: { status: { name: 'Done' } } } })
  }

  function markUndone(pageId: string) {
    updatePage.mutate({ pageId, properties: { Status: { status: { name: 'Not started' } } } })
  }

  function addTask() {
    if (!newTask.trim()) return
    createPage.mutate({ Name: { title: [{ text: { content: newTask.trim() } }] } })
    setNewTask('')
    setIsAdding(false)
  }

  return (
    <div className="flex flex-col h-full select-none" style={{ color: 'var(--wt-text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <Text variant="label" color="muted">{active.length} remaining</Text>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--wt-accent)' }}
        >
          <Icon icon={Plus} size={13} /> Add
        </button>
      </div>

      <Divider />

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {active.length === 0 && !isAdding && (
          <div className="flex items-center justify-center h-full">
            <Text variant="caption" color="muted">All done!</Text>
          </div>
        )}

        {active.map((page) => (
          <button
            key={page.id}
            onClick={() => markDone(page.id)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors hover:opacity-80 group"
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-current"
              style={{ borderColor: 'var(--wt-accent)' }}
            />
            <Text variant="body" size="small" className="flex-1 truncate">
              {getTitle(page) || <span style={{ color: 'var(--wt-text-muted)' }}>Untitled</span>}
            </Text>
          </button>
        ))}

        {done.map((page) => (
          <button
            key={page.id}
            onClick={() => markUndone(page.id)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors hover:opacity-80"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--wt-accent)' }}
            >
              <Icon icon={Check} size={11} className="text-white" />
            </div>
            <Text variant="body" size="small" color="muted" className="flex-1 truncate line-through opacity-40">
              {getTitle(page)}
            </Text>
          </button>
        ))}
      </div>

      {/* Add input */}
      {isAdding && (
        <>
          <Divider />
          <div className="px-3 py-2 flex-shrink-0">
            <Input
              autoFocus
              type="text"
              placeholder="New task…"
              value={newTask}
              size="sm"
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  addTask()
                if (e.key === 'Escape') { setIsAdding(false); setNewTask('') }
              }}
              onBlur={() => { if (!newTask.trim()) setIsAdding(false) }}
              style={{ background: 'var(--wt-surface)', borderColor: 'var(--wt-accent)' }}
            />
            <Text variant="caption" size="small" color="muted" className="mt-1">
              Enter to save · Esc to cancel
            </Text>
          </div>
        </>
      )}
    </div>
  )
}
