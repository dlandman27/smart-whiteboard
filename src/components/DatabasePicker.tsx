import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAllWidgetTypes } from './widgets/registry'
import type { WidgetTypeDef, WidgetVariantDef } from './widgets/types'
import { Icon, Panel, PanelHeader, MenuItem, Text, Button, WidgetSizeContext } from '@whiteboard/ui-kit'
import { useNotionDatabases, useNotionHealth } from '../hooks/useNotion'
import { useGCalStatus, useGCalCalendars } from '../hooks/useGCal'
import { useSpotifyStatus } from '../hooks/useSpotify'
import { useWhiteboardStore } from '../store/whiteboard'
import type { PendingWidget } from '../types'

/** Derive a gradient style from a single hex color */
function iconGradient(color: string): React.CSSProperties {
  return { background: `linear-gradient(135deg, ${color}dd, ${color})` }
}

interface Props {
  onClose: () => void
  onWidgetSelected?: (widget: PendingWidget) => void
}

function dbTitle(db: any): string {
  return db.title?.map((t: any) => t.plain_text).join('') || 'Untitled'
}

type ListItem =
  | { kind: 'header'; id: string; label: string }
  | { kind: 'collapsible'; id: string; label: string; count: number; collapsed: boolean; onToggle: () => void }
  | { kind: 'widget'; id: string; icon: React.ReactNode; iconBg: string; iconStyle?: React.CSSProperties; name: string; source: string; added: boolean; onAdd: () => void }
  | { kind: 'notice'; id: string; label: string }

const SPORTS_TYPES = new Set([
  '@whiteboard/nfl', '@whiteboard/nba', '@whiteboard/nhl', '@whiteboard/mlb',
  '@whiteboard/epl', '@whiteboard/laliga', '@whiteboard/ucl',
  '@whiteboard/bundesliga', '@whiteboard/seriea', '@whiteboard/ligue1',
  '@whiteboard/mls', '@whiteboard/worldcup',
])

// ── Level 2: Variant Carousel ────────────────────────────────────────────────

function VariantCarousel({
  typeDef,
  onBack,
  onClose,
  onSelect,
}: {
  typeDef: WidgetTypeDef
  onBack: () => void
  onClose: () => void
  onSelect: (variant: WidgetVariantDef) => void
}) {
  const [idx, setIdx] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [settling, setSettling] = useState(false)
  const variants = typeDef.variants
  const variant = variants[idx]
  const dragStartX = useRef(0)
  const dragging = useRef(false)

  // Slide width for the horizontal strip (each "page")
  const SLIDE_W = 360

  const goTo = useCallback((newIdx: number) => {
    setSettling(true)
    setDragX(0)
    setIdx(newIdx)
    setTimeout(() => setSettling(false), 300)
  }, [])

  const prev = useCallback(() => {
    if (idx <= 0) return
    goTo(idx - 1)
  }, [idx, goTo])

  const next = useCallback(() => {
    if (idx >= variants.length - 1) return
    goTo(idx + 1)
  }, [idx, variants.length, goTo])

  const handleDragStart = useCallback((x: number) => {
    if (variants.length <= 1) return
    dragging.current = true
    dragStartX.current = x
    setSettling(false)
  }, [variants.length])

  const handleDragMove = useCallback((x: number) => {
    if (!dragging.current) return
    setDragX(x - dragStartX.current)
  }, [])

  const handleDragEnd = useCallback((x: number) => {
    if (!dragging.current) return
    dragging.current = false
    const dx = x - dragStartX.current
    if (dx < -40 && idx < variants.length - 1) {
      // Swiped left → next
      goTo(idx + 1)
    } else if (dx > 40 && idx > 0) {
      // Swiped right → prev
      goTo(idx - 1)
    } else {
      // Snap back
      setSettling(true)
      setDragX(0)
      setTimeout(() => setSettling(false), 200)
    }
  }, [idx, variants.length, goTo])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      if (e.key === 'Enter')      { e.preventDefault(); onSelect(variant) }
      if (e.key === 'Escape')     { e.preventDefault(); onBack() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, variant, onSelect, onBack])

  // Horizontal strip offset: current page + drag
  const stripX = -idx * SLIDE_W + dragX

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title={typeDef.label} onClose={onClose} onBack={onBack} />

      {/* Carousel area */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-6 overflow-hidden"
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => { if (dragging.current) handleDragMove(e.clientX) }}
        onMouseUp={(e) => handleDragEnd(e.clientX)}
        onMouseLeave={(e) => { if (dragging.current) handleDragEnd(e.clientX) }}
        style={{ cursor: variants.length > 1 ? 'grab' : undefined }}
      >
        {/* Horizontal strip of all variants */}
        <div
          style={{
            display: 'flex',
            transform: `translateX(${stripX}px)`,
            transition: settling ? 'transform 0.3s ease-out' : 'none',
            userSelect: 'none',
          }}
        >
          {variants.map((v, i) => {
            const sw = v.shape.width
            const sh = v.shape.height
            const maxPW = 280
            const maxPH = 220
            const sc = Math.min(maxPW / sw, maxPH / sh, 1)
            const pw = sw * sc
            const ph = sh * sc
            const V = v.component
            return (
              <div
                key={v.variantId}
                style={{
                  width: SLIDE_W,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                {/* Live widget preview */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    width: pw,
                    height: ph,
                    border: '1px solid var(--wt-border)',
                    boxShadow: 'var(--wt-shadow-md)',
                  }}
                >
                  <div
                    style={{
                      width: sw,
                      height: sh,
                      transform: `scale(${sc})`,
                      transformOrigin: 'top left',
                      pointerEvents: 'none',
                      overflow: 'hidden',
                    }}
                  >
                    <WidgetSizeContext.Provider value={{ containerWidth: sw, containerHeight: sh }}>
                      <V widgetId="__preview__" />
                    </WidgetSizeContext.Provider>
                  </div>
                </div>

                {/* Variant info */}
                <div className="text-center max-w-[280px]">
                  <div className="text-sm font-semibold" style={{ color: 'var(--wt-text)' }}>
                    {v.label}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--wt-text-muted)' }}>
                    {v.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination dots */}
        {variants.length > 1 && (
          <div className="flex items-center gap-1.5">
            {variants.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === idx ? 8 : 6,
                  height: i === idx ? 8 : 6,
                  backgroundColor: i === idx ? 'var(--wt-text)' : 'var(--wt-text-muted)',
                  opacity: i === idx ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Widget button */}
      <div className="px-6 pb-5 pt-2 flex-shrink-0">
        <Button
          variant="accent"
          size="lg"
          fullWidth
          iconLeft={<Icon icon="Plus" size={16} />}
          onClick={() => onSelect(variant)}
        >
          Add Wiigit
        </Button>
      </div>
    </div>
  )
}

// ── Main component (Level 1 + Level 2) ──────────────────────────────────────

export function DatabasePicker({ onClose, onWidgetSelected }: Props) {
  const [query,          setQuery]         = useState('')
  const [selectedIdx,    setSelected]      = useState(0)
  const [activeType,     setActiveType]    = useState<WidgetTypeDef | null>(null)
  const [sportsOpen,     setSportsOpen]    = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  const health        = useNotionHealth()
  const gcalStatus    = useGCalStatus()
  const spotifyStatus = useSpotifyStatus()

  const { data: notionData } = useNotionDatabases()
  const { data: calData }    = useGCalCalendars()

  const { boards, activeBoardId, addWidget } = useWhiteboardStore()
  const widgets = boards.find((b) => b.id === activeBoardId)?.widgets ?? []

  const gcalConnected    = gcalStatus.data?.connected
  const spotifyConnected = spotifyStatus.data?.connected

  function addOff() { return widgets.length * 24 }

  function selectWidget(pending: PendingWidget) {
    if (onWidgetSelected) {
      onWidgetSelected(pending)
    } else {
      addWidget({ ...pending, x: 60 + addOff(), y: 60 + addOff() })
    }
    onClose()
  }

  function handleVariantSelect(typeDef: WidgetTypeDef, variant: WidgetVariantDef) {
    selectWidget({
      type: typeDef.typeId,
      variantId: variant.variantId,
      databaseTitle: typeDef.label,
      width: variant.shape.width,
      height: variant.shape.height,
    })
  }

  const items = useMemo<ListItem[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = (keywords: string[], name: string) =>
      !q || name.toLowerCase().includes(q) || keywords.some((kw) => kw.includes(q) || q.includes(kw))

    const list: ListItem[] = []

    // Widget types — split into regular and sports
    const allTypes = getAllWidgetTypes().filter((t) => matches(t.keywords, t.label))
    const regularTypes = allTypes.filter((t) => !SPORTS_TYPES.has(t.typeId))
    const sportsTypes  = allTypes.filter((t) => SPORTS_TYPES.has(t.typeId))

    const mkItem = (t: WidgetTypeDef): ListItem => ({
      kind: 'widget', id: `type-${t.typeId}`,
      icon: <Icon icon={t.Icon} size={15} className="text-white" weight="fill" />,
      iconBg: '', iconStyle: iconGradient(t.iconColor), name: t.label, source: t.description, added: false,
      onAdd: () => setActiveType(t),
    })

    if (regularTypes.length > 0) {
      if (!q) list.push({ kind: 'header', id: 'h-util', label: 'Wiigits' })
      for (const t of regularTypes) list.push(mkItem(t))
    }

    if (sportsTypes.length > 0) {
      if (q) {
        // When searching, show sports results inline (no collapsible)
        for (const t of sportsTypes) list.push(mkItem(t))
      } else {
        list.push({
          kind: 'collapsible', id: 'h-sports',
          label: 'Sports', count: sportsTypes.length,
          collapsed: !sportsOpen,
          onToggle: () => setSportsOpen((v) => !v),
        })
        if (sportsOpen) {
          for (const t of sportsTypes) list.push(mkItem(t))
        }
      }
    }

    // Notion databases
    const notionResults: any[] = notionData?.results ?? []
    const notionFiltered = notionResults.filter((db) => matches(['notion', 'database'], dbTitle(db)))
    if (health.data?.configured && notionFiltered.length > 0) {
      if (!q) list.push({ kind: 'header', id: 'h-notion', label: 'Notion' })
      for (const db of notionFiltered) {
        const added = widgets.some((w) => w.databaseId === db.id)
        list.push({
          kind: 'widget', id: `notion-${db.id}`,
          icon: <Icon icon="Database" size={15} className="text-blue-500" />,
          iconBg: 'bg-blue-500/10', name: dbTitle(db), source: 'Notion', added,
          onAdd: () => selectWidget({ type: '@whiteboard/notion-view', databaseId: db.id, databaseTitle: dbTitle(db), width: 500, height: 420, settings: { databaseId: db.id, template: 'todo-list', fieldMap: { title: 'Name', status: 'Status', priority: 'Priority', due: 'Due' }, options: { statusDone: 'Done' } } }),
        })
      }
    }

    // Google Calendar
    if (!q || ['calendar','google','gcal'].some((k) => k.includes(q) || q.includes(k))) {
      const calResults: any[] = calData?.items ?? []
      const calFiltered = calResults.filter((c) => matches(['calendar', 'google'], c.summary))
      if (gcalConnected && calFiltered.length > 0) {
        if (!q) list.push({ kind: 'header', id: 'h-gcal', label: 'Google Calendar' })
        for (const cal of calFiltered) {
          const added = widgets.some((w) => w.calendarId === cal.id)
          list.push({
            kind: 'widget', id: `cal-${cal.id}`,
            icon: <Icon icon="Calendar" size={15} className="text-white" />,
            iconBg: '', iconStyle: { background: cal.backgroundColor ?? '#4285f4' },
            name: cal.summary, source: 'Google Calendar', added,
            onAdd: () => selectWidget({ type: 'calendar', calendarId: cal.id, databaseTitle: cal.summary, width: 380, height: 460 }),
          })
        }
      } else if (!gcalConnected && !q) {
        list.push({ kind: 'notice', id: 'gcal-notice', label: 'Connect Google Calendar in Settings to add calendar Wiigits.' })
      }
    }

    // Spotify
    if (!q || ['spotify','music','playing','song','track'].some((k) => k.includes(q) || q.includes(k))) {
      if (spotifyConnected) {
        const added = widgets.some((w) => w.type === 'spotify-now-playing')
        if (!q) list.push({ kind: 'header', id: 'h-spotify', label: 'Spotify' })
        list.push({
          kind: 'widget', id: 'spotify-npl',
          icon: <Icon icon="MusicNote" size={15} className="text-green-500" />,
          iconBg: 'bg-green-500/10', name: 'Now Playing', source: 'Spotify', added,
          onAdd: () => selectWidget({ type: 'spotify-now-playing', databaseTitle: 'Now Playing', width: 320, height: 180 }),
        })
      } else if (!q) {
        list.push({ kind: 'notice', id: 'spotify-notice', label: 'Connect Spotify in Settings to add music Wiigits.' })
      }
    }

    return list
  }, [query, notionData, calData, gcalConnected, spotifyConnected, widgets, sportsOpen])

  const selectableItems = items.filter((i): i is Extract<ListItem, { kind: 'widget' }> => i.kind === 'widget')

  useEffect(() => { setSelected(0) }, [query])
  useEffect(() => {
    if (selectedIdx >= selectableItems.length) setSelected(Math.max(0, selectableItems.length - 1))
  }, [selectableItems.length])

  useEffect(() => {
    if (activeType) return // don't capture keys when carousel is open
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((i) => Math.min(i + 1, selectableItems.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = selectableItems[selectedIdx]
        if (item && !item.added) item.onAdd()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectableItems, selectedIdx, onClose, activeType])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const selectedItem = selectableItems[selectedIdx]

  // ── Level 2: Variant carousel ──────────────────────────────────────────────
  if (activeType) {
    return (
      <Panel width={420} style={{ height: 480 }} onClose={onClose}>
        <VariantCarousel
          typeDef={activeType}
          onBack={() => setActiveType(null)}
          onClose={onClose}
          onSelect={(v) => handleVariantSelect(activeType, v)}
        />
      </Panel>
    )
  }

  // ── Level 1: Widget catalog ────────────────────────────────────────────────
  return (
    <Panel width={580} style={{ height: 560, display: 'flex', flexDirection: 'column' }} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
          <Icon icon="MagnifyingGlass" size={15} style={{ color: 'var(--wt-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Search Wiigits…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--wt-text)' }}
          />
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto settings-scroll px-2 py-1">
          {items.length === 0 && (
            <Text variant="body" size="small" color="muted" align="center" className="py-10 block">
              No results for &ldquo;{query}&rdquo;
            </Text>
          )}
          {items.map((item) => {
            if (item.kind === 'header') {
              return (
                <div key={item.id} className="px-3 pt-3 pb-1">
                  <Text variant="label" size="small" color="muted" textTransform="uppercase">{item.label}</Text>
                </div>
              )
            }
            if (item.kind === 'collapsible') {
              return (
                <button
                  key={item.id}
                  onClick={item.onToggle}
                  className="w-full flex items-center gap-2 px-3 pt-3 pb-1 text-left"
                >
                  <Icon
                    icon="CaretRight"
                    size={10}
                    style={{
                      color: 'var(--wt-text-muted)',
                      transform: item.collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                  <Text variant="label" size="small" color="muted" textTransform="uppercase">{item.label}</Text>
                  <Text variant="caption" size="small" color="muted">{item.count}</Text>
                </button>
              )
            }
            if (item.kind === 'notice') {
              return (
                <div key={item.id} className="px-3 py-2">
                  <Text variant="body" size="small" color="muted">{item.label}</Text>
                </div>
              )
            }
            const idx = selectableItems.findIndex((s) => s.id === item.id)
            return (
              <div key={item.id} data-idx={idx}>
                <MenuItem
                  icon={item.icon}
                  iconBg={item.iconBg}
                  iconStyle={item.iconStyle}
                  name={item.name}
                  source={item.source}
                  label={item.added ? 'On board' : undefined}
                  selected={idx === selectedIdx}
                  disabled={item.added}
                  onClick={item.onAdd}
                  onMouseEnter={() => setSelected(idx)}
                />
              </div>
            )
          })}
          <div className="h-1" />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderTop: '1px solid var(--wt-settings-divider)' }}>
          <div className="flex items-center gap-3">
            <Text variant="caption" size="small" color="muted" className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>↑↓</kbd>
              Navigate
            </Text>
            <Text variant="caption" size="small" color="muted" className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>↵</kbd>
              {selectedItem ? 'Select' : 'Select'}
            </Text>
          </div>
          <Text variant="caption" size="small" color="muted" className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>Esc</kbd>
            Close
          </Text>
        </div>
      </div>
    </Panel>
  )
}
