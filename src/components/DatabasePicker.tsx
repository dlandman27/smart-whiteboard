import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllWidgetDefs } from './widgets/registry'
import { Icon, Panel, PanelHeader, MenuItem, Text } from '@whiteboard/ui-kit'
import { useNotionDatabases, useNotionHealth } from '../hooks/useNotion'
import { useGCalStatus, useGCalCalendars } from '../hooks/useGCal'
import { useSpotifyStatus } from '../hooks/useSpotify'
import { useWhiteboardStore } from '../store/whiteboard'
import type { PendingWidget } from '../types'

interface Props {
  onClose: () => void
  onWidgetSelected?: (widget: PendingWidget) => void
}

function dbTitle(db: any): string {
  return db.title?.map((t: any) => t.plain_text).join('') || 'Untitled'
}

type ListItem =
  | { kind: 'header'; id: string; label: string }
  | { kind: 'widget'; id: string; icon: React.ReactNode; iconBg: string; iconStyle?: React.CSSProperties; name: string; source: string; added: boolean; onAdd: () => void }
  | { kind: 'notice'; id: string; label: string }

// ── Main component ────────────────────────────────────────────────────────────

export function DatabasePicker({ onClose, onWidgetSelected }: Props) {
  const [query,       setQuery]    = useState('')
  const [selectedIdx, setSelected] = useState(0)
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

  const items = useMemo<ListItem[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = (keywords: string[], name: string) =>
      !q || name.toLowerCase().includes(q) || keywords.some((kw) => kw.includes(q) || q.includes(kw))

    const list: ListItem[] = []

    const utilDefs = getAllWidgetDefs().filter((d) => matches(d.keywords, d.label))
    if (utilDefs.length > 0) {
      if (!q) list.push({ kind: 'header', id: 'h-util', label: 'Widgets' })
      for (const def of utilDefs) {
        list.push({
          kind: 'widget', id: `util-${def.type}`,
          icon: <Icon icon={def.Icon} size={15} className={def.iconClass} />,
          iconBg: def.iconBg, name: def.label, source: 'Built-in', added: false,
          onAdd: () => selectWidget({ type: def.type, databaseTitle: def.label, ...def.defaultSize }),
        })
      }
    }

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
        list.push({ kind: 'notice', id: 'gcal-notice', label: 'Connect Google Calendar in Settings to add calendar widgets.' })
      }
    }

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
        list.push({ kind: 'notice', id: 'spotify-notice', label: 'Connect Spotify in Settings to add music widgets.' })
      }
    }

    return list
  }, [query, notionData, calData, gcalConnected, spotifyConnected, widgets])

  const selectableItems = items.filter((i): i is Extract<ListItem, { kind: 'widget' }> => i.kind === 'widget')

  useEffect(() => { setSelected(0) }, [query])
  useEffect(() => {
    if (selectedIdx >= selectableItems.length) setSelected(Math.max(0, selectableItems.length - 1))
  }, [selectableItems.length])

  useEffect(() => {
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
  }, [selectableItems, selectedIdx, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const selectedItem = selectableItems[selectedIdx]

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
            placeholder="Search widgets…"
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
                  label={item.added ? 'On board' : 'Add'}
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
              {selectedItem ? 'Add Widget' : 'Select'}
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
