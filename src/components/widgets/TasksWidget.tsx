import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useNotionPages, useUpdatePage, useCreatePage } from '../../hooks/useNotion'
import { Button, Divider, Icon, Input, Text } from '../../ui/web'
import { FlexCol, FlexRow, Box, Center, ScrollArea } from '../../ui/layouts'
import { useWidgetSettings } from '@whiteboard/sdk'

export interface TasksWidgetSettings {
  databaseId: string
}

export const TASKS_DEFAULTS: TasksWidgetSettings = {
  databaseId: '',
}

function getTitle(page: any): string {
  return page.properties.Name?.title?.map((t: any) => t.plain_text).join('') ?? ''
}

function getStatus(page: any): string {
  return page.properties.Status?.status?.name ?? 'Not started'
}

export function TasksWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<TasksWidgetSettings>(widgetId, TASKS_DEFAULTS)
  const { data, isLoading, error } = useNotionPages(settings.databaseId)
  const updatePage = useUpdatePage(settings.databaseId)
  const createPage = useCreatePage(settings.databaseId)

  const [newTask, setNewTask]   = useState('')
  const [isAdding, setIsAdding] = useState(false)

  if (!settings.databaseId) {
    return <Center fullHeight><Text variant="caption" color="muted">Set your Notion database ID in settings</Text></Center>
  }

  if (isLoading) {
    return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  }

  if (error) {
    return <Center fullHeight><Text variant="caption" color="danger">{(error as Error).message}</Text></Center>
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
    <FlexCol fullHeight noSelect style={{ color: 'var(--wt-text)' }}>
      {/* Header */}
      <FlexRow align="center" justify="between" className="px-4 py-3 flex-shrink-0">
        <Text variant="label" color="muted">{active.length} remaining</Text>
        <Button
          variant="accent"
          size="sm"
          iconLeft={<Icon icon={Plus} size={13} />}
          onClick={() => setIsAdding(true)}
        >
          Add
        </Button>
      </FlexRow>

      <Divider />

      {/* Task list */}
      <ScrollArea className="px-3 py-2 space-y-1">
        {active.length === 0 && !isAdding && (
          <Center fullHeight>
            <Text variant="caption" color="muted">All done!</Text>
          </Center>
        )}

        {active.map((page) => (
          <button
            key={page.id}
            onClick={() => markDone(page.id)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors hover:opacity-80 group"
          >
            <Box
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-current"
              style={{ borderColor: 'var(--wt-accent)' }}
            />
            <Text variant="body" size="small" className="flex-1 truncate">
              {getTitle(page) || <Text as="span" color="muted">Untitled</Text>}
            </Text>
          </button>
        ))}

        {done.map((page) => (
          <button
            key={page.id}
            onClick={() => markUndone(page.id)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors hover:opacity-80"
          >
            <Box
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--wt-accent)' }}
            >
              <Icon icon={Check} size={11} className="text-white" />
            </Box>
            <Text variant="body" size="small" color="muted" className="flex-1 truncate line-through opacity-40">
              {getTitle(page)}
            </Text>
          </button>
        ))}
      </ScrollArea>

      {/* Add input */}
      {isAdding && (
        <>
          <Divider />
          <Box className="px-3 py-2 flex-shrink-0">
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
          </Box>
        </>
      )}
    </FlexCol>
  )
}
