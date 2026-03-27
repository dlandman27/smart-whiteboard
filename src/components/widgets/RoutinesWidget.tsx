import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { useNotionPages, usePageBlocks, useUpdateBlock } from '../../hooks/useNotion'
import { Text, Icon } from '../../ui/web'
import { FlexCol, FlexRow, Box, Center, ScrollArea } from '../../ui/layouts'
import { useWidgetSettings } from '@whiteboard/sdk'

export interface RoutinesWidgetSettings {
  databaseId: string
}

export const ROUTINES_DEFAULTS: RoutinesWidgetSettings = {
  databaseId: '',
}

function formatTodayTitle(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
}

function getDayAndDate(): { day: string; date: string } {
  const now = new Date()
  return {
    day:  now.toLocaleDateString('en-US', { weekday: 'long' }),
    date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
  }
}

interface Task {
  id:      string
  text:    string
  checked: boolean
}

interface Section {
  key:     string
  heading: string
  tasks:   Task[]
}

function parseBlocks(blocks: any[]): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const block of blocks) {
    const type = block.type as string
    if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
      const text = block[type]?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
      current = { key: block.id, heading: text, tasks: [] }
      sections.push(current)
    } else if (type === 'to_do' && current) {
      current.tasks.push({
        id:      block.id,
        text:    block.to_do.rich_text.map((t: any) => t.plain_text).join('') || 'Untitled',
        checked: block.to_do.checked,
      })
    }
  }

  return sections
}


// ── Widget ────────────────────────────────────────────────────────────────────

export function RoutinesWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<RoutinesWidgetSettings>(widgetId, ROUTINES_DEFAULTS)
  const todayTitle          = formatTodayTitle()
  const { day, date }       = getDayAndDate()

  const { data: pagesData, isLoading: loadingPages, error: pagesError } = useNotionPages(settings.databaseId)

  const todayPage = useMemo(() => {
    if (!pagesData?.results) return null
    return pagesData.results.find((p: any) => {
      const title = p.properties.Date?.title?.map((t: any) => t.plain_text).join('') ?? ''
      return title === todayTitle
    }) ?? null
  }, [pagesData, todayTitle])

  const { data: blocksData, isLoading: loadingBlocks, error: blocksError } = usePageBlocks(todayPage?.id ?? '')
  const updateBlock = useUpdateBlock(todayPage?.id ?? '')

  const sections = useMemo(() => {
    if (!blocksData?.results) return []
    return parseBlocks(blocksData.results)
  }, [blocksData])

  const totalTasks = sections.reduce((s, sec) => s + sec.tasks.length, 0)
  const doneTasks  = sections.reduce((s, sec) => s + sec.tasks.filter((t) => t.checked).length, 0)
  const allDone    = totalTasks > 0 && doneTasks === totalTasks
  const pct        = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0

  function toggleTask(blockId: string, checked: boolean) {
    updateBlock.mutate({ blockId, data: { to_do: { checked: !checked } } })
  }

  if (!settings.databaseId) {
    return <Center fullHeight><Text variant="caption" color="muted">Set your Notion database ID in settings</Text></Center>
  }

  if (loadingPages || loadingBlocks) {
    return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  }

  if (pagesError || blocksError) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="danger">
          {((pagesError ?? blocksError) as Error).message}
        </Text>
      </Center>
    )
  }

  if (!todayPage) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">No entry for {todayTitle}</Text>
      </Center>
    )
  }

  return (
    <FlexCol fullHeight fullWidth noSelect style={{ color: 'var(--wt-text)' }}>

      {/* ── Header ── */}
      <FlexCol className="px-4 pt-3 pb-0 flex-shrink-0" style={{ gap: 6 }}>
        <FlexRow align="center" justify="between">
          <FlexCol style={{ gap: 1 }}>
            <Text variant="heading" size="medium" style={{ fontWeight: 600, lineHeight: 1.2 }}>
              {allDone ? '🎉 All done' : day}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
              {allDone ? 'Great work today' : date}
            </Text>
          </FlexCol>
          <Text
            variant="label"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-text-muted)' }}
          >
            {doneTasks}<span style={{ opacity: 0.4 }}> / {totalTasks}</span>
          </Text>
        </FlexRow>

        {/* Progress bar */}
        <Box
          style={{
            height: 3,
            borderRadius: 99,
            background: 'var(--wt-border)',
            overflow: 'hidden',
          }}
        >
          <Box
            style={{
              height: '100%',
              width: `${pct}%`,
              minWidth: pct > 0 ? 6 : 0,
              borderRadius: 99,
              background: 'var(--wt-accent)',
              transition: 'width 0.4s ease',
            }}
          />
        </Box>
      </FlexCol>

      {/* Divider */}
      <Box className="flex-shrink-0 mt-3" style={{ borderBottom: '1px solid var(--wt-border)' }} />

      {/* ── Sections ── */}
      <ScrollArea className="w-full">
        <FlexCol fullWidth flex1 className="py-2">
          {sections.map((section, si) => {
            const secDone  = section.tasks.filter((t) => t.checked).length
            const secTotal = section.tasks.length

            return (
              <Box key={section.key}>
                {/* Section divider */}
                <FlexRow
                  align="center"
                  justify="between"
                  className="px-4 py-2"
                  style={{
                    marginTop: si > 0 ? 4 : 0,
                  }}
                >
                  <Text
                    variant="label"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--wt-text-muted)',
                    }}
                  >
                    {section.heading}
                  </Text>
                  <Box
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: 99,
                      background: secDone === secTotal && secTotal > 0
                        ? 'var(--wt-accent)'
                        : 'var(--wt-border)',
                      color: secDone === secTotal && secTotal > 0
                        ? 'var(--wt-accent-text)'
                        : 'var(--wt-text-muted)',
                      transition: 'background 0.3s, color 0.3s',
                    }}
                  >
                    {secDone}/{secTotal}
                  </Box>
                </FlexRow>

                {/* Tasks */}
                <FlexCol>
                  {section.tasks.map((task) => (
                    <button
                      key={task.id}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => toggleTask(task.id, task.checked)}
                      className="w-full flex items-center gap-3 px-4 text-left transition-colors"
                      style={{
                        paddingTop: 7,
                        paddingBottom: 7,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Checkbox */}
                      <Box
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.15s, border-color 0.15s',
                          ...(task.checked
                            ? { background: 'var(--wt-accent)', border: '2px solid var(--wt-accent)' }
                            : { background: 'transparent', border: '2px solid var(--wt-border-active)' }
                          ),
                        }}
                      >
                        {task.checked && <Icon icon={Check} size={10} style={{ color: 'var(--wt-accent-text)' }} />}
                      </Box>

                      {/* Label */}
                      <Text
                        variant="body"
                        size="small"
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'opacity 0.15s',
                          opacity: task.checked ? 0.35 : 1,
                          textDecoration: task.checked ? 'line-through' : 'none',
                        }}
                      >
                        {task.text}
                      </Text>
                    </button>
                  ))}
                </FlexCol>
              </Box>
            )
          })}
        </FlexCol>
      </ScrollArea>

    </FlexCol>
  )
}
