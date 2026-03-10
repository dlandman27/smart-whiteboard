import { useState } from 'react'
import { Plus, RefreshCw, Minus, Check } from 'lucide-react'
import { Icon, IconButton, Text } from '../../ui/web'
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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white ${cls}`}>
      {name}
    </span>
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
  const updatePage = useUpdatePage(databaseId)
  const createPage = useCreatePage(databaseId)
  const archivePage = useArchivePage(databaseId)

  const [editingCell, setEditingCell] = useState<{
    pageId: string
    propName: string
    value: string
  } | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
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
          className="flex items-center justify-center w-5 h-5 rounded border border-stone-300 hover:border-stone-400 transition-colors flex-shrink-0"
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
        <div className="flex flex-wrap gap-1">
          {prop.multi_select.slice(0, 2).map((s: any) => (
            <Badge key={s.id} name={s.name} color={s.color} />
          ))}
          {prop.multi_select.length > 2 && (
            <Text as="span" variant="caption" color="muted">+{prop.multi_select.length - 2}</Text>
          )}
        </div>
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
          className="w-full bg-white text-stone-800 text-xs px-1.5 py-0.5 rounded outline-none border border-blue-400 min-w-0 shadow-sm"
        />
      )
    }

    return (
      <Text
        as="span"
        variant="caption"
        className="text-stone-600 hover:text-stone-900 cursor-text block truncate"
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
      <div className="flex items-center justify-center h-full">
        <Text variant="caption" color="muted">Loading…</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
        <Text variant="label" className="text-red-500">Failed to load entries</Text>
        <Text variant="caption" className="text-red-400">{(error as Error).message}</Text>
        <button onClick={() => refetch()} className="underline text-xs text-red-500 hover:text-red-600 mt-1">Retry</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full text-sm select-none bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-100 flex-shrink-0">
        <Text as="span" variant="caption" color="muted">{pages.length} {pages.length === 1 ? 'item' : 'items'}</Text>
        <div className="flex items-center gap-1.5">
          <IconButton
            icon={RefreshCw}
            size="sm"
            onClick={() => refetch()}
            title="Refresh"
            className={isFetching ? 'animate-spin text-blue-400' : ''}
          />
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-600 transition-colors"
          >
            <Icon icon={Plus} size={11} /> New
          </button>
        </div>
      </div>

      {/* Column headers */}
      {(sample || otherCols.length > 0) && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-stone-100 flex-shrink-0 bg-stone-50/50">
          <div className="flex-1 text-xs font-medium text-stone-400 uppercase tracking-wide truncate">
            {titlePropName}
          </div>
          {otherCols.map((col) => (
            <div key={col} className="w-24 flex-shrink-0 text-xs font-medium text-stone-400 uppercase tracking-wide truncate">
              {col}
            </div>
          ))}
          <div className="w-5 flex-shrink-0" />
        </div>
      )}

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {pages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stone-300 text-xs">
            No entries yet
          </div>
        ) : (
          pages.map((page) => (
            <div
              key={page.id}
              className={`group flex items-center gap-2 px-3 py-2 border-b border-stone-100 hover:bg-stone-50 transition-colors ${deletingId === page.id ? 'opacity-40' : ''}`}
            >
              <div className="flex-1 min-w-0">
                {renderCell(page, titlePropName)}
              </div>
              {otherCols.map((propName) => (
                <div key={propName} className="w-24 flex-shrink-0 min-w-0">
                  {renderCell(page, propName)}
                </div>
              ))}
              <IconButton
                icon={Minus}
                size="sm"
                onClick={() => handleDelete(page.id)}
                disabled={deletingId === page.id}
                title="Remove"
                className="flex-shrink-0 text-transparent group-hover:text-stone-300 hover:!text-red-400"
              />
            </div>
          ))
        )}
      </div>

      {/* Add new page input */}
      {isAdding && (
        <div className="px-3 py-2 border-t border-stone-100 bg-stone-50 flex-shrink-0">
          <input
            autoFocus
            type="text"
            placeholder={`New ${titlePropName}…`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPage()
              if (e.key === 'Escape') { setIsAdding(false); setNewTitle('') }
            }}
            onBlur={() => { if (!newTitle.trim()) { setIsAdding(false) } }}
            className="w-full bg-white text-stone-700 text-xs px-2 py-1.5 rounded border border-blue-400 outline-none placeholder-stone-300 shadow-sm"
          />
          <p className="text-xs text-stone-300 mt-1">Enter to save · Esc to cancel</p>
        </div>
      )}
    </div>
  )
}
