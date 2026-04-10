import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FlexCol, FlexRow, Box, Text, Button, ScrollArea, Icon,
} from '@whiteboard/ui-kit'
import { useGCalStatus, startGCalAuth, disconnectGCal } from '../hooks/useGCal'
import { useTasksStatus } from '../hooks/useTasks'
import { useSpotifyStatus, startSpotifyAuth } from '../hooks/useSpotify'
import { useSpotifyCredentials } from '../store/spotify'
import { Input } from '@whiteboard/ui-kit'

// ── Health services type ──────────────────────────────────────────────────────

interface HealthServices {
  notion:      boolean
  anthropic:   boolean
  elevenlabs:  boolean
  youtube:     boolean
  bing:        boolean
  googleOauth: boolean
}

function useHealthServices() {
  const [services, setServices] = useState<HealthServices | null>(null)
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: any) => setServices(d.services ?? null))
      .catch(() => {})
  }, [])
  return services
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      variant="label"
      size="small"
      style={{
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight:    700,
        opacity:       0.5,
      }}
      color="muted"
    >
      {children}
    </Text>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <span
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        padding:      '2px 10px',
        borderRadius: 999,
        fontSize:     11,
        fontWeight:   600,
        background:   connected
          ? 'color-mix(in srgb, var(--wt-success) 12%, transparent)'
          : 'var(--wt-surface-hover)',
        color:        connected ? 'var(--wt-success)' : 'var(--wt-text-muted)',
        border:       connected
          ? '1px solid color-mix(in srgb, var(--wt-success) 25%, transparent)'
          : '1px solid var(--wt-border)',
      }}
    >
      {label ?? (connected ? 'Connected' : 'Not connected')}
    </span>
  )
}

// ── Connector card ────────────────────────────────────────────────────────────

function ConnectorCard({
  iconName,
  name,
  description,
  connected,
  configuredLabel,
  actionLabel,
  onAction,
  children,
}: {
  iconName:        string
  name:            string
  description:     string
  connected:       boolean
  configuredLabel?: string
  actionLabel?:    string
  onAction?:       () => void
  children?:       React.ReactNode
}) {
  return (
    <div
      style={{
        background:    'var(--wt-surface)',
        border:        '1px solid var(--wt-border)',
        borderRadius:  12,
        padding:       20,
        display:       'flex',
        flexDirection: 'column',
        gap:           14,
      }}
    >
      <FlexRow align="center" gap="sm">
        <div
          style={{
            width:           40,
            height:          40,
            borderRadius:    10,
            flexShrink:      0,
            background:      'var(--wt-surface-hover)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <Icon
            icon={iconName as any}
            size={20}
            style={{ color: 'var(--wt-text)', opacity: 0.7 }}
          />
        </div>
        <FlexCol gap="none" style={{ flex: 1, minWidth: 0 }}>
          <Text variant="heading" size="small" style={{ fontWeight: 600 }}>
            {name}
          </Text>
          <Text variant="body" size="small" color="muted" style={{ marginTop: 1 }}>
            {description}
          </Text>
        </FlexCol>
        <FlexRow align="center" gap="sm" style={{ flexShrink: 0 }}>
          {configuredLabel ? (
            <StatusBadge connected={connected} label={configuredLabel} />
          ) : (
            <StatusBadge connected={connected} />
          )}
          {actionLabel && onAction && (
            <Button
              variant={connected ? 'ghost' : 'accent'}
              size="sm"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </FlexRow>
      </FlexRow>

      {children}
    </div>
  )
}

// ── Google Calendar card ──────────────────────────────────────────────────────

function GCalCard({ googleOauth }: { googleOauth: boolean }) {
  const qc        = useQueryClient()
  const { data }  = useGCalStatus()
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
    <ConnectorCard
      iconName="CalendarBlank"
      name="Google Calendar"
      description="Sync your Google Calendar events to the whiteboard."
      connected={connected}
      actionLabel={connected ? 'Disconnect' : googleOauth ? 'Connect' : undefined}
      onAction={connected ? disconnect : googleOauth ? openPopup : undefined}
    >
      {!googleOauth && (
        <Text variant="body" size="small" color="muted">
          Set <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>GOOGLE_CLIENT_ID</code> and{' '}
          <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>GOOGLE_CLIENT_SECRET</code> in your{' '}
          <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>.env</code> to enable Google OAuth.
        </Text>
      )}
    </ConnectorCard>
  )
}

// ── Google Tasks card ────────────────────────────────────────────────────────

function GTasksCard({ googleOauth }: { googleOauth: boolean }) {
  const qc        = useQueryClient()
  const { data }  = useTasksStatus()
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
    <ConnectorCard
      iconName="CheckSquare"
      name="Google Tasks"
      description="Sync your Google Tasks lists to the Todo board."
      connected={connected}
      actionLabel={connected ? undefined : googleOauth ? 'Connect' : undefined}
      onAction={connected ? undefined : googleOauth ? openPopup : undefined}
    >
      {!googleOauth && (
        <Text variant="body" size="small" color="muted">
          Set <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>GOOGLE_CLIENT_ID</code> and{' '}
          <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>GOOGLE_CLIENT_SECRET</code> in your{' '}
          <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>.env</code> to enable Google OAuth.
        </Text>
      )}
      {connected && (
        <Text variant="body" size="small" color="muted">
          Google Tasks shares credentials with Google Calendar. Connected automatically.
        </Text>
      )}
    </ConnectorCard>
  )
}

// ── Spotify card ──────────────────────────────────────────────────────────────

function SpotifyCard() {
  const creds      = useSpotifyCredentials()
  const status     = useSpotifyStatus()
  const [expanded, setExpanded] = useState(!creds.clientId)
  const connected  = !!status.data?.connected
  const configured = !!(creds.clientId && creds.clientSecret)

  async function connect() {
    const url = await startSpotifyAuth(creds.clientId, creds.clientSecret, creds.redirectUri)
    window.open(url, '_blank', 'width=500,height=700')
  }

  return (
    <ConnectorCard
      iconName="MusicNote"
      name="Spotify"
      description="Control Spotify playback and display now-playing on the board."
      connected={connected}
      actionLabel={connected ? 'Disconnect' : 'Configure'}
      onAction={() => setExpanded((e) => !e)}
    >
      {expanded && (
        <FlexCol gap="sm" style={{ paddingLeft: 4 }}>
          <Text variant="body" size="small" color="muted">
            Create a Spotify app at{' '}
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--wt-accent)', textDecoration: 'underline' }}
            >
              developer.spotify.com
            </a>{' '}
            and add your redirect URI to the allowed list.
          </Text>
          <Input
            label="Client ID"
            value={creds.clientId}
            onChange={(e) => creds.set({ clientId: e.target.value })}
            placeholder="ef32f0586e5340e2929a7c77c3521afa"
          />
          <Input
            label="Client Secret"
            value={creds.clientSecret}
            onChange={(e) => creds.set({ clientSecret: e.target.value })}
            type="password"
          />
          <Input
            label="Redirect URI"
            value={creds.redirectUri}
            onChange={(e) => creds.set({ redirectUri: e.target.value })}
            placeholder="https://xxxx.ngrok-free.app/api/spotify/callback"
          />
          <Button variant="accent" fullWidth disabled={!configured} onClick={connect}>
            {connected ? 'Reconnect Spotify' : 'Connect Spotify'}
          </Button>
        </FlexCol>
      )}
    </ConnectorCard>
  )
}

// ── Env-var connector card (static) ──────────────────────────────────────────

function EnvCard({
  iconName, name, description, configured, envKey,
}: {
  iconName:    string
  name:        string
  description: string
  configured:  boolean
  envKey:      string
}) {
  return (
    <ConnectorCard
      iconName={iconName}
      name={name}
      description={description}
      connected={configured}
      configuredLabel={configured ? 'Configured' : 'Not configured'}
    >
      {!configured && (
        <Text variant="body" size="small" color="muted">
          Set <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>{envKey}</code> in your{' '}
          <code style={{ background: 'var(--wt-bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>.env</code> file to enable this service.
        </Text>
      )}
    </ConnectorCard>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function ConnectorsBoardView() {
  const services = useHealthServices()
  const s = services ?? {
    notion: false, anthropic: false, elevenlabs: false,
    youtube: false, bing: false, googleOauth: false,
  }

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'var(--wt-bg)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center px-6 gap-3"
        style={{
          height:       64,
          borderBottom: '1px solid var(--wt-border)',
        }}
      >
        <Icon icon="Plugs" size={22} style={{ color: 'var(--wt-accent)', flexShrink: 0 }} />
        <div>
          <Text variant="label" size="medium" style={{ fontWeight: 700, color: 'var(--wt-text)', lineHeight: 1.2 }}>
            Connectors
          </Text>
          <Text variant="body" size="small" color="muted" style={{ lineHeight: 1.4 }}>
            Connect services to power your widgets and AI assistant.
          </Text>
        </div>
      </div>

      {/* Body */}
      <ScrollArea style={{ flex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>
          <FlexCol gap="lg">

            {/* OAuth group */}
            <FlexCol gap="sm">
              <SectionLabel>Connected Apps</SectionLabel>
              <FlexCol gap="sm">
                <GCalCard googleOauth={s.googleOauth} />
                <GTasksCard googleOauth={s.googleOauth} />
                <SpotifyCard />
              </FlexCol>
            </FlexCol>

            {/* API Keys group */}
            <FlexCol gap="sm">
              <SectionLabel>API Services</SectionLabel>
              <FlexCol gap="sm">
                <EnvCard
                  iconName="BookOpen"
                  name="Notion"
                  description="Read and write to your Notion databases for tasks and notes."
                  configured={s.notion}
                  envKey="NOTION_API_KEY"
                />
                <EnvCard
                  iconName="Robot"
                  name="Anthropic (Walli AI)"
                  description="Powers Walli, the AI assistant built into the whiteboard."
                  configured={s.anthropic}
                  envKey="ANTHROPIC_API_KEY"
                />
                <EnvCard
                  iconName="Microphone"
                  name="ElevenLabs (Voice)"
                  description="Text-to-speech voice synthesis for Walli and briefings."
                  configured={s.elevenlabs}
                  envKey="ELEVENLABS_API_KEY"
                />
                <EnvCard
                  iconName="YoutubeLogo"
                  name="YouTube"
                  description="Fetch YouTube video data and embed content in widgets."
                  configured={s.youtube}
                  envKey="YOUTUBE_API_KEY"
                />
                <EnvCard
                  iconName="MagnifyingGlass"
                  name="Bing Search"
                  description="Web search capability for Walli's research tools."
                  configured={s.bing}
                  envKey="BING_API_KEY"
                />
              </FlexCol>
            </FlexCol>

          </FlexCol>
        </div>
      </ScrollArea>
    </div>
  )
}
