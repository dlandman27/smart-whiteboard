import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon, ScrollArea, Text, Button, Input } from '@whiteboard/ui-kit'
import { useGCalStatus, startGCalAuth, disconnectGCal } from '../hooks/useGCal'
import { useTasksStatus } from '../hooks/useTasks'
import { useSpotifyStatus, startSpotifyAuth } from '../hooks/useSpotify'
import { useSpotifyCredentials } from '../store/spotify'
import { apiFetch } from '../lib/apiFetch'

// ── Health services ──────────────────────────────────────────────────────────

interface HealthServices {
  notion: boolean; anthropic: boolean; elevenlabs: boolean
  youtube: boolean; bing: boolean; googleOauth: boolean
}

function useHealthServices() {
  const [services, setServices] = useState<HealthServices | null>(null)
  useEffect(() => {
    apiFetch<any>('/api/health')
      .then((d) => setServices(d.services ?? null))
      .catch(() => {})
  }, [])
  return services
}

// ── Connector definitions ────────────────────────────────────────────────────

type Category = 'all' | 'apps' | 'services'

interface ConnectorDef {
  id: string
  name: string
  description: string
  icon: string
  category: 'apps' | 'services'
}

const CONNECTORS: ConnectorDef[] = [
  { id: 'gcal',       name: 'Google Calendar', description: 'View and manage your calendar events on the whiteboard.',    icon: 'CalendarBlank',    category: 'apps' },
  { id: 'gtasks',     name: 'Google Tasks',    description: 'Sync your task lists and manage todos.',                     icon: 'CheckSquare',      category: 'apps' },
  { id: 'spotify',    name: 'Spotify',         description: 'Control playback and see what\'s currently playing.',        icon: 'MusicNote',        category: 'apps' },
  { id: 'notion',     name: 'Notion',          description: 'Read and write to your Notion databases.',                   icon: 'BookOpen',         category: 'services' },
  { id: 'anthropic',  name: 'Walli AI',        description: 'AI assistant powered by Anthropic.',                         icon: 'Robot',            category: 'services' },
  { id: 'elevenlabs', name: 'ElevenLabs',      description: 'Voice synthesis for Walli and daily briefings.',             icon: 'Microphone',       category: 'services' },
  { id: 'youtube',    name: 'YouTube',         description: 'Search and embed YouTube videos in widgets.',                icon: 'YoutubeLogo',      category: 'services' },
  { id: 'bing',       name: 'Bing Search',     description: 'Web search for Walli\'s research capabilities.',             icon: 'MagnifyingGlass',  category: 'services' },
]

// ── Enabled pill (horizontal row) ────────────────────────────────────────────

function EnabledPill({ icon, name }: { icon: string; name: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
      borderRadius: 12, padding: '10px 16px', flexShrink: 0, minWidth: 180,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'color-mix(in srgb, var(--wt-accent) 10%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon icon={icon as any} size={18} style={{ color: 'var(--wt-accent)' }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-text)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--wt-success)', fontWeight: 500 }}>Enabled</div>
      </div>
    </div>
  )
}

// ── Card (grid tile) ─────────────────────────────────────────────────────────

function AppCard({
  icon, name, description, connected, statusLabel,
  actionLabel, onAction, children,
}: {
  icon: string; name: string; description: string; connected: boolean
  statusLabel?: string; actionLabel?: string; onAction?: () => void
  children?: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        background:    'var(--wt-surface)',
        border:        `1px solid ${hovered ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
        borderRadius:  16,
        padding:       20,
        display:       'flex',
        flexDirection: 'column',
        gap:           14,
        transition:    'border-color 0.2s, box-shadow 0.2s',
        boxShadow:     hovered ? '0 0 0 1px color-mix(in srgb, var(--wt-accent) 20%, transparent)' : 'none',
      }}
    >
      {/* Icon + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: connected
            ? 'color-mix(in srgb, var(--wt-success) 10%, transparent)'
            : 'var(--wt-surface-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon icon={icon as any} size={22} style={{
            color: connected ? 'var(--wt-success)' : 'var(--wt-text)', opacity: connected ? 1 : 0.5,
          }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: connected ? 'var(--wt-success)' : 'var(--wt-text-muted)',
            opacity: connected ? 1 : 0.25,
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: connected ? 'var(--wt-success)' : 'var(--wt-text-muted)',
          }}>
            {statusLabel ?? (connected ? 'Connected' : 'Not connected')}
          </span>
        </div>
      </div>

      {/* Name + description */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--wt-text)', marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 13, color: 'var(--wt-text-muted)', lineHeight: 1.5 }}>{description}</div>
      </div>

      {/* Action */}
      {actionLabel && onAction && (
        <Button variant={connected ? 'ghost' : 'accent'} size="sm" onClick={onAction} fullWidth>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  )
}

// ── Google Calendar ──────────────────────────────────────────────────────────

function GCalCard({ googleOauth }: { googleOauth: boolean }) {
  const qc = useQueryClient()
  const { data } = useGCalStatus()
  const connected = !!data?.connected

  function openPopup() {
    startGCalAuth().then((url) => {
      const popup = window.open(url, 'gcal-auth', 'width=500,height=620,left=200,top=100')
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'gcal-connected') {
          qc.invalidateQueries({ queryKey: ['gcal-status'] })
          qc.invalidateQueries({ queryKey: ['gcal-events'] })
          window.removeEventListener('message', onMessage)
          popup?.close()
        }
      }
      window.addEventListener('message', onMessage)
    })
  }

  async function disconnect() {
    await disconnectGCal()
    qc.invalidateQueries({ queryKey: ['gcal-status'] })
    qc.invalidateQueries({ queryKey: ['gcal-events'] })
  }

  return (
    <AppCard
      icon="CalendarBlank" name="Google Calendar"
      description="View and manage your calendar events on the whiteboard."
      connected={connected}
      actionLabel={connected ? 'Disconnect' : googleOauth ? 'Connect' : 'Not available'}
      onAction={connected ? disconnect : googleOauth ? openPopup : undefined}
    />
  )
}

// ── Google Tasks ─────────────────────────────────────────────────────────────

function GTasksCard({ googleOauth }: { googleOauth: boolean }) {
  const qc = useQueryClient()
  const { data } = useTasksStatus()
  const connected = !!data?.connected

  function openPopup() {
    startGCalAuth().then((url) => {
      const popup = window.open(url, 'gcal-auth', 'width=500,height=620,left=200,top=100')
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'gcal-connected') {
          qc.invalidateQueries({ queryKey: ['gtasks-status'] })
          qc.invalidateQueries({ queryKey: ['gtasks-lists'] })
          window.removeEventListener('message', onMessage)
          popup?.close()
        }
      }
      window.addEventListener('message', onMessage)
    })
  }

  return (
    <AppCard
      icon="CheckSquare" name="Google Tasks"
      description="Sync your task lists and manage todos."
      connected={connected}
      actionLabel={connected ? undefined : googleOauth ? 'Connect' : undefined}
      onAction={connected ? undefined : googleOauth ? openPopup : undefined}
    />
  )
}

// ── Spotify ──────────────────────────────────────────────────────────────────

function SpotifyCard() {
  const creds = useSpotifyCredentials()
  const status = useSpotifyStatus()
  const [expanded, setExpanded] = useState(false)
  const connected = !!status.data?.connected
  const configured = !!(creds.clientId && creds.clientSecret)

  async function connect() {
    const url = await startSpotifyAuth(creds.clientId, creds.clientSecret, creds.redirectUri)
    window.open(url, '_blank', 'width=500,height=700')
  }

  return (
    <AppCard
      icon="MusicNote" name="Spotify"
      description="Control playback and see what's currently playing."
      connected={connected}
      actionLabel={connected ? 'Connected' : expanded ? undefined : 'Set up'}
      onAction={connected ? undefined : () => setExpanded(true)}
    >
      {expanded && !connected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input label="Client ID" value={creds.clientId} onChange={(e) => creds.set({ clientId: e.target.value })} placeholder="Your Spotify app client ID" />
          <Input label="Client Secret" value={creds.clientSecret} onChange={(e) => creds.set({ clientSecret: e.target.value })} type="password" />
          <Input label="Redirect URI" value={creds.redirectUri} onChange={(e) => creds.set({ redirectUri: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="accent" size="sm" disabled={!configured} onClick={connect} fullWidth>Connect Spotify</Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </AppCard>
  )
}

// ── Service card (static) ────────────────────────────────────────────────────

function ServiceCard({ icon, name, description, configured }: {
  icon: string; name: string; description: string; configured: boolean
}) {
  return (
    <AppCard
      icon={icon} name={name} description={description}
      connected={configured}
      statusLabel={configured ? 'Active' : 'Not configured'}
    />
  )
}

// ── Category tab ─────────────────────────────────────────────────────────────

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 500,
        background: active ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
        color: active ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export function ConnectorsBoardView() {
  const services = useHealthServices()
  const s = services ?? {
    notion: false, anthropic: false, elevenlabs: false,
    youtube: false, bing: false, googleOauth: false,
  }
  const gcalStatus = useGCalStatus()
  const tasksStatus = useTasksStatus()
  const spotifyStatus = useSpotifyStatus()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')

  // Build enabled list
  const enabledMap: Record<string, boolean> = {
    gcal:       !!gcalStatus.data?.connected,
    gtasks:     !!tasksStatus.data?.connected,
    spotify:    !!spotifyStatus.data?.connected,
    notion:     s.notion,
    anthropic:  s.anthropic,
    elevenlabs: s.elevenlabs,
    youtube:    s.youtube,
    bing:       s.bing,
  }
  const enabledConnectors = CONNECTORS.filter(c => enabledMap[c.id])

  // Filter
  const query = search.toLowerCase().trim()
  const filtered = CONNECTORS
    .filter(c => category === 'all' || c.category === category)
    .filter(c => !query || c.name.toLowerCase().includes(query))

  const hasResults = filtered.length > 0

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--wt-bg)' }}>

      {/* Header */}
      <div className="flex-shrink-0 px-6" style={{ paddingTop: 28, paddingBottom: 0 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Text variant="heading" size="medium" style={{ fontWeight: 700, color: 'var(--wt-text)', fontSize: 22 }}>
            Integrations
          </Text>
          <Text variant="body" size="medium" color="muted" style={{ marginTop: 4 }}>
            Enhance your whiteboard with apps and services.
          </Text>

          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginTop: 20,
            background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
            borderRadius: 12, padding: '12px 16px',
          }}>
            <Icon icon="MagnifyingGlass" size={18} style={{ color: 'var(--wt-text-muted)', flexShrink: 0, opacity: 0.4 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--wt-text)', fontSize: 15,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)', padding: 2 }}
              >
                <Icon icon="X" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="wt-scroll" style={{ flex: 1 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 24px 48px' }}>

          {/* Enabled row */}
          {enabledConnectors.length > 0 && !query && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--wt-text-muted)', opacity: 0.5,
                }}>
                  Enabled
                </span>
              </div>
              <div style={{
                display: 'flex', gap: 10, overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
              }}>
                {enabledConnectors.map(c => (
                  <EnabledPill key={c.id} icon={c.icon} name={c.name} />
                ))}
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
            <CategoryTab label="All" active={category === 'all'} onClick={() => setCategory('all')} />
            <CategoryTab label="Apps" active={category === 'apps'} onClick={() => setCategory('apps')} />
            <CategoryTab label="Services" active={category === 'services'} onClick={() => setCategory('services')} />
          </div>

          {/* Grid */}
          {hasResults ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
              gap: 14,
            }}>
              {filtered.map(c => {
                if (c.id === 'gcal')    return <GCalCard key={c.id} googleOauth={s.googleOauth} />
                if (c.id === 'gtasks')  return <GTasksCard key={c.id} googleOauth={s.googleOauth} />
                if (c.id === 'spotify') return <SpotifyCard key={c.id} />
                return (
                  <ServiceCard
                    key={c.id}
                    icon={c.icon}
                    name={c.name}
                    description={c.description}
                    configured={enabledMap[c.id]}
                  />
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--wt-text-muted)', fontSize: 14 }}>
              No integrations match "{search}"
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  )
}
