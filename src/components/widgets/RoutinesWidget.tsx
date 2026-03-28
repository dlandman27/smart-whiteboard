import { useMemo } from 'react'
import { Icon } from '../../ui/web'
import { useNotionPages, usePageBlocks, useUpdateBlock } from '../../hooks/useNotion'
import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol, FlexRow, Box, Center, ScrollArea } from '../../ui/layouts'
import { Text } from '../../ui/web'

export interface RoutinesWidgetSettings { databaseId: string }
export const ROUTINES_DEFAULTS: RoutinesWidgetSettings = { databaseId: '' }

function formatTodayTitle(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

interface Task    { id: string; text: string; checked: boolean }
interface Section { key: string; heading: string; tasks: Task[] }

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

export function RoutinesWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<RoutinesWidgetSettings>(widgetId, ROUTINES_DEFAULTS)
  const todayTitle = formatTodayTitle()

  const { data: pagesData,  isLoading: loadingPages,  error: pagesError  } = useNotionPages(settings.databaseId)
  const todayPage = useMemo(() => {
    if (!pagesData?.results) return null
    return pagesData.results.find((p: any) =>
      p.properties.Date?.title?.map((t: any) => t.plain_text).join('') === todayTitle
    ) ?? null
  }, [pagesData, todayTitle])

  const { data: blocksData, isLoading: loadingBlocks, error: blocksError } = usePageBlocks(todayPage?.id ?? '')
  const updateBlock = useUpdateBlock(todayPage?.id ?? '')

  const sections = useMemo(() => {
    if (!blocksData?.results) return []
    return parseBlocks(blocksData.results)
  }, [blocksData])

  const totalTasks = sections.reduce((s, sec) => s + sec.tasks.length, 0)
  const doneTasks  = sections.reduce((s, sec) => s + sec.tasks.filter((t) => t.checked).length, 0)
  const pct        = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0
  const allDone    = totalTasks > 0 && doneTasks === totalTasks

  const now  = new Date()
  const day  = now.toLocaleDateString('en-US', { weekday: 'long' })
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  if (!settings.databaseId) return (
    <Center fullHeight><Text variant="caption" color="muted">Set your Notion database ID in settings</Text></Center>
  )
  if (loadingPages || loadingBlocks) return (
    <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  )
  if (pagesError || blocksError) return (
    <Center fullHeight>
      <Text variant="caption" color="danger">{((pagesError ?? blocksError) as Error).message}</Text>
    </Center>
  )
  if (!todayPage) return (
    <Center fullHeight><Text variant="caption" color="muted">No entry for {todayTitle}</Text></Center>
  )

  return (
    <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>

      {/* Header */}
      <FlexCol className="px-4 pt-3 pb-3 flex-shrink-0" style={{ gap: 10 }}>
        <FlexRow align="center" justify="between">
          <FlexCol style={{ gap: 2 }}>
            <Text variant="heading" size="medium" style={{ fontWeight: 700, lineHeight: 1 }}>
              {allDone ? '🎉 All done' : day}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
              {allDone ? 'Great work today' : date}
            </Text>
          </FlexCol>

          {/* Progress ring */}
          <Box style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
            <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--wt-border)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="14" fill="none"
                stroke="var(--wt-accent)" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={`${2 * Math.PI * 14 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
            <Box style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text variant="label" style={{ fontSize: 9, fontWeight: 700 }}>
                {doneTasks}/{totalTasks}
              </Text>
            </Box>
          </Box>
        </FlexRow>

        {/* Progress bar */}
        <Box style={{ height: 3, borderRadius: 99, background: 'var(--wt-border)', overflow: 'hidden' }}>
          <Box style={{
            height: '100%', width: `${pct}%`,
            minWidth: pct > 0 ? 6 : 0,
            borderRadius: 99, background: 'var(--wt-accent)',
            transition: 'width 0.4s ease',
          }} />
        </Box>
      </FlexCol>

      <Box style={{ height: 1, background: 'var(--wt-border)', flexShrink: 0 }} />

      {/* Sections */}
      <ScrollArea style={{ flex: 1 }}>
        <FlexCol style={{ padding: '4px 0 8px' }}>
          {sections.map((section, si) => {
            const secDone  = section.tasks.filter((t) => t.checked).length
            const secTotal = section.tasks.length
            const secAllDone = secTotal > 0 && secDone === secTotal

            return (
              <Box key={section.key}>
                {/* Section header */}
                <FlexRow
                  align="center" justify="between"
                  style={{ padding: si === 0 ? '8px 16px 4px' : '12px 16px 4px' }}
                >
                  <Text variant="label" style={{
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--wt-text-muted)',
                  }}>
                    {section.heading}
                  </Text>
                  <Box style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '1px 8px', borderRadius: 99,
                    background: secAllDone ? 'var(--wt-accent)' : 'var(--wt-border)',
                    color: secAllDone ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
                    transition: 'background 0.3s, color 0.3s',
                  }}>
                    {secDone}/{secTotal}
                  </Box>
                </FlexRow>

                {/* Tasks */}
                <FlexCol style={{ gap: 1, padding: '0 8px' }}>
                  {section.tasks.map((task) => (
                    <button
                      key={task.id}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => updateBlock.mutate({ blockId: task.id, data: { to_do: { checked: !task.checked } } })}
                      style={{
                        display:     'flex',
                        alignItems:  'center',
                        gap:         10,
                        padding:     '7px 8px',
                        borderRadius: 10,
                        background:  'transparent',
                        border:      'none',
                        cursor:      'pointer',
                        width:       '100%',
                        textAlign:   'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Checkbox */}
                      <Box style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                        ...(task.checked
                          ? { background: 'var(--wt-accent)', border: 'none' }
                          : { background: 'transparent', border: '2px solid var(--wt-border-active)' }
                        ),
                      }}>
                        {task.checked && <Icon icon="Check" size={10} style={{ color: 'var(--wt-accent-text)' }} weight="bold" />}
                      </Box>

                      <Text variant="body" size="small" style={{
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        opacity: task.checked ? 0.35 : 1,
                        textDecoration: task.checked ? 'line-through' : 'none',
                        transition: 'opacity 0.15s',
                      }}>
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
