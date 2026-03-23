import { useState } from 'react'
import { Plus, RefreshCw, Minus, Check } from 'lucide-react'
import { Button, Icon, IconButton, Input, Text } from '../../ui/web'
import { FlexCol, FlexRow, Box, Center, ScrollArea } from '../../ui/layouts'
import { useNotionPages, useUpdatePage, useCreatePage, useArchivePage } from '../../hooks/useNotion'

// Property types we know how to display/edit
const EDITABLE_TYPES = new Set([
  'title', 'rich_text', 'number', 'select', 'checkbox', 'date', 'email', 'phone_number', 'url',
])
const DISPLAY_ONLY_TYPES = new Set(['status', 'multi_select'])

const NOTION_COLORS: Record<string, string> = {
  default: 'bg-stone-400',
  gray: 'bg-gray-400',
  brown: 'bg-amber-700',
  orange: 'bg-orange-400',
  yellow: 'bg-yellow-400 text-yellow-900',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
}

function Badge({ name, color }: { name: string; color: string }) {
  const cls = NOTION_COLORS[color] ?? 'bg-stone-400'
  return (
    <Text
      as="span"
      variant="label"
      size="small"
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-white ${cls}`}
    >
      {name}
    </Text>
  )
}

// ---- Helpers ----------------------------------------------------------------

function getTitlePropName(page: any): string {
  return Object.keys(page.properties).find((k) => page.properties[k].type === 'title') ?? 'Name'
}

function getDisplayValue(prop: any): string {
  switch (prop.type) {
    case 'title':        return prop.title.map((t: any) => t.plain_text).join('')
    case 'rich_text':    return prop.rich_text.map((t: any) => t.plain_text).join('')
    case 'number':       return prop.number?.toString() ?? ''
    case 'checkbox':     return prop.checkbox ? 'true' : 'false'
    case 'select':       return prop.select?.name ?? ''
    case 'status':       return prop.status?.name ?? ''
    case 'date':         return prop.date?.start ?? ''
    case 'multi_select': return prop.multi_select.map((s: any) => s.name).join(', ')
    case 'email':        return prop.email ?? ''
    case 'phone_number': return prop.phone_number ?? ''
    case 'url':          return prop.url ?? ''
    default:             return ''
  }
}

function buildUpdatePayload(type: string, value: string): Record<string, unknown> {
  switch (type) {
    case 'title':        return { title: [{ text: { content: value } }] }
    case 'rich_text':    return { rich_text: [{ text: { content: value } }] }
    case 'number':       return { number: value === '' ? null : parseFloat(value) }
    case 'checkbox':     return { checkbox: value === 'true' }
    case 'select':       return value ? { select: { name: value } } : { select: null }
    case 'date':         return value ? { date: { start: value } } : { date: null }
    case 'email':        return { email: value || null }
    case 'phone_number': return { phone_number: value || null }
    case 'url':          return { url: value || null }
    default:             return {}
  }
}

// ---- Component --------------------------------------------------------------

interface Props {
  databaseId: string
}

export function DatabaseWidget({ databaseId }: Props) {
  const { data, isLoading, error, refetch, isFetching } = useNotionPages(databaseId)
  const updatePage  = useUpdatePage(databaseId)
  const createPage  = useCreatePage(databaseId)
  const archivePage = useArchivePage(databaseId)

  const [editingCell, setEditingCell] = useState<{
    pageId: string
    propName: string
    value: string
  } | null>(null)
  const [newTitle, setNewTitle]   = useState('')
  const [isAdding, setIsAdding]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ---- Derived data ----------------------------------------------------------

  const pages: any[] = data?.results ?? []
  const sample = pages[0]
  const titlePropName = sample ? getTitlePropName(sample) : 'Name'

  const otherCols: string[] = sample
    ? Object.entries(sample.properties)
        .filter(([_, v]: any) => v.type !== 'title' &&
          (EDITABLE_TYPES.has(v.type) || DISPLAY_ONLY_TYPES.has(v.type)))
        .slice(0, 3)
        .map(([name]) => name)
    : []

  // ---- Handlers ---------------------------------------------------------------

  function commitEdit() {
    if (!editingCell) return
    const page = pages.find((p) => p.id === editingCell.pageId)
    const prop = page?.properties[editingCell.propName]
    if (!prop) return
    updatePage.mutate({
      pageId: editingCell.pageId,
      properties: { [editingCell.propName]: buildUpdatePayload(prop.type, editingCell.value) },
    })
    setEditingCell(null)
  }

  function toggleCheckbox(pageId: string, propName: string, current: boolean) {
    updatePage.mutate({
      pageId,
      properties: { [propName]: { checkbox: !current } },
    })
  }

  function handleAddPage() {
    if (!newTitle.trim()) return
    createPage.mutate({ [titlePropName]: { title: [{ text: { content: newTitle.trim() } }] } })
    setNewTitle('')
    setIsAdding(false)
  }

  function handleDelete(pageId: string) {
    setDeletingId(pageId)
    archivePage.mutate(pageId, { onSettled: () => setDeletingId(null) })
  }

  // ---- Cell renderer ---------------------------------------------------------

  function renderCell(page: any, propName: string) {
    const prop = page.properties[propName]
    if (!prop) return null

    const isEditing =
      editingCell?.pageId === page.id && editingCell?.propName === propName

    if (prop.type === 'checkbox') {
      return (
        <button
          onClick={() => toggleCheckbox(page.id, propName, prop.checkbox)}
          className="flex items-center justify-center w-5 h-5 rounded border transition-colors flex-shrink-0"
          style={{ borderColor: 'var(--wt-border-active)' }}
        >
          {prop.checkbox && <Icon icon={Check} size={11} className="text-green-500" />}
        </button>
      )
    }

    if (prop.type === 'status') {
      const val = prop.status
      return val ? <Badge name={val.name} color={val.color} /> : <Text as="span" variant="caption" color="disabled">—</Text>
    }

    if (prop.type === 'select' && !isEditing) {
      const val = prop.select
      return val ? (
        <button onClick={() => setEditingCell({ pageId: page.id, propName, value: val.name })} className="hover:opacity-80">
          <Badge name={val.name} color={val.color} />
        </button>
      ) : (
        <Text as="span" variant="caption" color="disabled" className="cursor-text" onClick={() => setEditingCell({ pageId: page.id, propName, value: '' })}>—</Text>
      )
    }

    if (prop.type === 'multi_select') {
      if (!prop.multi_select.length) return <Text as="span" variant="caption" color="disabled">—</Text>
      return (
        <FlexRow wrap gap="xs">
          {prop.multi_select.slice(0, 2).map((s: any) => (
            <Badge key={s.id} name={s.name} color={s.color} />
          ))}
          {prop.multi_select.length > 2 && (
            <Text as="span" variant="caption" color="muted">+{prop.multi_select.length - 2}</Text>
          )}
        </FlexRow>
      )
    }

    const displayVal = getDisplayValue(prop)

    if (isEditing) {
      return (
        <input
          autoFocus
          type={prop.type === 'number' ? 'number' : prop.type === 'date' ? 'date' : 'text'}
          value={editingCell!.value}
          onChange={(e) => setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditingCell(null)
          }}
          className="w-full text-xs px-1.5 py-0.5 rounded outline-none min-w-0 shadow-sm wt-input"
          style={{ borderColor: 'var(--wt-accent)' }}
        />
      )
    }

    return (
      <Text
        as="span"
        variant="caption"
        color="muted"
        className="hover:opacity-100 cursor-text block truncate"
        style={{ opacity: 0.7 }}
        onClick={() => setEditingCell({ pageId: page.id, propName, value: displayVal })}
        title={displayVal || undefined}
      >
        {displayVal || <Text as="span" variant="caption" color="disabled">—</Text>}
      </Text>
    )
  }

  // ---- Render ----------------------------------------------------------------

  if (isLoading) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">Loading…</Text>
      </Center>
    )
  }

  if (error) {
    return (
      <FlexCol align="center" justify="center" fullHeight gap="sm" className="p-4">
        <Text variant="label" color="danger">Failed to load entries</Text>
        <Text variant="caption" color="danger">{(error as Error).message}</Text>
        <Button variant="link" size="sm" onClick={() => refetch()} style={{ color: 'var(--wt-danger)' }}>Retry</Button>
      </FlexCol>
    )
  }

  return (
    <FlexCol fullHeight fullWidth noSelect className="text-sm" style={{ background: 'var(--wt-bg)' }}>
      {/* Toolbar */}
      <FlexRow
        fullWidth
        align="center"
        justify="between"
        className="px-3 py-1.5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--wt-border)' }}
      >
        <Text as="span" variant="caption" color="muted">{pages.length} {pages.length === 1 ? 'item' : 'items'}</Text>
        {/* <FlexRow align="center" className="gap-1.5">
          <IconButton
            icon={RefreshCw}
            size="sm"
            onClick={() => refetch()}
            title="Refresh"
            className={isFetching ? 'animate-spin' : ''}
          />
          <Button variant="accent" size="sm" iconLeft={<Icon icon={Plus} size={11} />} onClick={() => setIsAdding(true)}>
            New
          </Button>
        </FlexRow> */}
      </FlexRow>

      {/* Column headers */}
      {(sample || otherCols.length > 0) && (
        <FlexRow
          fullWidth
          align="center"
          gap="sm"
          className="px-3 py-1.5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--wt-border)', background: 'var(--wt-surface)' }}
        >
          <Text variant="label" size="small" color="muted" textTransform="uppercase" className="flex-1 truncate" style={{ letterSpacing: '0.05em' }}>
            {titlePropName}
          </Text>
          {otherCols.map((col) => (
            <Text key={col} variant="label" size="small" color="muted" textTransform="uppercase" className="w-24 flex-shrink-0 truncate" style={{ letterSpacing: '0.05em' }}>
              {col}
            </Text>
          ))}
          <Box className="w-5 flex-shrink-0" />
        </FlexRow>
      )}

      {/* Rows */}
      <ScrollArea className="w-full">
        {pages.length === 0 ? (
          <Center fullHeight>
            <Text variant="caption" size="large" color="muted" style={{ opacity: 0.5 }}>No entries yet</Text>
          </Center>
        ) : (
          pages.map((page) => (
            <FlexRow
              key={page.id}
              fullWidth
              align="center"
              gap="sm"
              className={`group px-3 py-2 border-b transition-colors ${deletingId === page.id ? 'opacity-40' : 'hover:bg-[var(--wt-surface-hover)]'}`}
              style={{ borderColor: 'var(--wt-border)' }}
            >
              <Box flex1 className="min-w-0">
                {renderCell(page, titlePropName)}
              </Box>
              {otherCols.map((propName) => (
                <Box key={propName} className="w-24 flex-shrink-0 min-w-0">
                  {renderCell(page, propName)}
                </Box>
              ))}
              <IconButton
                icon={Minus}
                size="sm"
                onClick={() => handleDelete(page.id)}
                disabled={deletingId === page.id}
                title="Remove"
                className="flex-shrink-0 text-transparent group-hover:text-stone-300 hover:!text-red-400"
              />
            </FlexRow>
          ))
        )}
      </ScrollArea>

      {/* Add new page input */}
      {isAdding && (
        <Box
          className="px-3 py-2 border-t flex-shrink-0"
          style={{ borderColor: 'var(--wt-border)', background: 'var(--wt-surface)' }}
        >
          <Input
            autoFocus
            type="text"
            placeholder={`New ${titlePropName}…`}
            value={newTitle}
            size="sm"
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPage()
              if (e.key === 'Escape') { setIsAdding(false); setNewTitle('') }
            }}
            onBlur={() => { if (!newTitle.trim()) { setIsAdding(false) } }}
          />
          <Text variant="caption" size="small" color="muted" className="mt-1" style={{ opacity: 0.5 }}>
            Enter to save · Esc to cancel
          </Text>
        </Box>
      )}
    </FlexCol>
  )
}
