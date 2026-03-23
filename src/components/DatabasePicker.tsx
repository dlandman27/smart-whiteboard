import { useEffect, useMemo, useRef, useState } from 'react'
import { Database, X, Calendar, Music, Search, ChevronLeft, ExternalLink } from 'lucide-react'
import { getAllWidgetDefs } from './widgets/registry'
import { Icon, IconButton } from '../ui/web'
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

// ── List item types ───────────────────────────────────────────────────────────

type ListItem =
  | { kind: 'header'; id: string; label: string }
  | { kind: 'widget'; id: string; icon: React.ReactNode; iconBg: string; iconColor?: string; name: string; source: string; added: boolean; onAdd: () => void }
  | { kind: 'action'; id: string; icon: React.ReactNode; iconBg: string; name: string; source: string; label: string; onClick: () => void }

type SetupView = 'gcal' | 'spotify'

// ── Credential field ──────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, placeholder }: {
  label: string; type?: 'text' | 'password'
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--wt-settings-label)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="wt-input w-full px-3 py-2.5 text-sm rounded-xl"
      />
    </div>
  )
}

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
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
        <button onClick={onBack} className="wt-action-btn" style={{ width: 28, height: 28, borderRadius: 8 }}>
          <Icon icon={ChevronLeft} size={16} />
        </button>
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Icon icon={Calendar} size={15} className="text-blue-500" />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--wt-text)' }}>Google Calendar</span>
        {status.data?.connected && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Connected</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto settings-scroll px-4 py-4 space-y-3">
        <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
          Create an OAuth 2.0 credential in{' '}
          <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--wt-accent)' }}>
            Google Cloud Console
          </a>{' '}
          and add <code className="px-1 rounded text-xs" style={{ backgroundColor: 'var(--wt-surface)' }}>
            {creds.redirectUri}
          </code>{' '}
          as an authorized redirect URI.
        </p>

        <Field label="Client ID" value={creds.clientId} onChange={(v) => creds.set({ clientId: v })} placeholder="From Google Cloud Console" />
        <Field label="Client Secret" type="password" value={creds.clientSecret} onChange={(v) => creds.set({ clientSecret: v })} />
        <Field label="Redirect URI" value={creds.redirectUri} onChange={(v) => creds.set({ redirectUri: v })} />

        <button
          onClick={connect}
          disabled={!ready}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}
        >
          <Icon icon={ExternalLink} size={14} />
          {status.data?.connected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
        </button>
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
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
        <button onClick={onBack} className="wt-action-btn" style={{ width: 28, height: 28, borderRadius: 8 }}>
          <Icon icon={ChevronLeft} size={16} />
        </button>
        <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <Icon icon={Music} size={15} className="text-green-500" />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--wt-text)' }}>Spotify</span>
        {status.data?.connected && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Connected</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto settings-scroll px-4 py-4 space-y-3">
        <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
          Create a Spotify app at{' '}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--wt-accent)' }}>
            developer.spotify.com
          </a>{' '}
          and add your redirect URI to the allowed list.
        </p>

        <Field label="Client ID" value={creds.clientId} onChange={(v) => creds.set({ clientId: v })} placeholder="ef32f0586e5340e2929a7c77c3521afa" />
        <Field label="Client Secret" type="password" value={creds.clientSecret} onChange={(v) => creds.set({ clientSecret: v })} />
        <Field label="Redirect URI" value={creds.redirectUri} onChange={(v) => creds.set({ redirectUri: v })} placeholder="https://xxxx.ngrok-free.app/api/spotify/callback" />

        <button
          onClick={connect}
          disabled={!ready}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-opacity disabled:opacity-40 bg-green-500 text-white hover:bg-green-600"
        >
          <Icon icon={ExternalLink} size={14} />
          {status.data?.connected ? 'Reconnect Spotify' : 'Connect Spotify'}
        </button>
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({ item, selected, onMouseEnter }: {
  item: Extract<ListItem, { kind: 'widget' | 'action' }>
  selected: boolean
  onMouseEnter: () => void
}) {
  return (
    <button
      onMouseEnter={onMouseEnter}
      onClick={item.kind === 'widget' ? item.onAdd : item.onClick}
      disabled={item.kind === 'widget' && item.added}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left disabled:opacity-40"
      style={{ backgroundColor: selected ? 'var(--wt-surface-hover)' : 'transparent', borderRadius: 10 }}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconColor ? '' : item.iconBg}`}
        style={item.iconColor ? { background: item.iconColor } : undefined}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--wt-text)' }}>{item.name}</span>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--wt-text-muted)' }}>{item.source}</span>
      </div>
      <span className="text-xs flex-shrink-0 transition-opacity" style={{ color: 'var(--wt-text-muted)', opacity: selected ? 1 : 0 }}>
        {item.kind === 'widget' ? (item.added ? 'On board' : 'Add') : item.label}
      </span>
    </button>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-settings-label)' }}>
        {label}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DatabasePicker({ onClose, onWidgetSelected }: Props) {
  const [query,      setQuery]   = useState('')
  const [selectedIdx, setSelected] = useState(0)
  const [setup,      setSetup]   = useState<SetupView | null>(null)
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

  // ── Build flat list ──────────────────────────────────────────────────────────

  const items = useMemo<ListItem[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = (keywords: string[], name: string) =>
      !q || name.toLowerCase().includes(q) || keywords.some((kw) => kw.includes(q) || q.includes(kw))

    const list: ListItem[] = []

    // Utilities
    const utilDefs = getAllWidgetDefs().filter((d) => matches(d.keywords, d.label))
    if (utilDefs.length > 0) {
      if (!q) list.push({ kind: 'header', id: 'h-util', label: 'Utilities' })
      for (const def of utilDefs) {
        const added = widgets.some((w) => w.type === def.type)
        list.push({
          kind: 'widget', id: `util-${def.type}`,
          icon: <Icon icon={def.Icon} size={15} className={def.iconClass} />,
          iconBg: def.iconBg, name: def.label, source: 'Built-in', added,
          onAdd: () => selectWidget({ type: def.type, databaseTitle: def.label, ...def.defaultSize }),
        })
      }
    }

    // Notion
    const notionResults: any[] = notionData?.results ?? []
    const notionFiltered = notionResults.filter((db) => matches(['notion', 'database'], dbTitle(db)))
    if (health.data?.configured && notionFiltered.length > 0) {
      if (!q) list.push({ kind: 'header', id: 'h-notion', label: 'Notion' })
      for (const db of notionFiltered) {
        const added = widgets.some((w) => w.databaseId === db.id)
        list.push({
          kind: 'widget', id: `notion-${db.id}`,
          icon: <Icon icon={Database} size={15} className="text-blue-500" />,
          iconBg: 'bg-blue-500/10', name: dbTitle(db), source: 'Notion', added,
          onAdd: () => selectWidget({ type: 'database', databaseId: db.id, databaseTitle: dbTitle(db), width: 500, height: 380 }),
        })
      }
    }

    // Google Calendar
    if (!q || 'google calendar'.includes(q) || ['calendar','google','gcal'].some((k) => k.includes(q) || q.includes(k))) {
      const calResults: any[] = calData?.items ?? []
      const calFiltered = calResults.filter((c) => matches(['calendar', 'google'], c.summary))
      list.push({ kind: 'header', id: 'h-gcal', label: 'Google Calendar' })

      if (!gcalConfigured || !gcalConnected) {
        list.push({
          kind: 'action', id: 'gcal-setup',
          icon: <Icon icon={Calendar} size={15} className="text-blue-500" />,
          iconBg: 'bg-blue-500/10', name: 'Google Calendar',
          source: !gcalConfigured ? 'Not configured' : 'Not connected',
          label: 'Set up →',
          onClick: () => setSetup('gcal'),
        })
      } else {
        for (const cal of calFiltered) {
          const added = widgets.some((w) => w.calendarId === cal.id)
          list.push({
            kind: 'widget', id: `cal-${cal.id}`,
            icon: <Icon icon={Calendar} size={15} className="text-white" />,
            iconBg: '', iconColor: cal.backgroundColor ?? '#4285f4',
            name: cal.summary, source: 'Google Calendar', added,
            onAdd: () => selectWidget({ type: 'calendar', calendarId: cal.id, databaseTitle: cal.summary, width: 380, height: 460 }),
          })
        }
        // Always show a manage option
        list.push({ kind: 'action', id: 'gcal-manage', icon: <Icon icon={Calendar} size={15} className="text-blue-500" />, iconBg: 'bg-blue-500/10', name: 'Manage connection', source: 'Google Calendar', label: 'Settings →', onClick: () => setSetup('gcal') })
      }
    }

    // Spotify
    if (!q || ['spotify','music','playing','song','track'].some((k) => k.includes(q) || q.includes(k))) {
      list.push({ kind: 'header', id: 'h-spotify', label: 'Spotify' })
      if (!spotifyConfigured || !spotifyConnected) {
        list.push({
          kind: 'action', id: 'spotify-setup',
          icon: <Icon icon={Music} size={15} className="text-green-500" />,
          iconBg: 'bg-green-500/10', name: 'Spotify',
          source: !spotifyConfigured ? 'Not configured' : 'Not connected',
          label: 'Set up →',
          onClick: () => setSetup('spotify'),
        })
      } else {
        const added = widgets.some((w) => w.type === 'spotify-now-playing')
        list.push({
          kind: 'widget', id: 'spotify-npl',
          icon: <Icon icon={Music} size={15} className="text-green-500" />,
          iconBg: 'bg-green-500/10', name: 'Now Playing', source: 'Spotify', added,
          onAdd: () => selectWidget({ type: 'spotify-now-playing', databaseTitle: 'Now Playing', width: 320, height: 180 }),
        })
        list.push({ kind: 'action', id: 'spotify-manage', icon: <Icon icon={Music} size={15} className="text-green-500" />, iconBg: 'bg-green-500/10', name: 'Manage connection', source: 'Spotify', label: 'Settings →', onClick: () => setSetup('spotify') })
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
    <>
      <div className="fixed inset-0 z-[10000]" onClick={onClose} />

      <div
        className="fixed bottom-20 left-1/2 z-[10001] flex flex-col rounded-2xl overflow-hidden"
        style={{
          transform:       'translateX(-50%)',
          width:           580,
          height:          560,
          backgroundColor: 'var(--wt-settings-bg)',
          border:          '1px solid var(--wt-settings-border)',
          boxShadow:       'var(--wt-shadow-lg)',
          backdropFilter:  'var(--wt-backdrop)',
          animation:       'slideUp 0.15s ease-out',
        }}
      >
        {setup ? (
          // ── Setup view ───────────────────────────────────────────────────────
          setup === 'gcal'
            ? <GCalSetup    onBack={() => setSetup(null)} />
            : <SpotifySetup onBack={() => setSetup(null)} />
        ) : (
          // ── List view ────────────────────────────────────────────────────────
          <>
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
              <Icon icon={Search} size={15} style={{ color: 'var(--wt-text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                placeholder="Search widgets and integrations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--wt-text)' }}
              />
              <IconButton icon={X} onClick={onClose} />
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto settings-scroll px-2 py-1">
              {items.length === 0 && (
                <p className="py-10 text-sm text-center" style={{ color: 'var(--wt-text-muted)' }}>
                  No results for &ldquo;{query}&rdquo;
                </p>
              )}
              {items.map((item) => {
                if (item.kind === 'header') return <SectionHeader key={item.id} label={item.label} />
                const idx = selectableItems.findIndex((s) => s.id === item.id)
                return (
                  <div key={item.id} data-idx={idx}>
                    <Row item={item} selected={idx === selectedIdx} onMouseEnter={() => setSelected(idx)} />
                  </div>
                )
              })}
              <div className="h-1" />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 text-xs" style={{ borderTop: '1px solid var(--wt-settings-divider)', color: 'var(--wt-text-muted)' }}>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>↵</kbd>
                  {selectedItem?.kind === 'widget' ? 'Add Widget' : selectedItem?.kind === 'action' ? selectedItem.label : 'Select'}
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}>Esc</kbd>
                Close
              </span>
            </div>
          </>
        )}
      </div>
    </>
  )
}
