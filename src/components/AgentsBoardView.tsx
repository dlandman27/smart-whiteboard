import { useState, useEffect, useCallback } from 'react'
import {
  FlexRow, FlexCol, Box, Text, Icon, Center,
  IconButton, ScrollArea, Button,
} from '@whiteboard/ui-kit'
import { apiFetch } from '../lib/apiFetch'
import { usePetsStore } from '../store/pets'
import { SPRITES, getSpriteType } from './pets/sprites'
import { PixelSprite } from './pets/PixelSprite'

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentTrigger =
  | { type: 'cron';          expression: string }
  | { type: 'daily';         time: string }
  | { type: 'calendar_soon'; minutesBefore: number }
  | { type: 'board_opened';  boardType?: string }
  | { type: 'widget_added';  widgetType?: string }
  | { type: 'reminder_fired' }

interface AgentStatus {
  id:          string
  name:        string
  description: string
  icon:        string
  spriteType?: string
  enabled:     boolean
  intervalMs:  number
  triggers:    AgentTrigger[]
  lastRun:     string | null
  nextRun:     string | null
}

// ── Trigger helpers ───────────────────────────────────────────────────────────

function triggerLabel(t: AgentTrigger): string {
  switch (t.type) {
    case 'daily':         return `daily at ${t.time}`
    case 'cron':          return `cron: ${t.expression}`
    case 'calendar_soon': return `${t.minutesBefore}m before meetings`
    case 'board_opened':  return t.boardType ? `when ${t.boardType} opens` : 'when board opens'
    case 'widget_added':  return t.widgetType ? `when ${t.widgetType} added` : 'when widget added'
    case 'reminder_fired': return 'when reminder fires'
  }
}

function triggerColor(type: string): string {
  const map: Record<string, string> = {
    daily:          'var(--wt-accent)',
    cron:           '#8b5cf6',
    calendar_soon:  '#3b82f6',
    board_opened:   '#10b981',
    widget_added:   '#f59e0b',
    reminder_fired: '#ef4444',
  }
  return map[type] ?? 'var(--wt-accent)'
}

function TriggerBadges({ triggers, intervalMs }: { triggers: AgentTrigger[]; intervalMs: number }) {
  if (triggers.length === 0) {
    // Fallback interval label
    const m = intervalMs / 60_000
    const label = m < 60 ? `every ${m}m` : m < 1440 ? `every ${m / 60}h` : `every ${Math.round(m / 1440)}d`
    return (
      <span style={{
        fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 5,
        background: 'var(--wt-bg-secondary)', color: 'var(--wt-text-muted)',
        border: '1px solid var(--wt-border)',
      }}>{label}</span>
    )
  }
  return (
    <FlexRow style={{ gap: 4, flexWrap: 'wrap' }}>
      {triggers.map((t, i) => {
        const color = triggerColor(t.type)
        return (
          <span key={i} style={{
            fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 5,
            background: color + '18', color, border: `1px solid ${color}44`,
          }}>{triggerLabel(t)}</span>
        )
      })}
    </FlexRow>
  )
}

// ── Run history ───────────────────────────────────────────────────────────────

interface AgentRunRecord {
  id:          number
  agent_id:    string
  started_at:  string
  duration_ms: number
  output:      string | null
  error:       string | null
}

function RunHistory({ agentId }: { agentId: string }) {
  const [runs,    setRuns]    = useState<AgentRunRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<AgentRunRecord[]>(`/api/agents/${agentId}/runs`)
      .then((data) => { setRuns(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [agentId])

  if (loading) return <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)', padding: '4px 0' }}>Loading…</Text>
  if (runs.length === 0) return <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)', padding: '4px 0' }}>No runs yet</Text>

  return (
    <FlexCol style={{ gap: 4, marginTop: 4 }}>
      {runs.slice(0, 5).map((run) => (
        <FlexRow key={run.id} style={{ gap: 8, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 9, color: 'var(--wt-text-muted)', whiteSpace: 'nowrap', paddingTop: 1, minWidth: 60 }}>
            {relativeTime(run.started_at)}
          </Text>
          <Text style={{ fontSize: 9, color: 'var(--wt-text-muted)', whiteSpace: 'nowrap' }}>
            {run.duration_ms}ms
          </Text>
          {run.error ? (
            <Text style={{ fontSize: 9, color: 'var(--wt-danger)', lineHeight: 1.3 }}>{run.error}</Text>
          ) : run.output ? (
            <Text style={{ fontSize: 9, color: 'var(--wt-text-muted)', lineHeight: 1.3, fontStyle: 'italic' }}>"{run.output}"</Text>
          ) : (
            <Text style={{ fontSize: 9, color: 'var(--wt-text-muted)' }}>skipped</Text>
          )}
        </FlexRow>
      ))}
    </FlexCol>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso || iso === 'soon' || iso === 'event-driven') return iso ?? '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) {
    const s = Math.abs(diff) / 1000
    if (s < 60)   return 'in a moment'
    if (s < 3600) return `in ${Math.round(s / 60)}m`
    return `in ${Math.round(s / 3600)}h`
  }
  const s = diff / 1000
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, onToggle, onRunNow, onDelete }: {
  agent:     AgentStatus
  onToggle:  (id: string, enabled: boolean) => void
  onRunNow:  (id: string) => void
  onDelete:  (id: string) => void
}) {
  const { pets } = usePetsStore()
  const mood    = pets[agent.id]?.mood ?? 'idle'
  const message = pets[agent.id]?.message ?? null
  const [showHistory, setShowHistory] = useState(false)

  const spriteKey = getSpriteType(agent.id, agent.icon, agent.spriteType)
  const sprite    = SPRITES[spriteKey]
  const isActive  = mood === 'active' || mood === 'speaking'

  return (
    <Box style={{
      background:   'var(--wt-widget-bg)',
      border:       `1px solid ${isActive ? sprite.colors.B + '88' : 'var(--wt-border)'}`,
      borderRadius: 12,
      padding:      '14px 16px',
      transition:   'border-color 0.3s',
      boxShadow:    isActive ? `0 0 12px ${sprite.colors.B}44` : 'none',
      opacity:      agent.enabled ? 1 : 0.55,
    }}>
      <FlexRow style={{ gap: 12, alignItems: 'flex-start' }}>
        {/* Sprite */}
        <div style={{ flexShrink: 0, paddingTop: 2 }}>
          <div style={{ filter: isActive ? `drop-shadow(0 0 6px ${sprite.colors.B}cc)` : 'none', transition: 'filter 0.3s' }}>
            <PixelSprite sprite={sprite} frameIdx={0} flip={false} />
          </div>
        </div>

        {/* Info */}
        <FlexCol style={{ flex: 1, gap: 5, minWidth: 0 }}>
          <FlexRow style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-text)' }}>
              {agent.icon} {agent.name}
            </Text>
            {isActive && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                color: sprite.colors.B, background: sprite.colors.B + '22',
                borderRadius: 4, padding: '1px 5px',
              }}>RUNNING</span>
            )}
          </FlexRow>

          <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)', lineHeight: 1.45 }}>
            {message ?? agent.description}
          </Text>

          {/* Trigger badges */}
          <TriggerBadges triggers={agent.triggers ?? []} intervalMs={agent.intervalMs} />

          {/* Last ran + history toggle */}
          <FlexRow style={{ gap: 6, alignItems: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)' }}>
              last ran {relativeTime(agent.lastRun)}
              {agent.enabled && agent.nextRun && agent.nextRun !== 'event-driven' && (
                <> · next {relativeTime(agent.nextRun)}</>
              )}
            </Text>
            <button onClick={() => setShowHistory((v) => !v)} style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid var(--wt-border)', background: 'transparent',
              color: 'var(--wt-text-muted)',
            }}>
              {showHistory ? 'hide log' : 'log'}
            </button>
          </FlexRow>

          {showHistory && <RunHistory agentId={agent.id} />}
        </FlexCol>

        {/* Actions */}
        <FlexRow style={{ gap: 4, flexShrink: 0 }}>
          <IconButton title={agent.enabled ? 'Disable' : 'Enable'} onClick={() => onToggle(agent.id, !agent.enabled)} style={{ opacity: 0.7 }}>
            <Icon name={agent.enabled ? 'PauseCircle' : 'PlayCircle'} size={14} />
          </IconButton>
          <IconButton title="Run now" onClick={() => onRunNow(agent.id)} style={{ opacity: 0.7 }}>
            <Icon name="Lightning" size={14} />
          </IconButton>
          <IconButton title="Delete" onClick={() => onDelete(agent.id)} style={{ opacity: 0.5, color: 'var(--wt-danger)' }}>
            <Icon name="Trash" size={14} />
          </IconButton>
        </FlexRow>
      </FlexRow>
    </Box>
  )
}

// ── Sprite picker ─────────────────────────────────────────────────────────────

const SPRITE_KEYS = Object.keys(SPRITES) as (keyof typeof SPRITES)[]

function SpritePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FlexRow style={{ gap: 8, flexWrap: 'wrap' }}>
      {SPRITE_KEYS.map((key) => {
        const sprite   = SPRITES[key]
        const selected = value === key
        return (
          <div key={key} onClick={() => onChange(key)} title={key} style={{
            cursor: 'pointer', padding: 6, borderRadius: 8,
            border:     `2px solid ${selected ? sprite.colors.B : 'transparent'}`,
            background: selected ? sprite.colors.B + '22' : 'var(--wt-bg-secondary)',
            transition: 'all 0.15s',
            filter:     selected ? `drop-shadow(0 0 4px ${sprite.colors.B}99)` : 'none',
          }}>
            <PixelSprite sprite={sprite} frameIdx={0} flip={false} />
          </div>
        )
      })}
    </FlexRow>
  )
}

// ── Trigger picker ────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { type: 'daily',         label: 'Daily at time',          icon: '🕗' },
  { type: 'calendar_soon', label: 'Before meetings',         icon: '📅' },
  { type: 'reminder_fired',label: 'When reminder fires',     icon: '🔔' },
  { type: 'board_opened',  label: 'When board opens',        icon: '🖥️' },
  { type: 'widget_added',  label: 'When widget added',       icon: '➕' },
  { type: 'cron',          label: 'Cron expression',         icon: '⚙️' },
] as const

function TriggerPicker({ triggers, onChange }: {
  triggers: AgentTrigger[]
  onChange:  (t: AgentTrigger[]) => void
}) {
  function toggle(type: AgentTrigger['type']) {
    const existing = triggers.find((t) => t.type === type)
    if (existing) {
      onChange(triggers.filter((t) => t.type !== type))
    } else {
      const defaults: Record<string, AgentTrigger> = {
        daily:          { type: 'daily',         time: '08:00' },
        calendar_soon:  { type: 'calendar_soon', minutesBefore: 10 },
        reminder_fired: { type: 'reminder_fired' },
        board_opened:   { type: 'board_opened' },
        widget_added:   { type: 'widget_added' },
        cron:           { type: 'cron',          expression: '0 9 * * 1-5' },
      }
      onChange([...triggers, defaults[type]])
    }
  }

  function update(type: AgentTrigger['type'], patch: Partial<any>) {
    onChange(triggers.map((t) => t.type === type ? { ...t, ...patch } : t))
  }

  return (
    <FlexCol style={{ gap: 8 }}>
      <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>Triggers — when should this agent run?</Text>
      <FlexRow style={{ gap: 6, flexWrap: 'wrap' }}>
        {TRIGGER_TYPES.map(({ type, label, icon }) => {
          const active = triggers.some((t) => t.type === type)
          const color  = triggerColor(type)
          return (
            <button key={type} onClick={() => toggle(type)} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
              border:     `1px solid ${active ? color : 'var(--wt-border)'}`,
              background: active ? color + '18' : 'var(--wt-bg-secondary)',
              color:      active ? color : 'var(--wt-text-muted)',
              transition: 'all 0.15s',
            }}>
              {icon} {label}
            </button>
          )
        })}
      </FlexRow>

      {/* Config inputs for selected triggers */}
      {triggers.map((t) => (
        <FlexRow key={t.type} style={{ gap: 8, alignItems: 'center', paddingLeft: 8 }}>
          <span style={{ fontSize: 10, color: triggerColor(t.type), minWidth: 100 }}>{triggerLabel(t)}</span>
          {t.type === 'daily' && (
            <input type="time" value={t.time} onChange={(e) => update('daily', { time: e.target.value })}
              style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--wt-border)', background: 'var(--wt-bg-secondary)', color: 'var(--wt-text)' }} />
          )}
          {t.type === 'calendar_soon' && (
            <FlexRow style={{ gap: 4, alignItems: 'center' }}>
              <input type="number" min={1} max={60} value={t.minutesBefore}
                onChange={(e) => update('calendar_soon', { minutesBefore: Number(e.target.value) })}
                style={{ width: 48, fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--wt-border)', background: 'var(--wt-bg-secondary)', color: 'var(--wt-text)' }} />
              <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>minutes before</Text>
            </FlexRow>
          )}
          {t.type === 'cron' && (
            <input value={t.expression} onChange={(e) => update('cron', { expression: e.target.value })}
              placeholder="0 9 * * 1-5"
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--wt-border)', background: 'var(--wt-bg-secondary)', color: 'var(--wt-text)', width: 140 }} />
          )}
        </FlexRow>
      ))}

      {triggers.length === 0 && (
        <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)', paddingLeft: 4 }}>
          No triggers selected — agent will use interval polling as fallback.
        </Text>
      )}
    </FlexCol>
  )
}

// ── Interval fallback picker (shown only when no triggers selected) ───────────

const INTERVAL_OPTIONS = [
  { label: '15 min',  value: 900_000 },
  { label: '30 min',  value: 1_800_000 },
  { label: '1 hour',  value: 3_600_000 },
  { label: '3 hours', value: 10_800_000 },
  { label: '6 hours', value: 21_600_000 },
  { label: 'Daily',   value: 86_400_000 },
]

// ── Create agent form ─────────────────────────────────────────────────────────

function CreateAgentPanel({ onCreated }: { onCreated: () => void }) {
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [icon,        setIcon]        = useState('🤖')
  const [spriteType,  setSpriteType]  = useState('robot')
  const [triggers,    setTriggers]    = useState<AgentTrigger[]>([])
  const [intervalMs,  setIntervalMs]  = useState(3_600_000)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim() || !description.trim()) { setError('Name and description required'); return }
    setSaving(true); setError(null)
    try {
      await apiFetch('/api/agents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), description: description.trim(), icon, spriteType, triggers, intervalMs }),
      })
      onCreated()
      setName(''); setDescription(''); setIcon('🤖'); setSpriteType('robot')
      setTriggers([]); setIntervalMs(3_600_000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <FlexCol style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-text)' }}>New Agent</Text>

      <FlexRow style={{ gap: 8 }}>
        <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🤖"
          style={{ width: 44, textAlign: 'center', fontSize: 18, background: 'var(--wt-bg-secondary)', border: '1px solid var(--wt-border)', borderRadius: 8, padding: '6px 4px', color: 'var(--wt-text)' }} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name"
          style={{ flex: 1, fontSize: 13, background: 'var(--wt-bg-secondary)', border: '1px solid var(--wt-border)', borderRadius: 8, padding: '6px 10px', color: 'var(--wt-text)' }} />
      </FlexRow>

      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
        placeholder="Describe what this agent should do. Be specific — it reads real data. e.g. 'Check my Notion Tasks for overdue items and speak a warning. Only alert once per item per day.'"
        style={{ width: '100%', fontSize: 12, lineHeight: 1.5, resize: 'vertical', background: 'var(--wt-bg-secondary)', border: '1px solid var(--wt-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--wt-text)', boxSizing: 'border-box' }} />

      <FlexCol style={{ gap: 6 }}>
        <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>Sprite</Text>
        <SpritePicker value={spriteType} onChange={setSpriteType} />
      </FlexCol>

      <TriggerPicker triggers={triggers} onChange={setTriggers} />

      {triggers.length === 0 && (
        <FlexRow style={{ gap: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)', whiteSpace: 'nowrap' }}>Fallback interval</Text>
          <FlexRow style={{ gap: 4, flexWrap: 'wrap' }}>
            {INTERVAL_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setIntervalMs(opt.value)} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                border:     `1px solid ${intervalMs === opt.value ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                background: intervalMs === opt.value ? 'var(--wt-accent)' : 'var(--wt-bg-secondary)',
                color:      intervalMs === opt.value ? '#fff' : 'var(--wt-text)',
              }}>{opt.label}</button>
            ))}
          </FlexRow>
        </FlexRow>
      )}

      {error && <Text style={{ fontSize: 11, color: 'var(--wt-danger)' }}>{error}</Text>}

      <Button onClick={handleCreate} disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Creating…' : 'Create Agent'}
      </Button>
    </FlexCol>
  )
}

// ── Main board view ───────────────────────────────────────────────────────────

export function AgentsBoardView() {
  const [agents,     setAgents]     = useState<AgentStatus[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchAgents = useCallback(() => {
    apiFetch<AgentStatus[]>('/api/agents')
      .then((data) => { setAgents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])
  useEffect(() => { const t = setInterval(fetchAgents, 30_000); return () => clearInterval(t) }, [fetchAgents])

  async function handleToggle(id: string, enabled: boolean) {
    await apiFetch(`/api/agents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
    fetchAgents()
  }

  async function handleRunNow(id: string) {
    await apiFetch(`/api/agents/${id}/run`, { method: 'POST' })
    fetchAgents()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this agent?')) return
    await apiFetch(`/api/agents/${id}`, { method: 'DELETE' })
    fetchAgents()
  }

  const builtIn  = agents.filter((a) => !a.id.startsWith('user_') && !a.id.includes('-'))
  const userMade = agents.filter((a) =>  a.id.startsWith('user_') ||  a.id.includes('-'))

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FlexRow style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--wt-border)', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <FlexCol style={{ gap: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: 700, color: 'var(--wt-text)' }}>Agents</Text>
          <Text style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>
            {agents.filter((a) => a.enabled).length} active · {agents.length} total
          </Text>
        </FlexCol>
        <Button onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Cancel' : '+ New Agent'}</Button>
      </FlexRow>

      <ScrollArea style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
        <FlexCol style={{ gap: 20 }}>

          {showCreate && (
            <Box style={{ background: 'var(--wt-settings-bg)', border: '1px solid var(--wt-border)', borderRadius: 12, padding: 16 }}>
              <CreateAgentPanel onCreated={() => { setShowCreate(false); fetchAgents() }} />
            </Box>
          )}

          {loading && <Center style={{ padding: 40 }}><Text style={{ color: 'var(--wt-text-muted)' }}>Loading agents…</Text></Center>}

          {userMade.length > 0 && (
            <FlexCol style={{ gap: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: 'var(--wt-text-muted)', textTransform: 'uppercase' }}>Your Agents</Text>
              {userMade.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onToggle={handleToggle} onRunNow={handleRunNow} onDelete={handleDelete} />
              ))}
            </FlexCol>
          )}

          {!loading && userMade.length === 0 && !showCreate && (
            <Box style={{ border: '1px dashed var(--wt-border)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <Text style={{ fontSize: 13, color: 'var(--wt-text-muted)', marginBottom: 10, display: 'block' }}>No agents yet. Create one to get started.</Text>
              <Button onClick={() => setShowCreate(true)}>Create your first agent</Button>
            </Box>
          )}

          {builtIn.length > 0 && (
            <FlexCol style={{ gap: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: 'var(--wt-text-muted)', textTransform: 'uppercase' }}>Built-in</Text>
              {builtIn.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onToggle={handleToggle} onRunNow={handleRunNow} onDelete={handleDelete} />
              ))}
            </FlexCol>
          )}
        </FlexCol>
      </ScrollArea>
    </div>
  )
}
