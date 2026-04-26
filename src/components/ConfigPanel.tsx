import { useEffect, useState } from 'react'
import { Panel, PanelHeader, Input, Button, Text } from '@whiteboard/ui-kit'
import { useQueryClient } from '@tanstack/react-query'
import { useGCalStatus, startGCalAuth, disconnectGCal } from '../hooks/useGCal'

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
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      {children}
    </div>
  )
}

// ── GCal setup ────────────────────────────────────────────────────────────────

function GCalSection() {
  const qc        = useQueryClient()
  const { data }  = useGCalStatus()
  const connected = !!data?.connected
  const configured = !!data?.configured

  function openPopup() {
    startGCalAuth().then(url => {
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
    <ConnectionRow
      name="Google Calendar"
      connected={connected}
      configured={configured}
      onSetup={connected ? disconnect : openPopup}
    >
      {!configured && (
        <Text variant="body" size="small" color="muted">
          Set <code className="px-1 rounded text-xs" style={{ background: 'var(--wt-surface)' }}>GOOGLE_CLIENT_ID</code> and{' '}
          <code className="px-1 rounded text-xs" style={{ background: 'var(--wt-surface)' }}>GOOGLE_CLIENT_SECRET</code> in your <code className="px-1 rounded text-xs" style={{ background: 'var(--wt-surface)' }}>.env</code> file to enable Google Calendar.
        </Text>
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
          </div>
        )}
      </div>
    </Panel>
  )
}
