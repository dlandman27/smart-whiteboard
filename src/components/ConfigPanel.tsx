import { useEffect, useState } from 'react'
import { Panel, PanelHeader, Input, Button, Text } from '@whiteboard/ui-kit'
import { useGCalStatus, startGCalAuth } from '../hooks/useGCal'
import { useSpotifyStatus, startSpotifyAuth } from '../hooks/useSpotify'
import { useGCalCredentials } from '../store/gcal'
import { useSpotifyCredentials } from '../store/spotify'

interface Props {
  onClose: () => void
}

// ── Morning Briefing ──────────────────────────────────────────────────────────

function BriefingSection() {
  const [time,  setTime]  = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/briefing/settings').then(r => r.json()).then((d: any) => setTime(d.time ?? ''))
  }, [])

  async function save() {
    await fetch('/api/briefing/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function preview() {
    const r = await fetch('/api/briefing')
    const { text } = await r.json() as any
    if (text) {
      const { useBriefingStore } = await import('../store/briefing')
      useBriefingStore.getState().trigger(text)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Text variant="body" size="small" color="muted">
        Walli greets you with weather, calendar, tasks, and sports at this time each day.
      </Text>
      <div className="flex gap-2 items-center">
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="flex-1"
          style={{
            padding: '6px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        />
        <button
          onClick={save}
          style={{
            padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: saved ? 'var(--wt-surface)' : 'var(--wt-accent)',
            color: saved ? 'var(--wt-text-muted)' : 'var(--wt-accent-text)',
          }}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <button
        onClick={preview}
        style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
          background: 'var(--wt-surface)', color: 'var(--wt-text)', border: '1px solid var(--wt-border)',
        }}
      >
        Preview briefing now
      </button>
    </div>
  )
}

// ── Connection row ─────────────────────────────────────────────────────────────

function ConnectionRow({
  name, connected, configured, onSetup, children,
}: {
  name:        string
  connected:   boolean
  configured:  boolean
  onSetup:     () => void
  children?:   React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--wt-text)' }}>{name}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{
              background: connected ? 'color-mix(in srgb, #22c55e 15%, transparent)' : 'color-mix(in srgb, var(--wt-text) 8%, transparent)',
              color:      connected ? '#22c55e' : 'var(--wt-text-muted)',
            }}
          >
            {connected ? 'Connected' : configured ? 'Not connected' : 'Not set up'}
          </span>
        </div>
        <button
          onClick={onSetup}
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--wt-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          {connected ? 'Manage' : 'Set up'}
        </button>
      </div>
      {children}
    </div>
  )
}

// ── GCal setup ────────────────────────────────────────────────────────────────

function GCalSection() {
  const creds  = useGCalCredentials()
  const status = useGCalStatus()
  const [expanded, setExpanded] = useState(!creds.clientId)
  const connected   = !!status.data?.connected
  const configured  = !!(creds.clientId && creds.clientSecret)

  async function connect() {
    const url = await startGCalAuth(creds.clientId, creds.clientSecret, creds.redirectUri)
    window.open(url, '_blank', 'width=500,height=600')
  }

  return (
    <ConnectionRow name="Google Calendar" connected={connected} configured={configured} onSetup={() => setExpanded((e) => !e)}>
      {expanded && (
        <div className="flex flex-col gap-2 pl-1">
          <Text variant="body" size="small" color="muted">
            Create an OAuth 2.0 credential in{' '}
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--wt-accent)' }}>
              Google Cloud Console
            </a>{' '}
            and add{' '}
            <code className="px-1 rounded text-xs" style={{ backgroundColor: 'var(--wt-surface)' }}>{creds.redirectUri}</code>{' '}
            as an authorized redirect URI.
          </Text>
          <Input label="Client ID"     value={creds.clientId}     onChange={(e) => creds.set({ clientId:     e.target.value })} placeholder="From Google Cloud Console" />
          <Input label="Client Secret" value={creds.clientSecret} onChange={(e) => creds.set({ clientSecret: e.target.value })} type="password" />
          <Input label="Redirect URI"  value={creds.redirectUri}  onChange={(e) => creds.set({ redirectUri:  e.target.value })} />
          <Button variant="accent" fullWidth disabled={!configured} onClick={connect}>
            {connected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
          </Button>
        </div>
      )}
    </ConnectionRow>
  )
}

// ── Spotify setup ─────────────────────────────────────────────────────────────

function SpotifySection() {
  const creds  = useSpotifyCredentials()
  const status = useSpotifyStatus()
  const [expanded, setExpanded] = useState(!creds.clientId)
  const connected  = !!status.data?.connected
  const configured = !!(creds.clientId && creds.clientSecret)

  async function connect() {
    const url = await startSpotifyAuth(creds.clientId, creds.clientSecret, creds.redirectUri)
    window.open(url, '_blank', 'width=500,height=700')
  }

  return (
    <ConnectionRow name="Spotify" connected={connected} configured={configured} onSetup={() => setExpanded((e) => !e)}>
      {expanded && (
        <div className="flex flex-col gap-2 pl-1">
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
          <Button variant="accent" fullWidth disabled={!configured} onClick={connect}>
            {connected ? 'Reconnect Spotify' : 'Connect Spotify'}
          </Button>
        </div>
      )}
    </ConnectionRow>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

type Tab = 'briefing' | 'connections'

const TABS: { id: Tab; label: string }[] = [
  { id: 'briefing',    label: 'Briefing'     },
  { id: 'connections', label: 'Connections'  },
]

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex items-center px-3" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className="px-4 py-2.5 text-xs font-semibold transition-colors"
          style={{
            color:        tab === t.id ? 'var(--wt-text)' : 'var(--wt-text-muted)',
            borderTop:    'none', borderLeft: 'none', borderRight: 'none',
            borderBottom: tab === t.id ? '2px solid var(--wt-accent)' : '2px solid transparent',
            marginBottom: -1,
            background:   'none',
            cursor:       'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function ConfigPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('briefing')

  return (
    <Panel width={420} onClose={onClose}>
      <PanelHeader title="Settings" onClose={onClose} />
      <TabBar tab={tab} setTab={setTab} />
      <div className="px-4 py-4 overflow-y-auto settings-scroll" style={{ height: 480 }}>
        {tab === 'briefing'    && <BriefingSection />}
        {tab === 'connections' && (
          <div className="flex flex-col gap-4">
            <GCalSection />
            <SpotifySection />
          </div>
        )}
      </div>
    </Panel>
  )
}
