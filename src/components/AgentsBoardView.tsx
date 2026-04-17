import { useState, useEffect, useCallback } from 'react'
import {
  FlexRow, FlexCol, Box, Text, Icon, Center,
  IconButton, ScrollArea, Button,
} from '@whiteboard/ui-kit'
import { usePetsStore } from '../store/pets'
import { SPRITES, PX, getSpriteType } from './pets/sprites'
import { PixelSprite } from './pets/PixelSprite'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentStatus {
  id:          string
  name:        string
  description: string
  icon:        string
  spriteType?: string
  enabled:     boolean
  intervalMs:  number
  lastRun:     string | null
  nextRun:     string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function intervalLabel(ms: number): string {
  const m = ms / 60_000
  if (m < 60)    return `every ${m}m`
  const h = m / 60
  if (h < 24)    return `every ${h}h`
  return `every ${Math.round(h / 24)}d`
}

function relativeTime(iso: string | null): string {
  if (!iso || iso === 'soon') return iso ?? '—'
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
  const mood = pets[agent.id]?.mood ?? 'idle'
  const message = pets[agent.id]?.message ?? null

  const spriteKey = getSpriteType(agent.id, agent.icon, agent.spriteType)
  const sprite    = SPRITES[spriteKey]

  const isActive = mood === 'active' || mood === 'speaking'

  return (
    <Box
      style={{
        background:    'var(--wt-widget-bg)',
        border:        `1px solid ${isActive ? sprite.colors.B + '88' : 'var(--wt-border)'}`,
        borderRadius:  12,
        padding:       '14px 16px',
        transition:    'border-color 0.3s',
        boxShadow:     isActive ? `0 0 12px ${sprite.colors.B}44` : 'none',
        opacity:       agent.enabled ? 1 : 0.55,
      }}
    >
      <FlexRow style={{ gap: 12, alignItems: 'flex-start' }}>
        {/* Sprite */}
        <div style={{ flexShrink: 0, paddingTop: 2 }}>
          <div style={{
            filter: isActive ? `drop-shadow(0 0 6px ${sprite.colors.B}cc)` : 'none',
            transition: 'filter 0.3s',
          }}>
            <PixelSprite sprite={sprite} frameIdx={0} flip={false} />
          </div>
        </div>

        {/* Info */}
        <FlexCol style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <FlexRow style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-text)' }}>
              {agent.icon} {agent.name}
            </Text>
            {isActive && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                color: sprite.colors.B, background: sprite.colors.B + '22',
                borderRadius: 4, padding: '1px 5px',
              }}>
                RUNNING
              </span>
            )}
          </FlexRow>

          <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)', lineHeight: 1.45 }}>
            {message ?? agent.description}
          </Text>

          <FlexRow style={{ gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 10, color: 'var(--wt-accent)', fontWeight: 500 }}>
              {intervalLabel(agent.intervalMs)}
            </Text>
            <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)' }}>·</Text>
            <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)' }}>
              last ran {relativeTime(agent.lastRun)}
            </Text>
            {agent.enabled && agent.nextRun && (
              <>
                <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)' }}>·</Text>
                <Text style={{ fontSize: 10, color: 'var(--wt-text-muted)' }}>
                  next {relativeTime(agent.nextRun)}
                </Text>
              </>
            )}
          </FlexRow>
        </FlexCol>

        {/* Actions */}
        <FlexCol style={{ gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
          <FlexRow style={{ gap: 4 }}>
            <IconButton
              title={agent.enabled ? 'Disable' : 'Enable'}
              onClick={() => onToggle(agent.id, !agent.enabled)}
              style={{ opacity: 0.7 }}
            >
              <Icon name={agent.enabled ? 'PauseCircle' : 'PlayCircle'} size={14} />
            </IconButton>
            <IconButton title="Run now" onClick={() => onRunNow(agent.id)} style={{ opacity: 0.7 }}>
              <Icon name="Lightning" size={14} />
            </IconButton>
            <IconButton title="Delete" onClick={() => onDelete(agent.id)} style={{ opacity: 0.5, color: 'var(--wt-danger)' }}>
              <Icon name="Trash" size={14} />
            </IconButton>
          </FlexRow>
        </FlexCol>
      </FlexRow>
    </Box>
  )
}

// ── Sprite picker for create form ─────────────────────────────────────────────

const SPRITE_KEYS = Object.keys(SPRITES) as (keyof typeof SPRITES)[]

function SpritePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FlexRow style={{ gap: 8, flexWrap: 'wrap' }}>
      {SPRITE_KEYS.map((key) => {
        const sprite = SPRITES[key]
        const selected = value === key
        return (
          <div
            key={key}
            onClick={() => onChange(key)}
            title={key}
            style={{
              cursor: 'pointer', padding: 6, borderRadius: 8,
              border: `2px solid ${selected ? sprite.colors.B : 'transparent'}`,
              background: selected ? sprite.colors.B + '22' : 'var(--wt-bg-secondary)',
              transition: 'all 0.15s',
              filter: selected ? `drop-shadow(0 0 4px ${sprite.colors.B}99)` : 'none',
            }}
          >
            <PixelSprite sprite={sprite} frameIdx={0} flip={false} />
          </div>
        )
      })}
    </FlexRow>
  )
}

// ── Create agent form ─────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { label: '15 min', value: 900_000 },
  { label: '30 min', value: 1_800_000 },
  { label: '1 hour', value: 3_600_000 },
  { label: '3 hours', value: 10_800_000 },
  { label: '6 hours', value: 21_600_000 },
  { label: 'Daily', value: 86_400_000 },
]

function CreateAgentPanel({ onCreated }: { onCreated: () => void }) {
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [icon,        setIcon]        = useState('🤖')
  const [spriteType,  setSpriteType]  = useState('robot')
  const [intervalMs,  setIntervalMs]  = useState(3_600_000)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim() || !description.trim()) { setError('Name and description required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/agents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), description: description.trim(), icon, spriteType, intervalMs }),
      })
      if (!res.ok) { const d = await res.json() as any; throw new Error(d.error ?? 'Failed') }
      onCreated()
      setName(''); setDescription(''); setIcon('🤖'); setSpriteType('robot'); setIntervalMs(3_600_000)
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
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🤖"
          style={{
            width: 44, textAlign: 'center', fontSize: 18,
            background: 'var(--wt-bg-secondary)', border: '1px solid var(--wt-border)',
            borderRadius: 8, padding: '6px 4px', color: 'var(--wt-text)',
          }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name"
          style={{
            flex: 1, fontSize: 13,
            background: 'var(--wt-bg-secondary)', border: '1px solid var(--wt-border)',
            borderRadius: 8, padding: '6px 10px', color: 'var(--wt-text)',
          }}
        />
      </FlexRow>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what this agent should do. Be specific — it reads real data. e.g. 'Check my Notion Tasks for overdue items and speak a warning. Only alert once per item per day.'"
        rows={3}
        style={{
          width: '100%', fontSize: 12, lineHeight: 1.5, resize: 'vertical',
          background: 'var(--wt-bg-secondary)', border: '1px solid var(--wt-border)',
          borderRadius: 8, padding: '8px 10px', color: 'var(--wt-text)',
          boxSizing: 'border-box',
        }}
      />

      <FlexCol style={{ gap: 6 }}>
        <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>Sprite</Text>
        <SpritePicker value={spriteType} onChange={setSpriteType} />
      </FlexCol>

      <FlexRow style={{ gap: 8, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)', whiteSpace: 'nowrap' }}>Runs every</Text>
        <FlexRow style={{ gap: 4, flexWrap: 'wrap' }}>
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setIntervalMs(opt.value)}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${intervalMs === opt.value ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                background: intervalMs === opt.value ? 'var(--wt-accent)' : 'var(--wt-bg-secondary)',
                color: intervalMs === opt.value ? '#fff' : 'var(--wt-text)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </FlexRow>
      </FlexRow>

      {error && <Text style={{ fontSize: 11, color: 'var(--wt-danger)' }}>{error}</Text>}

      <Button onClick={handleCreate} disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Creating…' : 'Create Agent'}
      </Button>
    </FlexCol>
  )
}

// ── Main board view ───────────────────────────────────────────────────────────

export function AgentsBoardView() {
  const [agents,      setAgents]      = useState<AgentStatus[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)

  const fetchAgents = useCallback(() => {
    fetch('/api/agents')
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: AgentStatus[]) => { setAgents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  // Refresh every 30s to keep lastRun/nextRun current
  useEffect(() => {
    const t = setInterval(fetchAgents, 30_000)
    return () => clearInterval(t)
  }, [fetchAgents])

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/agents/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ enabled }),
    })
    fetchAgents()
  }

  async function handleRunNow(id: string) {
    await fetch(`/api/agents/${id}/run`, { method: 'POST' })
    fetchAgents()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this agent?')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    fetchAgents()
  }

  const builtIn  = agents.filter((a) => !a.id.startsWith('user_') && !a.id.includes('-'))
  const userMade = agents.filter((a) =>  a.id.startsWith('user_') ||  a.id.includes('-'))

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <FlexRow style={{
        padding: '18px 24px 14px',
        borderBottom: '1px solid var(--wt-border)',
        alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <FlexCol style={{ gap: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: 700, color: 'var(--wt-text)' }}>Agents</Text>
          <Text style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>
            {agents.filter((a) => a.enabled).length} active · {agents.length} total
          </Text>
        </FlexCol>
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '+ New Agent'}
        </Button>
      </FlexRow>

      <ScrollArea style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
        <FlexCol style={{ gap: 20 }}>

          {/* Create form */}
          {showCreate && (
            <Box style={{
              background: 'var(--wt-settings-bg)',
              border: '1px solid var(--wt-border)',
              borderRadius: 12, padding: 16,
            }}>
              <CreateAgentPanel onCreated={() => { setShowCreate(false); fetchAgents() }} />
            </Box>
          )}

          {loading && (
            <Center style={{ padding: 40 }}>
              <Text style={{ color: 'var(--wt-text-muted)' }}>Loading agents…</Text>
            </Center>
          )}

          {/* User agents */}
          {userMade.length > 0 && (
            <FlexCol style={{ gap: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: 'var(--wt-text-muted)', textTransform: 'uppercase' }}>
                Your Agents
              </Text>
              {userMade.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onToggle={handleToggle}
                  onRunNow={handleRunNow}
                  onDelete={handleDelete}
                />
              ))}
            </FlexCol>
          )}

          {!loading && userMade.length === 0 && !showCreate && (
            <Box style={{
              border: '1px dashed var(--wt-border)', borderRadius: 12,
              padding: 24, textAlign: 'center',
            }}>
              <Text style={{ fontSize: 13, color: 'var(--wt-text-muted)', marginBottom: 10, display: 'block' }}>
                No agents yet. Create one to get started.
              </Text>
              <Button onClick={() => setShowCreate(true)}>Create your first agent</Button>
            </Box>
          )}

          {/* Built-in agents */}
          {builtIn.length > 0 && (
            <FlexCol style={{ gap: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: 'var(--wt-text-muted)', textTransform: 'uppercase' }}>
                Built-in
              </Text>
              {builtIn.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onToggle={handleToggle}
                  onRunNow={handleRunNow}
                  onDelete={handleDelete}
                />
              ))}
            </FlexCol>
          )}
        </FlexCol>
      </ScrollArea>
    </div>
  )
}
