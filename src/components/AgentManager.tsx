import { useCallback, useEffect, useState } from 'react'
import { FlexCol, FlexRow, Text, Icon, Button } from '@whiteboard/ui-kit'

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentStatus {
  id:          string
  name:        string
  description: string
  icon:        string
  spriteType?: string
  enabled:     boolean
  lastRun:     string | null
  nextRun:     string | null
}

type ActionType = 'speak' | 'notify' | 'broadcast'

const INTERVAL_OPTIONS = [
  { label: '5 min',  value: 5  * 60_000 },
  { label: '10 min', value: 10 * 60_000 },
  { label: '15 min', value: 15 * 60_000 },
  { label: '30 min', value: 30 * 60_000 },
  { label: '1 hr',   value: 60 * 60_000 },
]

// Built-in agent IDs that cannot be deleted
const BUILT_IN_IDS = new Set([
  'task-monitor', 'calendar-agent', 'focus-agent', 'routine-agent',
  'meeting-countdown', 'end-of-day', 'stale-task-cleanup',
])

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)    return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function statusColor(agent: AgentStatus): string {
  if (!agent.enabled) return 'var(--wt-text-muted)'
  if (agent.lastRun)  return 'var(--wt-success)'
  return 'var(--wt-warning, var(--wt-accent))'
}

function statusLabel(agent: AgentStatus): string {
  if (!agent.enabled) return 'Paused'
  if (agent.lastRun)  return 'Active'
  return 'Pending'
}

// ── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding:      '8px 12px',
  fontSize:     13,
  borderRadius: 8,
  border:       '1px solid var(--wt-border)',
  background:   'var(--wt-surface)',
  color:        'var(--wt-text)',
  outline:      'none',
  width:        '100%',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor:      'pointer',
  appearance:  'none',
  paddingRight: 32,
  backgroundImage:    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat:   'no-repeat',
  backgroundPosition: 'right 10px center',
}

// ── SectionLabel (matches SettingsBoardView style) ───────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      variant="label"
      size="small"
      style={{
        textTransform:  'uppercase',
        letterSpacing:  '0.08em',
        fontWeight:     700,
        opacity:        0.5,
      }}
      color="muted"
    >
      {children}
    </Text>
  )
}

// ── Agent Row ────────────────────────────────────────────────────────────────

function AgentRow({
  agent,
  onToggle,
  onRun,
  onDelete,
}: {
  agent:    AgentStatus
  onToggle: (id: string, enabled: boolean) => void
  onRun:    (id: string) => void
  onDelete: (id: string) => void
}) {
  const [running, setRunning] = useState(false)
  const isBuiltIn = BUILT_IN_IDS.has(agent.id)

  async function handleRun() {
    setRunning(true)
    await onRun(agent.id)
    setTimeout(() => setRunning(false), 1500)
  }

  return (
    <div
      style={{
        background:   'var(--wt-surface)',
        border:       '1px solid var(--wt-border)',
        borderRadius: 12,
        padding:      '14px 16px',
        opacity:      agent.enabled ? 1 : 0.65,
        transition:   'opacity 0.2s',
      }}
    >
      <FlexRow align="center" style={{ justifyContent: 'space-between', gap: 12 }}>
        {/* Left: icon + info */}
        <FlexRow align="center" gap="sm" style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{agent.icon}</span>
          <FlexCol style={{ minWidth: 0, gap: 2 }}>
            <FlexRow align="center" gap="xs">
              <Text variant="label" size="medium" style={{ fontWeight: 600, color: 'var(--wt-text)' }}>
                {agent.name}
              </Text>
              <span
                style={{
                  display:      'inline-block',
                  width:        7,
                  height:       7,
                  borderRadius: '50%',
                  background:   statusColor(agent),
                  flexShrink:   0,
                }}
                title={statusLabel(agent)}
              />
              {!isBuiltIn && (
                <span
                  style={{
                    fontSize:     10,
                    fontWeight:   600,
                    color:        'var(--wt-accent)',
                    background:   'color-mix(in srgb, var(--wt-accent) 12%, transparent)',
                    padding:      '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  Custom
                </span>
              )}
            </FlexRow>
            <Text
              variant="body"
              size="small"
              color="muted"
              style={{
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
                maxWidth:     360,
              }}
            >
              {agent.description}
            </Text>
            <Text variant="body" size="small" color="muted" style={{ fontSize: 11 }}>
              Last run: {relativeTime(agent.lastRun)}
            </Text>
          </FlexCol>
        </FlexRow>

        {/* Right: actions */}
        <FlexRow align="center" gap="xs" style={{ flexShrink: 0 }}>
          {/* Run now */}
          <button
            onClick={handleRun}
            disabled={running}
            title="Run now"
            style={{
              width:        30,
              height:       30,
              borderRadius: 8,
              border:       '1px solid var(--wt-border)',
              background:   running ? 'var(--wt-surface-hover)' : 'var(--wt-bg)',
              color:        'var(--wt-text)',
              cursor:       running ? 'default' : 'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}
          >
            <Icon icon={running ? 'CircleNotch' : 'Play'} size={14} />
          </button>

          {/* Toggle */}
          <button
            onClick={() => onToggle(agent.id, !agent.enabled)}
            title={agent.enabled ? 'Pause agent' : 'Enable agent'}
            style={{
              width:           42,
              height:          24,
              borderRadius:    12,
              border:          'none',
              cursor:          'pointer',
              padding:         3,
              backgroundColor: agent.enabled ? 'var(--wt-accent)' : 'var(--wt-border)',
              position:        'relative',
              flexShrink:      0,
            }}
          >
            <span
              className="block rounded-full transition-transform"
              style={{
                width:      18,
                height:     18,
                background: 'var(--wt-bg)',
                borderRadius: '50%',
                transform:  agent.enabled ? 'translateX(18px)' : 'translateX(0)',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {/* Delete (custom agents only) */}
          {!isBuiltIn && (
            <button
              onClick={() => onDelete(agent.id)}
              title="Delete agent"
              style={{
                width:        30,
                height:       30,
                borderRadius: 8,
                border:       '1px solid var(--wt-border)',
                background:   'var(--wt-bg)',
                color:        'var(--wt-danger)',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
              }}
            >
              <Icon icon="Trash" size={14} />
            </button>
          )}
        </FlexRow>
      </FlexRow>
    </div>
  )
}

// ── Create Agent Form ────────────────────────────────────────────────────────

function CreateAgentForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [intervalMs, setInterval] = useState(INTERVAL_OPTIONS[4].value) // default 1hr
  const [actionType, setAction]   = useState<ActionType>('speak')
  const [creating, setCreating]   = useState(false)
  const [expanded, setExpanded]   = useState(false)

  async function handleCreate() {
    if (!name.trim() || !description.trim()) return
    setCreating(true)

    // Prefix the description with the action type hint for the dynamic runner
    const actionHint =
      actionType === 'notify'    ? '[Action: send a notification] ' :
      actionType === 'broadcast' ? '[Action: broadcast to board] ' :
      ''

    try {
      await fetch('/api/agents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        name.trim(),
          description: actionHint + description.trim(),
          intervalMs,
        }),
      })
      setName('')
      setDesc('')
      setInterval(INTERVAL_OPTIONS[4].value)
      setAction('speak')
      setExpanded(false)
      onCreated()
    } finally {
      setCreating(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          padding:      '10px 16px',
          borderRadius: 12,
          border:       '1px dashed var(--wt-border)',
          background:   'transparent',
          color:        'var(--wt-text-muted)',
          cursor:       'pointer',
          fontSize:     13,
          fontWeight:   500,
          width:        '100%',
          transition:   'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--wt-accent)'
          e.currentTarget.style.color       = 'var(--wt-text)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--wt-border)'
          e.currentTarget.style.color       = 'var(--wt-text-muted)'
        }}
      >
        <Icon icon="Plus" size={16} />
        Create custom agent
      </button>
    )
  }

  return (
    <div
      style={{
        background:   'var(--wt-surface)',
        border:       '1px solid var(--wt-accent)',
        borderRadius: 12,
        padding:      '16px',
      }}
    >
      <FlexCol style={{ gap: 12 }}>
        <FlexRow align="center" style={{ justifyContent: 'space-between' }}>
          <Text variant="label" size="medium" style={{ fontWeight: 600, color: 'var(--wt-text)' }}>
            New Agent
          </Text>
          <button
            onClick={() => setExpanded(false)}
            style={{
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--wt-text-muted)',
              padding:    4,
            }}
          >
            <Icon icon="X" size={14} />
          </button>
        </FlexRow>

        <FlexCol style={{ gap: 8 }}>
          <input
            placeholder="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder='Describe what it should do, e.g. "Check my Notion tasks every hour and alert me if any are overdue"'
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            style={{
              ...inputStyle,
              resize:    'vertical',
              minHeight: 60,
            }}
          />

          <FlexRow gap="sm">
            <FlexCol style={{ flex: 1, gap: 4 }}>
              <Text variant="body" size="small" color="muted">Interval</Text>
              <select
                value={intervalMs}
                onChange={(e) => setInterval(Number(e.target.value))}
                style={selectStyle}
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FlexCol>

            <FlexCol style={{ flex: 1, gap: 4 }}>
              <Text variant="body" size="small" color="muted">Action type</Text>
              <select
                value={actionType}
                onChange={(e) => setAction(e.target.value as ActionType)}
                style={selectStyle}
              >
                <option value="speak">Speak</option>
                <option value="notify">Notify</option>
                <option value="broadcast">Broadcast</option>
              </select>
            </FlexCol>
          </FlexRow>
        </FlexCol>

        <FlexRow style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
          >
            Cancel
          </Button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !description.trim()}
            style={{
              padding:      '7px 18px',
              borderRadius: 8,
              fontSize:     13,
              fontWeight:   600,
              border:       'none',
              cursor:       creating ? 'default' : 'pointer',
              background:   'var(--wt-accent)',
              color:        'var(--wt-accent-text)',
              opacity:      (!name.trim() || !description.trim()) ? 0.5 : 1,
            }}
          >
            {creating ? 'Creating...' : 'Create Agent'}
          </button>
        </FlexRow>
      </FlexCol>
    </div>
  )
}

// ── Main AgentManager ────────────────────────────────────────────────────────

export function AgentManager() {
  const [agents, setAgents]   = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    try {
      const res  = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data)
    } catch {
      // server unreachable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  // Refresh every 30s to keep lastRun/status up to date
  useEffect(() => {
    const timer = setInterval(fetchAgents, 30_000)
    return () => clearInterval(timer)
  }, [fetchAgents])

  async function handleToggle(id: string, enabled: boolean) {
    // Optimistic update
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, enabled } : a))
    await fetch(`/api/agents/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ enabled }),
    })
    fetchAgents()
  }

  async function handleRun(id: string) {
    await fetch(`/api/agents/${id}/run`, { method: 'POST' })
    setTimeout(fetchAgents, 1000)
  }

  async function handleDelete(id: string) {
    setAgents((prev) => prev.filter((a) => a.id !== id))
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    fetchAgents()
  }

  const builtIn = agents.filter((a) => BUILT_IN_IDS.has(a.id))
  const custom  = agents.filter((a) => !BUILT_IN_IDS.has(a.id))

  return (
    <FlexCol style={{ gap: 24 }}>
      {/* Built-in agents */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Built-in Agents</SectionLabel>
        </div>

        {loading ? (
          <FlexCol style={{ gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height:       72,
                  borderRadius: 12,
                  background:   'var(--wt-surface)',
                  border:       '1px solid var(--wt-border)',
                  animation:    'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </FlexCol>
        ) : (
          <FlexCol style={{ gap: 8 }}>
            {builtIn.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                onToggle={handleToggle}
                onRun={handleRun}
                onDelete={handleDelete}
              />
            ))}
          </FlexCol>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--wt-border)' }} />

      {/* Custom agents */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Custom Agents</SectionLabel>
        </div>

        <FlexCol style={{ gap: 8 }}>
          {custom.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              onToggle={handleToggle}
              onRun={handleRun}
              onDelete={handleDelete}
            />
          ))}

          {!loading && custom.length === 0 && (
            <Text variant="body" size="small" color="muted" style={{ marginBottom: 4 }}>
              No custom agents yet. Create one to automate tasks with natural language.
            </Text>
          )}

          <CreateAgentForm onCreated={fetchAgents} />
        </FlexCol>
      </div>
    </FlexCol>
  )
}
