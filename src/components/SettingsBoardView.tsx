import React, { useState, useEffect } from 'react'
import { FlexRow, FlexCol, Box, Text, Icon, ScrollArea, Button, Input } from '@whiteboard/ui-kit'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ThemePicker } from './ThemePicker'
import { SchedulePanel } from './SchedulePanel'
import { AgentManager } from './AgentManager'
import { useThemeStore } from '../store/theme'
import { useWhiteboardStore } from '../store/whiteboard'
import { useGCalStatus, startGCalAuth, disconnectGCal } from '../hooks/useGCal'
import { useTasksStatus } from '../hooks/useTasks'
import { apiFetch } from '../lib/apiFetch'
import { ProviderIcon } from './ProviderIcon'
import { WhiteboardBackground } from './WhiteboardBackground'
import { SPRITES, PX, PixelSprite } from './PetBar'

// ── SectionLabel helper ───────────────────────────────────────────────────────

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

// ── Section: Appearance ───────────────────────────────────────────────────────

function AppearanceSection() {
  return (
    <FlexCol gap="5">
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Theme</SectionLabel>
        </div>
        <ThemePicker />
      </div>

    </FlexCol>
  )
}

// ── Section: General ──────────────────────────────────────────────────────────

const SPRITE_NAMES: Record<string, string> = {
  cat: 'Cat', dog: 'Dog', robot: 'Robot', bunny: 'Bunny',
  ghost: 'Ghost', owl: 'Owl', bear: 'Bear', frog: 'Frog',
  penguin: 'Penguin', alien: 'Alien', dragon: 'Dragon', fox: 'Fox',
  wizard: 'Wizard', ninja: 'Ninja', dino: 'Dino', astronaut: 'Astro',
}

function PetsSection() {
  const { petsEnabled, setPetsEnabled } = useThemeStore()

  return (
    <FlexCol gap="md">
      {/* Toggle card */}
      <div
        style={{
          background:   'var(--wt-surface)',
          border:       '1px solid var(--wt-border)',
          borderRadius: 12,
          padding:      '14px 16px',
        }}
      >
        <FlexRow align="center" style={{ justifyContent: 'space-between' }}>
          <div>
            <Text variant="label" size="medium" style={{ fontWeight: 600, color: 'var(--wt-text)' }}>
              Agent Pets
            </Text>
            <Text variant="body" size="small" color="muted" style={{ marginTop: 2 }}>
              Pixel art pets that walk along the bottom of the board
            </Text>
          </div>
          <button
            onClick={() => setPetsEnabled(!petsEnabled)}
            className="relative flex-shrink-0 transition-colors rounded-full"
            style={{
              width:           42,
              height:          24,
              backgroundColor: petsEnabled ? 'var(--wt-accent)' : 'var(--wt-border)',
              border:          'none',
              cursor:          'pointer',
              padding:         3,
            }}
          >
            <span
              className="block rounded-full bg-white transition-transform"
              style={{
                width:     18,
                height:    18,
                transform: petsEnabled ? 'translateX(18px)' : 'translateX(0)',
              }}
            />
          </button>
        </FlexRow>
      </div>

      {/* Sprite gallery */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Available Sprites</SectionLabel>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(SPRITES).map(([key, sprite]) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}
            >
              <PixelSprite sprite={sprite} frameIdx={0} flip={false} />
              <span className="text-[11px]" style={{ color: 'var(--wt-text-muted)' }}>
                {SPRITE_NAMES[key] ?? key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </FlexCol>
  )
}

function BriefingSection() {
  const [time,  setTime]  = useState('')
  const [saved, setSaved] = useState(false)

  // load saved time once
  useState(() => {
    fetch('/api/briefing/settings').then(r => r.json()).then((d: any) => setTime(d.time ?? '')).catch(() => {})
  })

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
    <div
      style={{
        background:   'var(--wt-surface)',
        border:       '1px solid var(--wt-border)',
        borderRadius: 12,
        padding:      '14px 16px',
      }}
    >
      <FlexCol gap="3">
        <div>
          <SectionLabel>Morning Briefing</SectionLabel>
          <Text variant="body" size="small" color="muted" style={{ marginTop: 6 }}>
            Walli greets you with weather, calendar, tasks, and sports at this time each day.
          </Text>
        </div>
        <FlexRow gap="sm" align="center">
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              flex:         1,
              padding:      '6px 10px',
              fontSize:     13,
              borderRadius: 8,
              border:       '1px solid var(--wt-border)',
              background:   'var(--wt-surface)',
              color:        'var(--wt-text)',
              outline:      'none',
            }}
          />
          <button
            onClick={save}
            style={{
              padding:      '6px 16px',
              borderRadius: 8,
              fontSize:     13,
              fontWeight:   500,
              border:       'none',
              cursor:       'pointer',
              background:   saved ? 'var(--wt-surface-hover)' : 'var(--wt-accent)',
              color:        saved ? 'var(--wt-text-muted)' : 'var(--wt-accent-text)',
            }}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </FlexRow>
        <button
          onClick={preview}
          style={{
            padding:     '6px 14px',
            borderRadius: 8,
            fontSize:    13,
            fontWeight:  500,
            cursor:      'pointer',
            textAlign:   'left',
            background:  'var(--wt-bg)',
            color:       'var(--wt-text)',
            border:      '1px solid var(--wt-border)',
          }}
        >
          Preview briefing now
        </button>
      </FlexCol>
    </div>
  )
}

function GeneralSection() {
  return (
    <FlexCol style={{ gap: 32 }}>
      <BriefingSection />
      <Box style={{ height: 1, background: 'var(--wt-border)' }} />
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Display</SectionLabel>
        </div>
        <SchedulePanel />
      </div>
    </FlexCol>
  )
}

function AgentsSection() {
  return (
    <FlexCol style={{ gap: 32 }}>
      <AgentManager />
      <Box style={{ height: 1, background: 'var(--wt-border)' }} />
      <PetsSection />
    </FlexCol>
  )
}

// ── Connectors section ────────────────────────────────────────────────────────

interface HealthServices {
  notion: boolean; notionOauth: boolean; anthropic: boolean; elevenlabs: boolean
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

type ConnCategory = 'all' | 'tasks' | 'calendar' | 'media' | 'productivity' | 'ai'

interface ConnectorDef {
  id: string; name: string; description: string; icon: string
  category: 'tasks' | 'calendar' | 'media' | 'productivity' | 'ai'
}

const CONNECTORS: ConnectorDef[] = [
  { id: 'gtasks',     name: 'Google Tasks',    description: 'Sync your task lists and manage todos.',                   icon: 'CheckSquare',     category: 'tasks' },
  { id: 'todoist',    name: 'Todoist',         description: 'View and manage your Todoist tasks on the whiteboard.',    icon: 'CheckCircle',     category: 'tasks' },
  { id: 'gcal',       name: 'Google Calendar', description: 'View and manage your calendar events on the whiteboard.', icon: 'CalendarBlank',   category: 'calendar' },
  { id: 'spotify',    name: 'Spotify',         description: 'Control playback and see what\'s currently playing.',      icon: 'MusicNote',       category: 'media' },
  { id: 'youtube',    name: 'YouTube',         description: 'Search and embed YouTube videos in widgets.',              icon: 'YoutubeLogo',     category: 'media' },
  { id: 'notion',     name: 'Notion',          description: 'Read and write to your Notion databases.',                 icon: 'BookOpen',        category: 'productivity' },
  { id: 'anthropic',  name: 'Walli AI',        description: 'AI assistant powered by Anthropic.',                       icon: 'Robot',           category: 'ai' },
  { id: 'elevenlabs', name: 'ElevenLabs',      description: 'Voice synthesis for Walli and daily briefings.',           icon: 'Microphone',      category: 'ai' },
  { id: 'bing',       name: 'Bing Search',     description: 'Web search for Walli\'s research capabilities.',           icon: 'MagnifyingGlass', category: 'ai' },
]

function EnabledPill({ icon, name, providerId }: { icon: string; name: string; providerId?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
      borderRadius: 12, padding: '10px 16px', flexShrink: 0, minWidth: 160,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: 'color-mix(in srgb, var(--wt-accent) 10%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {providerId
          ? <ProviderIcon provider={providerId} size={18} />
          : <Icon icon={icon as any} size={16} style={{ color: 'var(--wt-accent)' }} />
        }
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-text)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--wt-success)', fontWeight: 500 }}>Enabled</div>
      </div>
    </div>
  )
}

function AppCard({
  icon, name, description, connected, statusLabel, actionLabel, onAction, children, providerId,
}: {
  icon: string; name: string; description: string; connected: boolean
  statusLabel?: string; actionLabel?: string; onAction?: () => void
  children?: React.ReactNode; providerId?: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        background: 'var(--wt-surface)',
        border: `1px solid ${hovered ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
        borderRadius: 16, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 0 0 1px color-mix(in srgb, var(--wt-accent) 20%, transparent)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: connected ? 'color-mix(in srgb, var(--wt-success) 10%, transparent)' : 'var(--wt-surface-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {providerId
            ? <ProviderIcon provider={providerId} size={22} />
            : <Icon icon={icon as any} size={20} style={{ color: connected ? 'var(--wt-success)' : 'var(--wt-text)', opacity: connected ? 1 : 0.5 }} />
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--wt-success)' : 'var(--wt-text-muted)', opacity: connected ? 1 : 0.25 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: connected ? 'var(--wt-success)' : 'var(--wt-text-muted)' }}>
            {statusLabel ?? (connected ? 'Connected' : 'Not connected')}
          </span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--wt-text)', marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--wt-text-muted)', lineHeight: 1.5 }}>{description}</div>
      </div>
      {actionLabel && onAction && (
        <Button variant={connected ? 'ghost' : 'accent'} size="sm" onClick={onAction} fullWidth>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  )
}

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
    <AppCard icon="CalendarBlank" name="Google Calendar" providerId="gcal"
      description="View and manage your calendar events on the whiteboard."
      connected={connected} actionLabel={connected ? 'Disconnect' : 'Connect'}
      onAction={connected ? disconnect : openPopup} />
  )
}

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
    <AppCard icon="CheckSquare" name="Google Tasks" providerId="gtasks"
      description="Sync your task lists and manage todos."
      connected={connected} actionLabel={connected ? undefined : 'Connect'}
      onAction={connected ? undefined : openPopup} />
  )
}

function useTodoistStatus() {
  const [connected, setConnected] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const refresh = () => {
    apiFetch<{ connected: boolean; configured: boolean }>('/api/todoist/status')
      .then((d) => { setConnected(d.connected); setConfigured(d.configured) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { refresh() }, [])
  return { connected, configured, loading, refresh }
}

function TodoistCard() {
  const { connected, configured, refresh } = useTodoistStatus()
  function openPopup() {
    apiFetch<{ url: string }>('/api/todoist/connect', { method: 'POST' }).then(({ url }) => {
      const popup = window.open(url, 'todoist-auth', 'width=500,height=620,left=200,top=100')
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'todoist-connected') {
          refresh()
          window.removeEventListener('message', onMessage)
          popup?.close()
        }
      }
      window.addEventListener('message', onMessage)
    })
  }
  async function disconnect() {
    await apiFetch('/api/todoist/disconnect', { method: 'POST' })
    refresh()
  }
  return (
    <AppCard icon="CheckCircle" name="Todoist" providerId="todoist"
      description="View and manage your Todoist tasks on the whiteboard."
      connected={connected}
      actionLabel={connected ? 'Disconnect' : configured ? 'Connect' : 'Not available'}
      onAction={connected ? disconnect : configured ? openPopup : undefined} />
  )
}

function useNotionStatus() {
  const [status, setStatus] = useState<{ connected: boolean; method: string | null; configured: boolean }>({
    connected: false, method: null, configured: false,
  })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    apiFetch<{ connected: boolean; method: string | null; configured: boolean }>('/api/notion/status')
      .then(setStatus).catch(() => {}).finally(() => setLoading(false))
  }, [refreshKey])
  return { ...status, loading, refresh: () => setRefreshKey((k) => k + 1) }
}

function NotionCard({ notionOauth }: { notionOauth: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()
  const notionStatus = useNotionStatus()
  const connected = notionStatus.connected
  const isOAuthConnected = notionStatus.method === 'oauth'

  function openOAuthPopup() {
    apiFetch<{ url: string }>('/api/notion/connect', { method: 'POST' }).then(({ url }) => {
      const popup = window.open(url, 'notion-auth', 'width=500,height=700,left=200,top=100')
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'notion-connected') {
          notionStatus.refresh()
          qc.invalidateQueries({ queryKey: ['health'] })
          window.removeEventListener('message', onMessage)
          popup?.close()
        }
      }
      window.addEventListener('message', onMessage)
    })
  }
  async function disconnect() {
    await apiFetch('/api/notion/disconnect', { method: 'POST' })
    notionStatus.refresh()
    qc.invalidateQueries({ queryKey: ['health'] })
  }
  async function save() {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      await apiFetch('/api/credentials/notion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      setApiKey(''); setExpanded(false)
      notionStatus.refresh(); qc.invalidateQueries({ queryKey: ['health'] })
    } finally { setSaving(false) }
  }

  let actionLabel: string | undefined
  let onAction: (() => void) | undefined
  if (connected && isOAuthConnected) { actionLabel = 'Disconnect'; onAction = disconnect }
  else if (connected) { actionLabel = notionOauth ? 'Upgrade to OAuth' : 'Reconfigure'; onAction = notionOauth ? openOAuthPopup : () => setExpanded(true) }
  else if (notionOauth) { actionLabel = 'Connect'; onAction = openOAuthPopup }
  else if (!expanded) { actionLabel = 'Set up'; onAction = () => setExpanded(true) }

  return (
    <AppCard icon="BookOpen" name="Notion"
      description="Read and write to your Notion databases."
      connected={connected}
      statusLabel={connected ? (isOAuthConnected ? 'Connected' : 'Active (API key)') : 'Not connected'}
      actionLabel={actionLabel} onAction={onAction}
    >
      {expanded && !notionOauth && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--wt-text-muted)', lineHeight: 1.5 }}>
            Get your API key from{' '}
            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--wt-accent)', textDecoration: 'underline' }}>
              notion.so/my-integrations
            </a>
          </div>
          <Input label="API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="secret_..." />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="accent" size="sm" disabled={!apiKey.trim() || saving} onClick={save} fullWidth>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setExpanded(false); setApiKey('') }}>Cancel</Button>
          </div>
        </div>
      )}
    </AppCard>
  )
}

function ServiceCard({ icon, name, description, configured }: {
  icon: string; name: string; description: string; configured: boolean
}) {
  return (
    <AppCard icon={icon} name={name} description={description}
      connected={configured} statusLabel={configured ? 'Active' : 'Not configured'} />
  )
}

function ConnCategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 500,
      background: active ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
      color: active ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}

function ConnectorsSection() {
  const services = useHealthServices()
  const s = services ?? { notion: false, notionOauth: false, anthropic: false, elevenlabs: false, youtube: false, bing: false, googleOauth: false }
  const gcalStatus  = useGCalStatus()
  const tasksStatus = useTasksStatus()
  const todoistStatus = useTodoistStatus()

  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState<ConnCategory>('all')

  const enabledMap: Record<string, boolean> = {
    gcal: !!gcalStatus.data?.connected, gtasks: !!tasksStatus.data?.connected,
    todoist: todoistStatus.connected, notion: s.notion,
    anthropic: s.anthropic, elevenlabs: s.elevenlabs, youtube: s.youtube, bing: s.bing,
  }
  const enabledConnectors = CONNECTORS.filter(c => enabledMap[c.id])
  const query = search.toLowerCase().trim()
  const filtered = CONNECTORS
    .filter(c => category === 'all' || c.category === category)
    .filter(c => !query || c.name.toLowerCase().includes(query))

  return (
    <FlexCol gap="5">
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
        borderRadius: 12, padding: '10px 14px',
      }}>
        <Icon icon="MagnifyingGlass" size={16} style={{ color: 'var(--wt-text-muted)', flexShrink: 0, opacity: 0.4 }} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search connectors"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--wt-text)', fontSize: 14 }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)', padding: 2 }}>
            <Icon icon="X" size={13} />
          </button>
        )}
      </div>

      {/* Enabled pills */}
      {enabledConnectors.length > 0 && !query && (
        <div>
          <div style={{ marginBottom: 10 }}><SectionLabel>Enabled</SectionLabel></div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {enabledConnectors.map(c => (
              <EnabledPill key={c.id} icon={c.icon} name={c.name} providerId={c.id} />
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <ConnCategoryTab label="All"          active={category === 'all'}          onClick={() => setCategory('all')} />
        <ConnCategoryTab label="Tasks"        active={category === 'tasks'}        onClick={() => setCategory('tasks')} />
        <ConnCategoryTab label="Calendar"     active={category === 'calendar'}     onClick={() => setCategory('calendar')} />
        <ConnCategoryTab label="Media"        active={category === 'media'}        onClick={() => setCategory('media')} />
        <ConnCategoryTab label="Productivity" active={category === 'productivity'} onClick={() => setCategory('productivity')} />
        <ConnCategoryTab label="AI"           active={category === 'ai'}           onClick={() => setCategory('ai')} />
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(c => {
            if (c.id === 'gcal')    return <GCalCard    key={c.id} googleOauth={s.googleOauth} />
            if (c.id === 'gtasks')  return <GTasksCard  key={c.id} googleOauth={s.googleOauth} />
            if (c.id === 'todoist') return <TodoistCard key={c.id} />
            if (c.id === 'notion')  return <NotionCard  key={c.id} notionOauth={s.notionOauth} />
            return <ServiceCard key={c.id} icon={c.icon} name={c.name} description={c.description} configured={enabledMap[c.id]} />
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--wt-text-muted)', fontSize: 14 }}>
          No connectors match "{search}"
        </div>
      )}
    </FlexCol>
  )
}

// ── Nav sections ──────────────────────────────────────────────────────────────

type Section = 'appearance' | 'general' | 'agents' | 'connectors' | 'account'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'appearance',  label: 'Appearance',  icon: 'Palette' },
  { id: 'general',     label: 'General',     icon: 'SlidersHorizontal' },
  { id: 'agents',      label: 'Agents',      icon: 'Robot' },
  { id: 'connectors',  label: 'Connectors',  icon: 'Plugs' },
  { id: 'account',     label: 'Account',     icon: 'User' },
]

// ── Main view ─────────────────────────────────────────────────────────────────

// ── Section: Account ─────────────────────────────────────────────────────────

function AccountSection() {
  const [signingOut, setSigningOut] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const meta = data.user.user_metadata ?? {}
      setUser({
        name:      meta.full_name ?? meta.name ?? meta.display_name ?? '',
        email:     data.user.email ?? '',
        avatarUrl: meta.avatar_url ?? meta.picture ?? null,
      })
    })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <FlexCol gap="5">
      <SectionLabel>Account</SectionLabel>

      {/* Profile card */}
      <div
        style={{
          background:   'var(--wt-surface)',
          border:       '1px solid var(--wt-border)',
          borderRadius: 12,
          padding:      '16px 20px',
          maxWidth:     400,
        }}
      >
        <FlexRow align="center" gap="md">
          {/* Avatar */}
          <div
            style={{
              width:          52,
              height:         52,
              borderRadius:   '50%',
              flexShrink:     0,
              overflow:       'hidden',
              background:     'color-mix(in srgb, var(--wt-accent) 20%, var(--wt-surface))',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       18,
              fontWeight:     600,
              color:          'var(--wt-accent)',
              border:         '2px solid var(--wt-border)',
            }}
          >
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>

          {/* Name + email */}
          <FlexCol gap="none" style={{ minWidth: 0 }}>
            {user?.name && (
              <Text variant="label" size="medium" style={{ fontWeight: 600, color: 'var(--wt-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </Text>
            )}
            <Text variant="body" size="small" color="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email ?? '—'}
            </Text>
          </FlexCol>
        </FlexRow>
      </div>

      <FlexCol gap="sm" style={{ maxWidth: 400 }}>
        <Text variant="body" size="medium" color="muted">
          Your boards and settings are saved in the cloud and will be here when you come back.
        </Text>
        <div>
          <Button
            variant="ghost"
            size="md"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <FlexRow align="center" gap="xs">
              <Icon icon="SignOut" size={16} />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </FlexRow>
          </Button>
        </div>
      </FlexCol>
    </FlexCol>
  )
}

// ── Shared widget-frame style ─────────────────────────────────────────────────

const WIDGET_FRAME: React.CSSProperties = {
  background:   'var(--wt-bg)',
  borderRadius: '3rem',
  border:       '1px solid var(--wt-widget-rest-border)',
  boxShadow:    '0 4px 0 rgba(0,0,0,0.10), var(--wt-shadow-sm), inset 0 1px 0 var(--wt-widget-highlight)',
  overflow:     'hidden',
}

// ── Main view ────────────────────────────────────────────────────────────────

export function SettingsBoardView() {
  const [activeSection, setActiveSection] = useState<Section>('appearance')
  const { background: themeBackground } = useThemeStore()
  const activeBoard    = useWhiteboardStore((s) => s.boards.find((b) => b.id === s.activeBoardId))
  const boardBackground = activeBoard?.background ?? themeBackground

  return (
    <WhiteboardBackground background={boardBackground}>
    <div
      className="absolute inset-0 flex gap-3"
      style={{ padding: 16 }}
    >
      {/* Sidebar widget */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{ ...WIDGET_FRAME, width: 210 }}
      >
        {/* Title */}
        <div
          className="flex items-center gap-3 flex-shrink-0"
          style={{ padding: '24px 20px 16px' }}
        >
          <Icon icon="Gear" size={20} style={{ color: 'var(--wt-accent)', flexShrink: 0 }} />
          <Text variant="label" size="medium" style={{ fontWeight: 700, color: 'var(--wt-text)' }}>
            Settings
          </Text>
        </div>

        {/* Nav */}
        <div className="flex flex-col px-2 gap-0.5">
          {SECTIONS.map((sec) => {
            const isActive = sec.id === activeSection
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className="flex items-center gap-2.5 px-3 rounded-2xl text-left"
                style={{
                  position:      'relative',
                  paddingTop:    10,
                  paddingBottom: 10,
                  background:    isActive ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'transparent',
                  color:         isActive ? 'var(--wt-text)' : 'color-mix(in srgb, var(--wt-text) 65%, transparent)',
                  border:        'none',
                  cursor:        'pointer',
                  fontWeight:    isActive ? 500 : 400,
                  fontSize:      14,
                  transition:    'background 0.15s ease, color 0.15s ease',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position:     'absolute',
                      left:         0,
                      top:          '50%',
                      transform:    'translateY(-50%)',
                      width:        3,
                      height:       16,
                      borderRadius: 99,
                      background:   'var(--wt-accent)',
                    }}
                  />
                )}
                <Icon
                  icon={sec.icon as any}
                  size={16}
                  style={{ color: isActive ? 'var(--wt-accent)' : undefined, opacity: isActive ? 1 : 0.6, flexShrink: 0 }}
                />
                {sec.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content widget */}
      <div className="flex-1 min-w-0" style={{ ...WIDGET_FRAME, overflowY: 'auto' }}>
        <div style={{ maxWidth: activeSection === 'connectors' ? 900 : 720, padding: '36px 44px' }}>
          {activeSection === 'appearance'  && <AppearanceSection />}
          {activeSection === 'general'     && <GeneralSection />}
          {activeSection === 'agents'      && <AgentsSection />}
          {activeSection === 'connectors'  && <ConnectorsSection />}
          {activeSection === 'account'     && <AccountSection />}
        </div>
      </div>
    </div>
    </WhiteboardBackground>
  )
}
