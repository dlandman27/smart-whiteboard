
import { useState, useRef, useEffect } from 'react'
import { Icon } from '../../ui/web'
import { useNotionPages, useUpdatePage, useCreatePage, useArchivePage } from '../../hooks/useNotion'
import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol, FlexRow, Box, Center, ScrollArea } from '../../ui/layouts'
import { Text } from '../../ui/web'

export interface GroceryWidgetSettings { databaseId: string }
export const GROCERY_DEFAULTS: GroceryWidgetSettings = { databaseId: '' }

const CATEGORY_EMOJIS: Record<string, string> = {
  'Produce':   '🥦',
  'Dairy':     '🥛',
  'Meat':      '🥩',
  'Pantry':    '🥫',
  'Household': '🧹',
  'Other':     '📦',
}

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Household', 'Other']

const STATUS_CYCLE: Record<string, string> = {
  'Need to buy': 'In cart',
  'In cart':     'Got it',
  'Got it':      'Need to buy',
}

function getName(page: any): string {
  return page.properties.Name?.title?.map((t: any) => t.plain_text).join('') ?? ''
}
function getCategory(page: any): string {
  return page.properties.Category?.select?.name ?? 'Other'
}
function getQuantity(page: any): string {
  return page.properties.Quantity?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
}
function getStatus(page: any): string {
  return page.properties.Status?.select?.name ?? 'Need to buy'
}

export function GroceryWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<GroceryWidgetSettings>(widgetId, GROCERY_DEFAULTS)
  const [adding, setAdding]         = useState(false)
  const [newName, setNewName]       = useState('')
  const [newQty, setNewQty]         = useState('')
  const [newCat, setNewCat]         = useState('Other')
  const [filter, setFilter]         = useState<'active' | 'all'>('active')
  const inputRef                    = useRef<HTMLInputElement>(null)

  const { data, isLoading, error } = useNotionPages(settings.databaseId)
  const updatePage  = useUpdatePage(settings.databaseId)
  const createPage  = useCreatePage(settings.databaseId)
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
  const visible = filter === 'active'
    ? pages.filter(p => getStatus(p) !== 'Got it')
    : pages

  // group by category
  const grouped: Record<string, any[]> = {}
  for (const p of visible) {
    const cat = getCategory(p)
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  }
  const sortedCats = CATEGORIES.filter(c => grouped[c]?.length)

  function cycleStatus(page: any) {
    const next = STATUS_CYCLE[getStatus(page)] ?? 'Need to buy'
    updatePage.mutate({
      pageId:     page.id,
      properties: { Status: { select: { name: next } } },
    })
  }

  function submitAdd() {
    const name = newName.trim()
    if (!name) { setAdding(false); return }
    createPage.mutate({
      Name:     { title: [{ text: { content: name } }] },
      Status:   { select: { name: 'Need to buy' } },
      Category: { select: { name: newCat } },
      ...(newQty.trim() ? { Quantity: { rich_text: [{ text: { content: newQty.trim() } }] } } : {}),
    })
    setNewName('')
    setNewQty('')
    setNewCat('Other')
    setAdding(false)
  }

  const needCount = pages.filter(p => getStatus(p) === 'Need to buy').length
  const gotCount  = pages.filter(p => getStatus(p) === 'Got it').length

  return (
    <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>
      {/* Header */}
      <FlexRow align="center" justify="between" className="px-4 pt-3 pb-2 flex-shrink-0">
        <FlexRow align="center" style={{ gap: 8 }}>
          <Text variant="label" color="muted" style={{ fontSize: 11 }}>
            {needCount} to get · {gotCount} done
          </Text>
        </FlexRow>
        <FlexRow align="center" style={{ gap: 6 }}>
          {/* Filter toggle */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setFilter(f => f === 'active' ? 'all' : 'active')}
            style={{
              padding:      '3px 8px',
              borderRadius: 99,
              fontSize:     11,
              fontWeight:   500,
              background:   filter === 'all' ? 'var(--wt-accent)' : 'var(--wt-surface-hover)',
              color:        filter === 'all' ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
              border:       'none',
              cursor:       'pointer',
            }}
          >
            {filter === 'all' ? 'All' : 'Active'}
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setAdding(true)}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          4,
              padding:      '4px 10px',
              borderRadius: 99,
              fontSize:     12,
              fontWeight:   600,
              background:   'var(--wt-accent)',
              color:        'var(--wt-accent-text)',
              border:       'none',
              cursor:       'pointer',
            }}
          >
            <Icon icon="Plus" size={12} />
            Add
          </button>
        </FlexRow>
      </FlexRow>

      <Box style={{ height: 1, background: 'var(--wt-border)', flexShrink: 0 }} />

      {/* Add form */}
      {adding && (
        <FlexCol className="px-4 py-2 flex-shrink-0" style={{ gap: 6, borderBottom: '1px solid var(--wt-border)' }}>
          <FlexRow align="center" style={{ gap: 8 }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onPointerDown={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
              placeholder="Item name…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--wt-text)', fontFamily: 'inherit' }}
            />
            <input
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              onPointerDown={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Enter') submitAdd() }}
              placeholder="Qty"
              style={{ width: 44, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--wt-text-muted)', fontFamily: 'inherit', textAlign: 'right' }}
            />
          </FlexRow>
          <FlexRow align="center" style={{ gap: 4, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => setNewCat(cat)}
                style={{
                  padding:      '2px 7px',
                  borderRadius: 99,
                  fontSize:     11,
                  background:   newCat === cat ? 'var(--wt-accent)' : 'var(--wt-surface-hover)',
                  color:        newCat === cat ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
                  border:       'none',
                  cursor:       'pointer',
                }}
              >
                {CATEGORY_EMOJIS[cat]} {cat}
              </button>
            ))}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => { setAdding(false); setNewName('') }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)' }}
            >
              <Icon icon="X" size={13} />
            </button>
          </FlexRow>
        </FlexCol>
      )}

      {/* List */}
      <ScrollArea style={{ flex: 1 }}>
        <FlexCol style={{ padding: '6px 8px', gap: 0 }}>
          {sortedCats.length === 0 && (
            <Center style={{ padding: '32px 0' }}>
              <FlexCol align="center" style={{ gap: 6 }}>
                <Text style={{ fontSize: 28 }}>🛒</Text>
                <Text variant="caption" color="muted">Your list is empty</Text>
              </FlexCol>
            </Center>
          )}
          {sortedCats.map(cat => (
            <FlexCol key={cat} style={{ marginBottom: 8 }}>
              {/* Category header */}
              <FlexRow align="center" style={{ gap: 5, padding: '4px 8px 2px' }}>
                <Text style={{ fontSize: 13 }}>{CATEGORY_EMOJIS[cat]}</Text>
                <Text variant="label" color="muted" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {cat}
                </Text>
              </FlexRow>
              {grouped[cat].map(page => (
                <GroceryRow
                  key={page.id}
                  name={getName(page)}
                  quantity={getQuantity(page)}
                  status={getStatus(page)}
                  onCycle={() => cycleStatus(page)}
                  onDelete={() => archivePage.mutate(page.id)}
                />
              ))}
            </FlexCol>
          ))}
        </FlexCol>
      </ScrollArea>
    </FlexCol>
  )
}

function GroceryRow({ name, quantity, status, onCycle, onDelete }: {
  name: string; quantity: string; status: string
  onCycle: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isGot  = status === 'Got it'
  const isCart = status === 'In cart'

  return (
    <FlexRow
      align="center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gap:          8,
        padding:      '5px 8px',
        borderRadius: 8,
        background:   hovered ? 'var(--wt-surface-hover)' : 'transparent',
        transition:   'background 0.1s',
      }}
    >
      {/* Status button */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onCycle}
        title={`Status: ${status} — click to advance`}
        style={{
          width:          18,
          height:         18,
          borderRadius:   5,
          flexShrink:     0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          border:         isGot || isCart ? 'none' : '2px solid var(--wt-border-active)',
          background:     isGot ? 'var(--wt-accent)' : isCart ? 'var(--wt-accent-secondary, #f59e0b)' : 'transparent',
          cursor:         'pointer',
          transition:     'all 0.15s',
        }}
      >
        {isGot  && <Icon icon="Check"       size={10} style={{ color: 'var(--wt-accent-text)' }} weight="bold" />}
        {isCart && <Icon icon="ShoppingCart" size={10} style={{ color: '#fff' }} weight="bold" />}
      </button>

      {/* Name */}
      <Text
        variant="body"
        size="small"
        style={{
          flex:           1,
          overflow:       'hidden',
          textOverflow:   'ellipsis',
          whiteSpace:     'nowrap',
          opacity:        isGot ? 0.3 : 1,
          textDecoration: isGot ? 'line-through' : 'none',
          transition:     'opacity 0.15s',
        }}
      >
        {name || <span style={{ opacity: 0.4 }}>Untitled</span>}
      </Text>

      {/* Quantity */}
      {quantity && (
        <Text variant="caption" color="muted" style={{ fontSize: 11, flexShrink: 0 }}>
          {quantity}
        </Text>
      )}

      {/* Delete */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onDelete}
        style={{
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          color:      'var(--wt-text-muted)',
          opacity:    hovered ? 0.5 : 0,
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

export function GrocerySettings({ widgetId }: { widgetId: string }) {
  const [settings, setSettings] = useWidgetSettings<GroceryWidgetSettings>(widgetId, GROCERY_DEFAULTS)
  return (
    <FlexCol style={{ gap: 12, padding: 16 }}>
      <Text variant="label">Notion Database ID</Text>
      <input
        value={settings.databaseId}
        onChange={e => setSettings({ databaseId: e.target.value })}
        onPointerDown={e => e.stopPropagation()}
        placeholder="Paste your database ID…"
        style={{
          width:       '100%',
          padding:     '8px 10px',
          borderRadius: 8,
          border:      '1px solid var(--wt-border)',
          background:  'var(--wt-surface)',
          color:       'var(--wt-text)',
          fontSize:    12,
          fontFamily:  'monospace',
        }}
      />
    </FlexCol>
  )
}
