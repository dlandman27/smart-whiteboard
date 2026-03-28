import { useState, useRef, useEffect } from 'react'
import { Icon } from '../../ui/web'
import { useNotionPages, useUpdatePage, useCreatePage, useArchivePage } from '../../hooks/useNotion'
import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol, FlexRow, Box, Center, ScrollArea } from '../../ui/layouts'
import { Text } from '../../ui/web'

export interface TasksWidgetSettings { databaseId: string }
export const TASKS_DEFAULTS: TasksWidgetSettings = { databaseId: '' }

function getTitle(page: any): string {
  return page.properties.Name?.title?.map((t: any) => t.plain_text).join('') ?? ''
}
function isDone(page: any): boolean {
  return page.properties.Status?.status?.name === 'Done'
}

export function TasksWidget({ widgetId }: { widgetId: string }) {
  const [settings]          = useWidgetSettings<TasksWidgetSettings>(widgetId, TASKS_DEFAULTS)
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding]  = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const inputRef             = useRef<HTMLInputElement>(null)

  const { data, isLoading, error } = useNotionPages(settings.databaseId)
  const updatePage = useUpdatePage(settings.databaseId)
  const createPage = useCreatePage(settings.databaseId)
  const archivePage = useArchivePage(settings.databaseId)

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 0)
  }, [adding])

  if (!settings.databaseId) return (
    <Center fullHeight>
      <Text variant="caption" color="muted">Set your Notion database ID in settings</Text>
    </Center>
  )
  if (isLoading) return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  if (error)     return <Center fullHeight><Text variant="caption" color="danger">{(error as Error).message}</Text></Center>

  const pages: any[] = data?.results ?? []
  const active = pages.filter((p) => !isDone(p))
  const done   = pages.filter((p) =>  isDone(p))

  function toggleDone(page: any) {
    updatePage.mutate({
      pageId:     page.id,
      properties: { Status: { status: { name: isDone(page) ? 'Not started' : 'Done' } } },
    })
  }

  function deleteTask(pageId: string) {
    archivePage.mutate(pageId)
  }

  function submitAdd() {
    const text = newTask.trim()
    if (!text) { setAdding(false); return }
    createPage.mutate({ Name: { title: [{ text: { content: text } }] } })
    setNewTask('')
    setAdding(false)
  }

  return (
    <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>

      {/* Header */}
      <FlexRow align="center" justify="between" className="px-4 pt-3 pb-2 flex-shrink-0">
        <Text variant="label" color="muted" style={{ fontSize: 12 }}>
          {active.length} remaining
        </Text>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setAdding(true)}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            4,
            padding:        '4px 10px',
            borderRadius:   99,
            fontSize:       12,
            fontWeight:     600,
            background:     'var(--wt-accent)',
            color:          'var(--wt-accent-text)',
            border:         'none',
            cursor:         'pointer',
          }}
        >
          <Icon icon="Plus" size={12} />
          Add
        </button>
      </FlexRow>

      <Box style={{ height: 1, background: 'var(--wt-border)', flexShrink: 0 }} />

      {/* Add input */}
      {adding && (
        <FlexRow
          align="center"
          className="px-4 py-2 flex-shrink-0"
          style={{ gap: 8, borderBottom: '1px solid var(--wt-border)' }}
        >
          <input
            ref={inputRef}
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  submitAdd()
              if (e.key === 'Escape') { setAdding(false); setNewTask('') }
            }}
            onBlur={submitAdd}
            placeholder="New task…"
            style={{
              flex:        1,
              background:  'transparent',
              border:      'none',
              outline:     'none',
              fontSize:    13,
              color:       'var(--wt-text)',
              fontFamily:  'inherit',
            }}
          />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setAdding(false); setNewTask('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)', lineHeight: 1 }}
          >
            <Icon icon="X" size={13} />
          </button>
        </FlexRow>
      )}

      {/* Task list */}
      <ScrollArea style={{ flex: 1 }}>
        <FlexCol style={{ padding: '6px 8px', gap: 1 }}>

          {active.length === 0 && !adding && (
            <Center style={{ padding: '24px 0' }}>
              <Text variant="caption" color="muted">All done!</Text>
            </Center>
          )}

          {active.map((page) => (
            <TaskRow
              key={page.id}
              title={getTitle(page)}
              done={false}
              hovered={hoverId === page.id}
              onHover={() => setHoverId(page.id)}
              onLeave={() => setHoverId(null)}
              onToggle={() => toggleDone(page)}
              onDelete={() => deleteTask(page.id)}
            />
          ))}

          {done.length > 0 && (
            <>
              <Box style={{ height: 1, background: 'var(--wt-border)', margin: '6px 8px' }} />
              {done.map((page) => (
                <TaskRow
                  key={page.id}
                  title={getTitle(page)}
                  done
                  hovered={hoverId === page.id}
                  onHover={() => setHoverId(page.id)}
                  onLeave={() => setHoverId(null)}
                  onToggle={() => toggleDone(page)}
                  onDelete={() => deleteTask(page.id)}
                />
              ))}
            </>
          )}
        </FlexCol>
      </ScrollArea>
    </FlexCol>
  )
}

function TaskRow({ title, done, hovered, onHover, onLeave, onToggle, onDelete }: {
  title: string; done: boolean; hovered: boolean
  onHover: () => void; onLeave: () => void
  onToggle: () => void; onDelete: () => void
}) {
  return (
    <FlexRow
      align="center"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        gap:          8,
        padding:      '6px 8px',
        borderRadius: 10,
        background:   hovered ? 'var(--wt-surface-hover)' : 'transparent',
        transition:   'background 0.1s',
      }}
    >
      {/* Checkbox */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        style={{
          width:          18,
          height:         18,
          borderRadius:   5,
          flexShrink:     0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          border:         done ? 'none' : '2px solid var(--wt-border-active)',
          background:     done ? 'var(--wt-accent)' : 'transparent',
          cursor:         'pointer',
          transition:     'all 0.15s',
        }}
      >
        {done && <Icon icon="Check" size={10} style={{ color: 'var(--wt-accent-text)' }} weight="bold" />}
      </button>

      {/* Title */}
      <Text
        variant="body"
        size="small"
        style={{
          flex:           1,
          overflow:       'hidden',
          textOverflow:   'ellipsis',
          whiteSpace:     'nowrap',
          opacity:        done ? 0.35 : 1,
          textDecoration: done ? 'line-through' : 'none',
          transition:     'opacity 0.15s',
        }}
      >
        {title || <span style={{ opacity: 0.4 }}>Untitled</span>}
      </Text>

      {/* Delete */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        style={{
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          color:      'var(--wt-text-muted)',
          opacity:    hovered ? 0.6 : 0.2,
          transition: 'opacity 0.15s',
          lineHeight: 1,
          padding:    2,
          flexShrink: 0,
        }}
      >
        <Icon icon="X" size={12} />
      </button>
    </FlexRow>
  )
}
