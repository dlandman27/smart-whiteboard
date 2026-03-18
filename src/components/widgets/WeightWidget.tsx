import { useWeightLog } from '../../hooks/useNotion'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Text } from '../../ui/web'
import { FlexCol, FlexRow, Box, Center } from '../../ui/layouts'

const DB_ID = '325b3daa10f080a0819cc8c9dc4098a8'

export interface WeightSettings {
  goalWeight: number
}

const DEFAULTS: WeightSettings = {
  goalWeight: 170,
}

interface Entry {
  date:   string
  weight: number
}

function parseEntries(results: any[]): Entry[] {
  return results
    .map((p) => ({
      date:   p.properties.Date?.date?.start ?? '',
      weight: p.properties.Weight?.number ?? null,
    }))
    .filter((e) => e.date && e.weight !== null) as Entry[]
}

// ── Local components ──────────────────────────────────────────────────────────

function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      variant="label"
      size="small"
      color="muted"
      textTransform="uppercase"
      style={{ letterSpacing: '0.1em', opacity: 0.5 }}
    >
      {children}
    </Text>
  )
}

function StatValue({ children, color }: { children: React.ReactNode; color?: 'default' | 'accent' }) {
  return (
    <Text variant="heading" size="small" color={color ?? 'default'}>
      {children}
    </Text>
  )
}

function Unit() {
  return (
    <Text as="span" variant="caption" size="large" color="muted" style={{ opacity: 0.4, marginLeft: '0.25rem' }}>
      lbs
    </Text>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function WeightWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<WeightSettings>(widgetId, DEFAULTS)
  const { data, isLoading, error } = useWeightLog(DB_ID)

  if (isLoading) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">Loading…</Text>
      </Center>
    )
  }

  if (error) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="danger">{(error as Error).message}</Text>
      </Center>
    )
  }

  const entries = parseEntries(data?.results ?? [])

  if (entries.length === 0) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">No entries yet</Text>
      </Center>
    )
  }

  const current = entries[entries.length - 1].weight
  const first   = entries[0].weight
  const goal    = settings.goalWeight
  const lost    = +(first - current).toFixed(1)
  const toGo    = +(current - goal).toFixed(1)

  const totalNeeded = first - goal
  const progress    = totalNeeded > 0
    ? Math.min(100, Math.max(0, ((first - current) / totalNeeded) * 100))
    : 0

  return (
    <FlexCol justify="center" fullHeight noSelect className="px-5 py-4 gap-3">
      {/* Current weight */}
      <Box>
        <StatLabel>Current</StatLabel>
        <FlexRow align="baseline" className="mt-0.5">
          <Text variant="display" size="large" style={{ fontWeight: '700', lineHeight: '1' }}>
            {current}
          </Text>
          <Unit />
        </FlexRow>
      </Box>

      {/* Progress bar */}
      <Box className="w-full h-1.5 rounded-full" style={{ background: 'var(--wt-border)' }}>
        <Box
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'var(--wt-accent)' }}
        />
      </Box>

      {/* Stats row */}
      <FlexRow gap="md">
        <Box>
          <StatLabel>Goal</StatLabel>
          <StatValue>{goal}<Unit /></StatValue>
        </Box>
        <Box>
          <StatLabel>To go</StatLabel>
          <StatValue color={toGo <= 0 ? 'accent' : 'default'}>
            {toGo <= 0 ? '🎯 Done' : `${toGo} lbs`}
          </StatValue>
        </Box>
        <Box>
          <StatLabel>Lost</StatLabel>
          <StatValue color="accent">
            {lost > 0 ? `−${lost}` : lost}<Unit />
          </StatValue>
        </Box>
      </FlexRow>
    </FlexCol>
  )
}
