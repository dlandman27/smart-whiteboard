import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllWidgetDefs } from './widgets/registry'
import { Icon, Panel, PanelHeader, Input, Button, MenuItem, Text } from '../ui/web'
import { useNotionDatabases, useNotionHealth } from '../hooks/useNotion'
import { useGCalStatus, useGCalCalendars, startGCalAuth } from '../hooks/useGCal'
import { useSpotifyStatus, startSpotifyAuth } from '../hooks/useSpotify'
import { useGCalCredentials } from '../store/gcal'
import { useSpotifyCredentials } from '../store/spotify'
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
  | { kind: 'action'; id: string; icon: React.ReactNode; iconBg: string; name: string; source: string; label: string; onClick: () => void }

type SetupView = 'gcal' | 'spotify'

// ── Setup views ───────────────────────────────────────────────────────────────

function GCalSetup({ onBack }: { onBack: () => void }) {
  const creds  = useGCalCredentials()
  const status = useGCalStatus()
  const ready  = !!(creds.clientId && creds.clientSecret)

  async function connect() {
    const url = await startGCalAuth(creds.clientId, creds.clientSecret, creds.redirectUri)
    window.open(url, '_blank', 'width=500,height=600')
  }

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Google Calendar"
        onClose={() => {}}
        onBack={onBack}
        actions={status.data?.connected ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Connected</span>
        ) : undefined}
      />
      <div className="flex-1 overflow-y-auto settings-scroll px-4 py-4 space-y-3">
        <Text variant="body" size="small" color="muted">
          Create an OAuth 2.0 credential in{' '}
          <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--wt-accent)' }}>
            Google Cloud Console
          </a>{' '}
          and add{' '}
          <code className="px-1 rounded text-xs" style={{ backgroundColor: 'var(--wt-surface)' }}>
            {creds.redirectUri}
          </code>{' '}
          as an authorized redirect URI.
        </Text>
        <Input label="Client ID"     value={creds.clientId}     onChange={(e) => creds.set({ clientId:     e.target.value })} placeholder="From Google Cloud Console" />
        <Input label="Client Secret" value={creds.clientSecret} onChange={(e) => creds.set({ clientSecret: e.target.value })} type="password" />
        <Input label="Redirect URI"  value={creds.redirectUri}  onChange={(e) => creds.set({ redirectUri:  e.target.value })} />
        <Button variant="accent" fullWidth disabled={!ready} onClick={connect}>
          {status.data?.connected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
        </Button>
      </div>
    </div>
  )
}

function SpotifySetup({ onBack }: { onBack: () => void }) {
  const creds  = useSpotifyCredentials()
  const status = useSpotifyStatus()
  const ready  = !!(creds.clientId && creds.clientSecret)

  async function connect() {
    const url = await startSpotifyAuth(creds.clientId, creds.clientSecret, creds.redirectUri)
    window.open(url, '_blank', 'width=500,height=700')
  }

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Spotify"
        onClose={() => {}}
        onBack={onBack}
        actions={status.data?.connected ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Connected</span>
        ) : undefined}
      />
      <div className="flex-1 overflow-y-auto settings-scroll px-4 py-4 space-y-3">
        <Text variant="body" size="small" color="muted">
          Create a Spotify app at{' '}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--wt-accent)' }}>
            developer.spotify.com
          </a>{' '}
          and add your redirect URI to the allowed list.
        </Text>
        <Input label="Client ID"     value={creds.clientId}     onChange={(e) => creds.set({ clientId:     e.target.value })} placeholder="ef32f0586e5340e2929a7c77c3521afa" />
        <Input label="Client Secret" value={creds.clientSecret} onChange={(e) => creds.set({ clientSecret: e.target.value })} type="password" />
        <Input label="Redirect URI"  value={creds.redirectUri}  onChange={(e) => creds.set({ redirectUri:  e.target.value })} placeholder="https://xxxx.ngrok-free.app/api/spotify/callback" />
        <Button variant="accent" fullWidth disabled={!ready} onClick={connect}>
          {status.data?.connected ? 'Reconnect Spotify' : 'Connect Spotify'}
        </Button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DatabasePicker({ onClose, onWidgetSelected }: Props) {
  const [query,       setQuery]     = useState('')
  const [selectedIdx, setSelected]  = useState(0)
  const [setup,       setSetup]     = useState<SetupView | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  const health        = useNotionHealth()
  const gcalStatus    = useGCalStatus()
  const spotifyStatus = useSpotifyStatus()
  const gcalCreds     = useGCalCredentials()
  const spotifyCreds  = useSpotifyCredentials()

  const { data: notionData } = useNotionDatabases()
  const { data: calData }    = useGCalCalendars()

  const { boards, activeBoardId, addWidget } = useWhiteboardStore()
  const widgets = boards.find((b) => b.id === activeBoardId)?.widgets ?? []

  const gcalConfigured    = !!(gcalCreds.clientId && gcalCreds.clientSecret)
  const spotifyConfigured = !!(spotifyCreds.clientId && spotifyCreds.clientSecret)
  const gcalConnected     = gcalStatus.data?.connected
  const spotifyConnected  = spotifyStatus.data?.connected

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
      if (!q) list.push({ kind: 'header', id: 'h-util', label: 'Utilities' })
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
          onAdd: () => selectWidget({ type: 'database', databaseId: db.id, databaseTitle: dbTitle(db), width: 500, height: 380 }),
        })
      }
    }

    if (!q || 'google calendar'.includes(q) || ['calendar','google','gcal'].some((k) => k.includes(q) || q.includes(k))) {
      const calResults: any[] = calData?.items ?? []
      const calFiltered = calResults.filter((c) => matches(['calendar', 'google'], c.summary))
      list.push({ kind: 'header', id: 'h-gcal', label: 'Google Calendar' })

      if (!gcalConfigured || !gcalConnected) {
        list.push({
          kind: 'action', id: 'gcal-setup',
          icon: <Icon icon="Calendar" size={15} className="text-blue-500" />,
          iconBg: 'bg-blue-500/10', name: 'Google Calendar',
          source: !gcalConfigured ? 'Not configured' : 'Not connected',
          label: 'Set up →', onClick: () => setSetup('gcal'),
        })
      } else {
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
        list.push({
          kind: 'action', id: 'gcal-manage',
          icon: <Icon icon="Calendar" size={15} className="text-blue-500" />,
          iconBg: 'bg-blue-500/10', name: 'Manage connection', source: 'Google Calendar',
          label: 'Settings →', onClick: () => setSetup('gcal'),
        })
      }
    }

    if (!q || ['spotify','music','playing','song','track'].some((k) => k.includes(q) || q.includes(k))) {
      list.push({ kind: 'header', id: 'h-spotify', label: 'Spotify' })
      if (!spotifyConfigured || !spotifyConnected) {
        list.push({
          kind: 'action', id: 'spotify-setup',
          icon: <Icon icon="MusicNote" size={15} className="text-green-500" />,
          iconBg: 'bg-green-500/10', name: 'Spotify',
          source: !spotifyConfigured ? 'Not configured' : 'Not connected',
          label: 'Set up →', onClick: () => setSetup('spotify'),
        })
      } else {
        const added = widgets.some((w) => w.type === 'spotify-now-playing')
        list.push({
          kind: 'widget', id: 'spotify-npl',
          icon: <Icon icon="MusicNote" size={15} className="text-green-500" />,
          iconBg: 'bg-green-500/10', name: 'Now Playing', source: 'Spotify', added,
          onAdd: () => selectWidget({ type: 'spotify-now-playing', databaseTitle: 'Now Playing', width: 320, height: 180 }),
        })
        list.push({
          kind: 'action', id: 'spotify-manage',
          icon: <Icon icon="MusicNote" size={15} className="text-green-500" />,
          iconBg: 'bg-green-500/10', name: 'Manage connection', source: 'Spotify',
          label: 'Settings →', onClick: () => setSetup('spotify'),
        })
      }
    }

    return list
  }, [query, notionData, calData, gcalConnected, spotifyConnected, gcalConfigured, spotifyConfigured, widgets])

  const selectableItems = items.filter((i): i is Extract<ListItem, { kind: 'widget' | 'action' }> => i.kind !== 'header')

  useEffect(() => { setSelected(0) }, [query, setup])
  useEffect(() => {
    if (selectedIdx >= selectableItems.length) setSelected(Math.max(0, selectableItems.length - 1))
  }, [selectableItems.length])

  useEffect(() => {
    if (setup) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((i) => Math.min(i + 1, selectableItems.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = selectableItems[selectedIdx]
        if (!item) return
        if (item.kind === 'widget' && !item.added) item.onAdd()
        if (item.kind === 'action') item.onClick()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectableItems, selectedIdx, setup, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (setup && e.key === 'Escape') setSetup(null)
      if (!setup && e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setup, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const selectedItem = selectableItems[selectedIdx]

  return (
    <Panel width={580} style={{ height: 560 }} onClose={onClose}>
      {setup ? (
        setup === 'gcal'
          ? <GCalSetup    onBack={() => setSetup(null)} />
          : <SpotifySetup onBack={() => setSetup(null)} />
      ) : (
        <>
          {/* MagnifyingGlass */}
          <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
            <Icon icon="MagnifyingGlass" size={15} style={{ color: 'var(--wt-text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              placeholder="MagnifyingGlass widgets and integrations…"
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
                    <Text variant="label" size="small" color="muted" textTransform="uppercase">
                      {item.label}
                    </Text>
                  </div>
                )
              }
              const idx = selectableItems.findIndex((s) => s.id === item.id)
              return (
                <div key={item.id} data-idx={idx}>
                  <MenuItem
                    icon={item.icon}
                    iconBg={item.iconBg}
                    iconStyle={item.kind === 'widget' ? item.iconStyle : undefined}
                    name={item.name}
                    source={item.source}
                    label={item.kind === 'widget' ? (item.added ? 'On board' : 'Add') : item.label}
                    selected={idx === selectedIdx}
                    disabled={item.kind === 'widget' && item.added}
                    onClick={item.kind === 'widget' ? item.onAdd : item.onClick}
                    onMouseEnter={() => setSelected(idx)}
                  />
                </div>
              )
            })}
            <div className="h-1" />
          </div>

          {/* Bottom bar */}
          <div
            className="flex items-center justify-between px-4 py-2 flex-shrink-0"
            style={{ borderTop: '1px solid var(--wt-settings-divider)' }}
          >
            <div className="flex items-center gap-3">
              <Text variant="caption" size="small" color="muted" className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>↑↓</kbd>
                Navigate
              </Text>
              <Text variant="caption" size="small" color="muted" className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>↵</kbd>
                {selectedItem?.kind === 'widget' ? 'Add Widget' : selectedItem?.kind === 'action' ? selectedItem.label : 'Select'}
              </Text>
            </div>
            <Text variant="caption" size="small" color="muted" className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>Esc</kbd>
              Close
            </Text>
          </div>
        </>
      )}
    </Panel>
  )
}
