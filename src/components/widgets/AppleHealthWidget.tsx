import { useAppleHealth } from '../../hooks/useAppleHealth'
import { Container, Text, FlexCol, FlexRow, Icon, Center, useWidgetSizeContext } from '@whiteboard/ui-kit'

const STEPS_GOAL    = 10_000
const EXERCISE_GOAL = 30
const ACTIVE_GOAL   = 500

const RING = {
  steps:    { fill: '#FF375F', track: '#3D1020', label: 'Steps' },
  exercise: { fill: '#30D158', track: '#0D2B17', label: 'Exercise' },
  active:   { fill: '#40C8E0', track: '#0D2830', label: 'Active' },
}

// ── SVG ring helpers ──────────────────────────────────────────────────────────

function ringArc(cx: number, cy: number, r: number, pct: number): string {
  const p = Math.min(Math.max(pct, 0), 0.9999)
  if (p <= 0) return ''
  const start = -Math.PI / 2
  const end   = start + p * 2 * Math.PI
  const x1 = cx + r * Math.cos(start)
  const y1 = cy + r * Math.sin(start)
  const x2 = cx + r * Math.cos(end)
  const y2 = cy + r * Math.sin(end)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

interface ActivityRingsProps {
  steps:    number
  exercise: number
  active:   number
  size:     number
}

function ActivityRings({ steps, exercise, active, size }: ActivityRingsProps) {
  const cx = size / 2
  const cy = size / 2
  const sw = Math.max(8, size * 0.075) // stroke width scales with size

  const rings = [
    { r: size * 0.40, pct: steps / STEPS_GOAL,    ...RING.steps },
    { r: size * 0.30, pct: exercise / EXERCISE_GOAL, ...RING.exercise },
    { r: size * 0.20, pct: active / ACTIVE_GOAL,   ...RING.active },
  ]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {rings.map(({ r, pct, fill, track }) => (
        <g key={r}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={sw} />
          {pct > 0 && (
            <path
              d={ringArc(cx, cy, r, pct)}
              fill="none"
              stroke={fill}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          )}
        </g>
      ))}
    </svg>
  )
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({ icon, label, value, color, sub }: {
  icon:   string
  label:  string
  value:  string
  color:  string
  sub?:   string
}) {
  return (
    <FlexRow align="center" gap="sm" style={{ padding: '6px 0', borderBottom: '1px solid var(--wt-border)' }}>
      <Icon icon={icon} size={14} style={{ color, flexShrink: 0 }} />
      <Text variant="label" size="small" color="muted" style={{ flex: 1, fontSize: 11 }}>{label}</Text>
      <FlexCol gap="none" align="end">
        <Text variant="body" size="small" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{value}</Text>
        {sub && <Text variant="label" size="small" color="muted" style={{ fontSize: 10 }}>{sub}</Text>}
      </FlexCol>
    </FlexRow>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--wt-surface-hover)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width:  `${Math.min(pct * 100, 100)}%`,
        background: color,
        borderRadius: 2,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function AppleHealthWidget({ widgetId: _widgetId }: { widgetId: string }) {
  const { containerWidth: w, containerHeight: h } = useWidgetSizeContext()
  const { data, updatedAt, hasData } = useAppleHealth()

  const isNarrow  = w < 220
  const isCompact = h < 340

  if (!hasData) {
    return (
      <Container>
        <Center fullHeight>
          <FlexCol align="center" gap="sm">
            <Icon icon="AppleLogo" size={28} style={{ color: 'var(--wt-text-muted)', opacity: 0.4 }} />
            <Text variant="body" size="small" color="muted" align="center">
              Waiting for Apple Health data
            </Text>
            <Text variant="label" size="small" color="muted" align="center" style={{ opacity: 0.5, maxWidth: 160 }}>
              Open Health Auto Export on your phone to sync
            </Text>
          </FlexCol>
        </Center>
      </Container>
    )
  }

  const steps    = data.steps    ?? 0
  const exercise = data.exercise_minutes  ?? 0
  const active   = data.active_energy_kcal ?? 0

  const ringSize = isNarrow ? 120 : Math.min(w * 0.65, 180)

  const lastSync = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <Container style={{ overflowY: 'auto' }}>
      <FlexCol gap="none" style={{ padding: '12px 14px', minHeight: '100%' }}>

        {/* Header */}
        <FlexRow align="center" justify="between" style={{ marginBottom: 10 }}>
          <FlexRow align="center" gap="xs">
            <Icon icon="HeartStraight" size={14} style={{ color: RING.steps.fill }} weight="fill" />
            <Text variant="label" size="small" style={{ fontWeight: 600, fontSize: 12 }}>Apple Health</Text>
          </FlexRow>
          {lastSync && (
            <Text variant="label" size="small" color="muted" style={{ fontSize: 10, opacity: 0.5 }}>
              {lastSync}
            </Text>
          )}
        </FlexRow>

        {/* Weight — prominent */}
        {data.weight != null && (
          <div style={{
            background: 'var(--wt-surface-hover)',
            borderRadius: 10,
            padding: '8px 12px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
          }}>
            <Icon icon="Scales" size={13} style={{ color: 'var(--wt-text-muted)', marginRight: 4 }} />
            <Text variant="display" size="small" style={{ fontWeight: 600, fontSize: 22, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {data.weight.toFixed(1)}
            </Text>
            <Text variant="label" size="small" color="muted" style={{ fontSize: 12 }}>lbs</Text>
          </div>
        )}

        {/* Activity Rings */}
        {!isCompact && (
          <FlexCol align="center" style={{ marginBottom: 12 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <ActivityRings steps={steps} exercise={exercise} active={active} size={ringSize} />
              {/* Center: step count */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <Text variant="display" size="small" style={{ fontWeight: 700, fontSize: ringSize * 0.13, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {steps.toLocaleString()}
                </Text>
                <Text variant="label" size="small" color="muted" style={{ fontSize: ringSize * 0.08 }}>steps</Text>
              </div>
            </div>

            {/* Ring legend */}
            <FlexRow gap="md" style={{ marginTop: 8 }}>
              {[
                { color: RING.steps.fill,    label: 'Steps',    pct: steps / STEPS_GOAL },
                { color: RING.exercise.fill,  label: 'Exercise', pct: exercise / EXERCISE_GOAL },
                { color: RING.active.fill,    label: 'Active',   pct: active / ACTIVE_GOAL },
              ].map(({ color, label, pct }) => (
                <FlexCol key={label} align="center" gap="none" style={{ minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginBottom: 2 }} />
                  <Text variant="label" size="small" color="muted" style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{label}</Text>
                  <Text variant="label" size="small" style={{ fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(pct * 100)}%
                  </Text>
                </FlexCol>
              ))}
            </FlexRow>
          </FlexCol>
        )}

        {/* Steps progress (compact fallback) */}
        {isCompact && (
          <div style={{ marginBottom: 10 }}>
            <FlexRow justify="between" style={{ marginBottom: 3 }}>
              <Text variant="label" size="small" color="muted" style={{ fontSize: 11 }}>Steps</Text>
              <Text variant="label" size="small" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                {steps.toLocaleString()} / {STEPS_GOAL.toLocaleString()}
              </Text>
            </FlexRow>
            <ProgressBar pct={steps / STEPS_GOAL} color={RING.steps.fill} />
          </div>
        )}

        {/* Stats */}
        <FlexCol gap="none" style={{ flex: 1 }}>
          {exercise > 0 && (
            <StatRow
              icon="Lightning"
              label="Exercise"
              value={`${exercise} min`}
              color={RING.exercise.fill}
              sub={`goal: ${EXERCISE_GOAL} min`}
            />
          )}
          {active > 0 && (
            <StatRow
              icon="Fire"
              label="Active Energy"
              value={`${active.toLocaleString()} kcal`}
              color={RING.active.fill}
            />
          )}
          {data.walk_distance_mi != null && (
            <StatRow
              icon="Sneaker"
              label="Distance"
              value={`${data.walk_distance_mi.toFixed(2)} mi`}
              color="var(--wt-text-muted)"
            />
          )}
          {data.resting_heart_rate != null && (
            <StatRow
              icon="Heartbeat"
              label="Resting HR"
              value={`${data.resting_heart_rate} bpm`}
              color="#FF6B8A"
            />
          )}
          {data.flights_climbed != null && (
            <StatRow
              icon="Stairs"
              label="Flights"
              value={`${data.flights_climbed}`}
              color="var(--wt-text-muted)"
            />
          )}
        </FlexCol>

      </FlexCol>
    </Container>
  )
}
