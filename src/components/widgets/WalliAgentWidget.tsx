import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, FlexCol, FlexRow, Text } from '@whiteboard/ui-kit'
import { useWalliAgentsStore, type AgentDomain } from '../../store/walliAgents'
import { apiFetch } from '../../lib/apiFetch'

interface WalliAgentWidgetSettings {
  agentId: AgentDomain
  label?:  string
}

const AGENT_LABELS: Record<AgentDomain, string> = {
  apollo: 'Apollo',
  miles:  'Miles',
  harvey: 'Harvey',
  alfred: 'Alfred',
  walli:  'Walli',
}

// Agent colors mapped to theme tokens — each agent uses a semantic color
// so they shift with the theme while staying visually distinct
const AGENT_COLORS: Record<AgentDomain, string> = {
  apollo: 'var(--wt-success)',
  miles:  'var(--wt-danger)',
  harvey: 'var(--wt-accent)',
  alfred: 'var(--wt-info)',
  walli:  'var(--wt-accent)',
}

// ── Health (Apollo) ───────────────────────────────────────────────────────────

function HealthView({ data }: { data: Record<string, unknown> }) {
  const steps    = data.steps    as number | undefined
  const exercise = data.exercise_minutes as number | undefined
  const weight   = data.weight   as string | undefined
  const stepGoal = 10_000
  const exGoal   = 30
  const stepPct  = steps    ? Math.min(100, Math.round((steps / stepGoal) * 100))    : 0
  const exPct    = exercise ? Math.min(100, Math.round((exercise / exGoal) * 100)) : 0

  return (
    <FlexCol gap={8} style={{ padding: '8px 0' }}>
      <Stat label="Steps"    value={steps    ? `${steps.toLocaleString()} / ${stepGoal.toLocaleString()}` : '—'} pct={stepPct} />
      <Stat label="Exercise" value={exercise ? `${exercise} / ${exGoal} min` : '—'} pct={exPct} />
      {weight && <Text size="small" color="muted">{weight}</Text>}
    </FlexCol>
  )
}

// ── Tasks (Miles) ─────────────────────────────────────────────────────────────

function TasksView({ data }: { data: Record<string, unknown> }) {
  const overdue   = (data.overdue   as any[]) ?? []
  const dueToday  = (data.due_today as any[]) ?? []
  const all       = [...overdue, ...dueToday].slice(0, 8)

  if (!all.length) return <Text size="small" color="muted">No tasks due today</Text>

  return (
    <FlexCol gap={4} style={{ padding: '4px 0' }}>
      {all.map((t: any) => (
        <FlexRow key={t.id} gap={6} align="center">
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: overdue.includes(t) ? 'var(--wt-danger)' : 'var(--wt-success)',
          }} />
          <Text size="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.content}
          </Text>
        </FlexRow>
      ))}
    </FlexCol>
  )
}

// ── Habits (Harvey) ───────────────────────────────────────────────────────────

function HabitsView({ data }: { data: Record<string, unknown> }) {
  const morning = (data.morning_done as string[]) ?? []
  const evening = (data.evening_done as string[]) ?? []
  const total   = morning.length + evening.length

  if (!total) return <Text size="small" color="muted">No habits logged yet today</Text>

  return (
    <FlexCol gap={4} style={{ padding: '4px 0' }}>
      {morning.length > 0 && (
        <Text size="small" color="muted">Morning: {morning.join(', ')}</Text>
      )}
      {evening.length > 0 && (
        <Text size="small" color="muted">Evening: {evening.join(', ')}</Text>
      )}
    </FlexCol>
  )
}

// ── Generic fallback ──────────────────────────────────────────────────────────

function GenericView({ data }: { data: Record<string, unknown> }) {
  const text = data.text ?? data.summary ?? data.response
  if (typeof text === 'string') return <Text size="small">{text}</Text>
  return <Text size="small" color="muted">No data</Text>
}

// ── Stat bar ──────────────────────────────────────────────────────────────────

function Stat({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <FlexCol gap={2}>
      <FlexRow justify="between">
        <Text size="small" color="muted">{label}</Text>
        <Text size="small">{value}</Text>
      </FlexRow>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--wt-surface-hover)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'var(--wt-success)', transition: 'width 0.4s ease' }} />
      </div>
    </FlexCol>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function WalliAgentWidget({ widgetId }: { widgetId: string }) {
  const { settings } = useWidgetSettings<WalliAgentWidgetSettings>(widgetId)
  const agentId      = settings?.agentId ?? 'apollo'
  const agentState   = useWalliAgentsStore((s) => s.widgets[`${agentId}-primary`])
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from server on first mount
  useEffect(() => {
    if (hydrated) return
    setHydrated(true)
    apiFetch<any[]>('/api/walli/widgets')
      .then((widgets) => {
        widgets.forEach((w) => useWalliAgentsStore.getState().setWidget(w))
      })
      .catch(() => {/* server not available */})
  }, [hydrated])

  const color = AGENT_COLORS[agentId]
  const label = settings?.label ?? AGENT_LABELS[agentId]
  const data  = agentState?.data ?? {}
  const updatedAt = agentState?.updated_at
    ? new Date(agentState.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <Container widgetId={widgetId} style={{ padding: 16 }}>
      <FlexCol gap={10} style={{ height: '100%' }}>
        {/* Header */}
        <FlexRow justify="between" align="center">
          <FlexRow gap={6} align="center">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <Text size="small" style={{ fontWeight: 600 }}>{label}</Text>
          </FlexRow>
          {updatedAt && <Text size="small" color="muted">{updatedAt}</Text>}
        </FlexRow>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {!agentState ? (
            <Text size="small" color="muted">Waiting for {label}...</Text>
          ) : agentId === 'apollo' ? (
            <HealthView data={data} />
          ) : agentId === 'miles' ? (
            <TasksView data={data} />
          ) : agentId === 'harvey' ? (
            <HabitsView data={data} />
          ) : (
            <GenericView data={data} />
          )}
        </div>
      </FlexCol>
    </Container>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function WalliAgentSettings({ widgetId }: { widgetId: string }) {
  const { settings, updateSettings } = useWidgetSettings<WalliAgentWidgetSettings>(widgetId)
  const agentId = settings?.agentId ?? 'apollo'

  const agents: { id: AgentDomain; label: string }[] = [
    { id: 'apollo', label: 'Apollo — Health' },
    { id: 'miles',  label: 'Miles — Tasks' },
    { id: 'harvey', label: 'Harvey — Habits' },
    { id: 'alfred', label: 'Alfred — Calendar' },
  ]

  return (
    <FlexCol gap={12} style={{ padding: 16 }}>
      <Text size="small" style={{ fontWeight: 600 }}>Agent</Text>
      <FlexCol gap={6}>
        {agents.map((a) => (
          <FlexRow
            key={a.id}
            gap={8}
            align="center"
            style={{ cursor: 'pointer', opacity: agentId === a.id ? 1 : 0.5 }}
            onClick={() => updateSettings({ agentId: a.id })}
          >
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: agentId === a.id ? AGENT_COLORS[a.id] : 'transparent',
              border: `2px solid ${AGENT_COLORS[a.id]}`,
            }} />
            <Text size="small">{a.label}</Text>
          </FlexRow>
        ))}
      </FlexCol>
    </FlexCol>
  )
}
