import { useEffect, useState } from 'react'
import { Panel, PanelHeader } from '../ui/web'
import { ThemePicker } from './ThemePicker'
import { BackgroundPicker } from './BackgroundPicker'

interface Props {
  onClose: () => void
}

function BriefingSettings() {
  const [time,    setTime]    = useState('')
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    fetch('/api/briefing/settings').then(r => r.json()).then((d: any) => setTime(d.time ?? ''))
  }, [])

  async function save() {
    await fetch('/api/briefing/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ time }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function preview() {
    const r = await fetch('/api/briefing')
    const { text } = await r.json() as any
    if (text) {
      // Push to briefing store so VoiceListener speaks it
      const { useBriefingStore } = await import('../store/briefing')
      useBriefingStore.getState().trigger(text)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 12, color: 'var(--wt-text-muted)', margin: 0, lineHeight: 1.5 }}>
        Walli will greet you with weather, calendar, tasks, and sports at this time each day.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          style={{
            flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        />
        <button
          onClick={save}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: saved ? 'var(--wt-surface)' : 'var(--wt-accent)',
            color: saved ? 'var(--wt-text-muted)' : 'var(--wt-accent-text)',
            border: 'none', cursor: 'pointer',
          }}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <button
        onClick={preview}
        style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: 'var(--wt-surface)', color: 'var(--wt-text)',
          border: '1px solid var(--wt-border)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        Preview briefing now
      </button>
    </div>
  )
}

export function SettingsPanel({ onClose }: Props) {
  return (
    <Panel width={432} onClose={onClose}>
      <PanelHeader title="Appearance" onClose={onClose} />
      <div className="px-3 py-3 space-y-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--wt-text-muted)' }}>
            Theme
          </p>
          <ThemePicker />
        </section>
        <div style={{ height: 1, background: 'var(--wt-settings-divider)' }} />
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--wt-text-muted)' }}>
            Background
          </p>
          <BackgroundPicker />
        </section>
        <div style={{ height: 1, background: 'var(--wt-settings-divider)' }} />
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--wt-text-muted)' }}>
            Morning Briefing
          </p>
          <BriefingSettings />
        </section>
      </div>
    </Panel>
  )
}
