import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { Plus, Minus, Check, X } from 'lucide-react'
import { useWeightLog, useCreatePage } from '../../hooks/useNotion'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Text, Icon } from '../../ui/web'
import { FlexCol, FlexRow, Box, Center } from '../../ui/layouts'

export type WeightView  = 'stats' | 'chart' | 'both'
export type WeightRange = 'week' | 'month' | 'year' | 'all'

export interface WeightSettings {
  databaseId:  string
  goalWeight:  number
  view:        WeightView
  goalStep:    number   // milestone interval, e.g. 5 lbs — 0 = disabled
  weeklyGoal:  number   // target lbs to lose per week — 0 = disabled
}

const DEFAULTS: WeightSettings = {
  databaseId: '',
  goalWeight:  170,
  view:       'both',
  goalStep:    0,
  weeklyGoal:  0,
}

interface Entry {
  date:   string
  weight: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEntries(results: any[]): Entry[] {
  return results
    .map((p) => ({
      date:   p.properties.Date?.date?.start ?? '',
      weight: p.properties.Weight?.number ?? null,
    }))
    .filter((e) => e.date && e.weight !== null) as Entry[]
}

function filterByRange(entries: Entry[], range: WeightRange): Entry[] {
  if (range === 'all') return entries
  const days   = range === 'week' ? 7 : range === 'month' ? 30 : 365
  const cutoff = new Date(Date.now() - days * 86_400_000)
  return entries.filter((e) => new Date(e.date) >= cutoff)
}

function formatTick(date: string, range: WeightRange): string {
  const d = new Date(date)
  if (range === 'week')  return d.toLocaleDateString('en-US', { weekday: 'short' })
  if (range === 'year')  return d.toLocaleDateString('en-US', { month: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Returns the next N-lb milestone below current weight toward goal. */
function getNextMilestone(current: number, goal: number, step: number): { target: number; from: number } | null {
  if (!step || step <= 0 || current <= goal) return null
  const target = Math.max(Math.ceil(current / step) * step - step, goal)
  const from   = target + step
  return { target, from }
}

/** Returns the Monday of the current week at midnight. */
function getWeekStart(): Date {
  const d   = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

/** Closest entry on or before a given date. */
function entryOnOrBefore(entries: Entry[], date: Date): Entry | null {
  const dateStr = date.toISOString().slice(0, 10)
  let best: Entry | null = null
  for (const e of entries) {
    if (e.date <= dateStr) best = e
  }
  return best
}

// ── Stat subcomponents ────────────────────────────────────────────────────────

function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" size="small" color="muted" textTransform="uppercase"
      style={{ letterSpacing: '0.1em', opacity: 0.5 }}>
      {children}
    </Text>
  )
}

function StatValue({ children, color }: { children: React.ReactNode; color?: 'default' | 'accent' }) {
  return <Text variant="heading" size="small" color={color ?? 'default'}>{children}</Text>
}

function Unit() {
  return (
    <Text as="span" variant="caption" size="large" color="muted"
      style={{ opacity: 0.4, marginLeft: '0.25rem' }}>
      lbs
    </Text>
  )
}

function MiniBar({ pct, color = 'var(--wt-accent)' }: { pct: number; color?: string }) {
  return (
    <Box className="w-full h-1 rounded-full mt-1" style={{ background: 'var(--wt-border)' }}>
      <Box
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </Box>
  )
}

// ── Range tabs ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { value: WeightRange; label: string }[] = [
  { value: 'week',  label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year',  label: 'Year' },
  { value: 'all',   label: 'All Time' },
]

function RangeTabs({ range, onChange }: { range: WeightRange; onChange: (r: WeightRange) => void }) {
  return (
    <FlexRow align="center" className="gap-0.5 flex-shrink-0">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onChange(opt.value)}
          className="px-1.5 py-0.5 rounded transition-all"
          style={{
            fontSize:   '10px',
            fontWeight: range === opt.value ? 600 : 400,
            background: range === opt.value ? 'var(--wt-accent)' : 'transparent',
            color:      range === opt.value ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
            opacity:    range === opt.value ? 1 : 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
        </button>
      ))}
    </FlexRow>
  )
}

// ── Add entry form ────────────────────────────────────────────────────────────

function AddEntryForm({ databaseId, lastWeight, onDone }: {
  databaseId: string
  lastWeight: number
  onDone:     () => void
}) {
  const createPage          = useCreatePage(databaseId)
  const [date,   setDate]   = useState(todayStr())
  const [weight, setWeight] = useState(lastWeight)

  function adjust(delta: number) {
    setWeight((w) => Math.round((w + delta) * 10) / 10)
  }

  function save() {
    if (!weight || !date) return
    createPage.mutate(
      { Date: { date: { start: date } }, Weight: { number: weight } },
      { onSuccess: onDone },
    )
  }

  return (
    <FlexCol
      className="absolute inset-0 px-5 py-4 gap-4"
      style={{ background: 'var(--wt-bg)', zIndex: 10 }}
    >
      <FlexRow align="center" justify="between" className="flex-shrink-0">
        <Text variant="label" color="muted" textTransform="uppercase"
          style={{ letterSpacing: '0.08em', opacity: 0.5, fontSize: 11 }}>
          Log Weight
        </Text>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onDone} className="wt-action-btn">
          <Icon icon={X} size={13} />
        </button>
      </FlexRow>

      <FlexCol className="gap-1.5 flex-shrink-0">
        <Text variant="label" size="small" color="muted"
          style={{ opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Weight (lbs)
        </Text>
        <FlexRow align="center" className="gap-3">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => adjust(-0.1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}
          >
            <Icon icon={Minus} size={13} />
          </button>
          <input
            type="number"
            step="0.1"
            value={weight}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="wt-input flex-1 text-center font-semibold"
            style={{ fontSize: 22, padding: '6px 8px' }}
          />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => adjust(0.1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}
          >
            <Icon icon={Plus} size={13} />
          </button>
        </FlexRow>
      </FlexCol>

      <FlexCol className="gap-1.5 flex-shrink-0">
        <Text variant="label" size="small" color="muted"
          style={{ opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Date
        </Text>
        <input
          type="date"
          value={date}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => setDate(e.target.value)}
          className="wt-input w-full"
          style={{ fontSize: 13, padding: '6px 10px' }}
        />
      </FlexCol>

      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={save}
        disabled={createPage.isPending}
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40 flex-shrink-0"
        style={{ background: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}
      >
        <Icon icon={Check} size={14} />
        {createPage.isPending ? 'Saving…' : 'Save'}
      </button>
    </FlexCol>
  )
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function WeightChart({ entries, goal, range }: {
  entries: Entry[]
  goal:    number
  range:   WeightRange
}) {
  const filtered = filterByRange(entries, range)
  const data     = filtered.map((e) => ({ label: formatTick(e.date, range), weight: e.weight }))
  const weights  = filtered.map((e) => e.weight)
  const minW     = weights.length ? Math.min(...weights, goal) : goal
  const maxW     = weights.length ? Math.max(...weights, goal) : goal
  const pad      = Math.max((maxW - minW) * 0.2, 3)

  if (filtered.length < 2) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">Not enough data for this range</Text>
      </Center>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--wt-border)" strokeOpacity={0.4} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--wt-text-muted)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minW - pad, maxW + pad]}
          tick={{ fontSize: 10, fill: 'var(--wt-text-muted)' }}
          tickLine={false}
          axisLine={false}
          tickCount={4}
        />
        <Tooltip
          contentStyle={{
            background:   'var(--wt-settings-bg)',
            border:       '1px solid var(--wt-border)',
            borderRadius: '8px',
            fontSize:     '12px',
            color:        'var(--wt-text)',
            boxShadow:    'var(--wt-shadow-md)',
          }}
          formatter={(v: number) => [`${v} lbs`, 'Weight']}
          labelStyle={{ color: 'var(--wt-text-muted)', marginBottom: 2 }}
          cursor={{ stroke: 'var(--wt-border)', strokeWidth: 1 }}
        />
        <ReferenceLine
          y={goal}
          stroke="var(--wt-accent)"
          strokeDasharray="4 3"
          strokeOpacity={0.4}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="var(--wt-accent)"
          strokeWidth={2}
          dot={filtered.length <= 20
            ? { r: 3, fill: 'var(--wt-accent)', strokeWidth: 0 }
            : false
          }
          activeDot={{ r: 5, fill: 'var(--wt-accent)', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Add button ────────────────────────────────────────────────────────────────

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 flex-shrink-0"
      style={{ background: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}
    >
      <Icon icon={Plus} size={12} />
    </button>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function WeightWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<WeightSettings>(widgetId, DEFAULTS)
  const { data, isLoading, error } = useWeightLog(settings.databaseId)
  const [range,  setRange]  = useState<WeightRange>('month')
  const [adding, setAdding] = useState(false)

  if (!settings.databaseId) {
    return <Center fullHeight><Text variant="caption" color="muted">Set your Notion database ID in settings</Text></Center>
  }
  if (isLoading) {
    return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  }
  if (error) {
    return <Center fullHeight><Text variant="caption" color="danger">{(error as Error).message}</Text></Center>
  }

  const entries = parseEntries(data?.results ?? [])
  const view    = settings.view ?? 'both'
  const goal    = settings.goalWeight

  if (entries.length === 0) {
    return (
      <Box className="relative w-full h-full">
        <Center fullHeight>
          <FlexCol align="center" className="gap-3">
            <Text variant="caption" color="muted">No entries yet</Text>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}
            >
              <Icon icon={Plus} size={12} /> Log first entry
            </button>
          </FlexCol>
        </Center>
        {adding && <AddEntryForm databaseId={settings.databaseId} lastWeight={goal} onDone={() => setAdding(false)} />}
      </Box>
    )
  }

  const current      = entries[entries.length - 1].weight
  const allTimeFirst = entries[0].weight
  const totalNeeded  = allTimeFirst - goal
  const progress     = totalNeeded > 0
    ? Math.min(100, Math.max(0, ((allTimeFirst - current) / totalNeeded) * 100))
    : 0

  // Range stats
  const rangeEntries = filterByRange(entries, range)
  const rangeStart   = rangeEntries.length > 0 ? rangeEntries[0].weight : current
  const lost         = +(rangeStart - current).toFixed(1)
  const toGo         = +(current - goal).toFixed(1)

  // Milestone goal
  const milestone = getNextMilestone(current, goal, settings.goalStep ?? 0)
  const milePct   = milestone
    ? ((milestone.from - current) / (milestone.from - milestone.target)) * 100
    : 0

  // Weekly goal progress (used in stats view when range = week)
  const weeklyGoal = settings.weeklyGoal ?? 0
  let weeklyLost    = 0
  let weeklyPct     = 0
  let weeklyOnTrack = false
  if (weeklyGoal > 0) {
    const weekStart    = getWeekStart()
    const weekStartEntry = entryOnOrBefore(entries, weekStart)
    const weekStartW   = weekStartEntry?.weight ?? current
    weeklyLost  = +(weekStartW - current).toFixed(1)
    // Expected by today: goal * (days elapsed / 7)
    const dayOfWeek    = ((new Date().getDay() + 6) % 7) + 1 // Mon=1…Sun=7
    const expectedSoFar = +(weeklyGoal * (dayOfWeek / 7)).toFixed(1)
    weeklyPct          = weeklyGoal > 0 ? (weeklyLost / weeklyGoal) * 100 : 0
    weeklyOnTrack      = weeklyLost >= expectedSoFar
  }

  // ── both: current + range tabs + chart ──────────────────────────────────────
  if (view === 'both') {
    return (
      <Box className="relative w-full h-full overflow-hidden">
        <FlexCol fullHeight fullWidth noSelect>
          <FlexRow fullWidth align="center" justify="between" className="px-4 pt-3 pb-1 flex-shrink-0">
            <FlexRow align="baseline" className="gap-0">
              <Text variant="display" size="large" style={{ fontWeight: '700', lineHeight: '1' }}>{current}</Text>
              <Unit />
            </FlexRow>
            <FlexRow align="center" className="gap-2">
              <RangeTabs range={range} onChange={setRange} />
              <AddBtn onClick={() => setAdding(true)} />
            </FlexRow>
          </FlexRow>

          {/* Next milestone chip — only if goalStep set */}
          {milestone && (
            <FlexRow align="center" className="px-4 pb-1 gap-2 flex-shrink-0">
              <Text style={{ fontSize: 10, opacity: 0.45, color: 'var(--wt-text-muted)', whiteSpace: 'nowrap' }}>
                Next goal
              </Text>
              <Box className="flex-1 h-1 rounded-full" style={{ background: 'var(--wt-border)' }}>
                <Box
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, milePct)}%`, background: 'var(--wt-accent)', opacity: 0.7 }}
                />
              </Box>
              <Text style={{ fontSize: 10, opacity: 0.55, color: 'var(--wt-text-muted)', whiteSpace: 'nowrap' }}>
                {milestone.target} lbs
              </Text>
            </FlexRow>
          )}

          <Box flex1 className="min-h-0 w-full px-2 pb-2 pt-1">
            <WeightChart entries={entries} goal={goal} range={range} />
          </Box>
        </FlexCol>
        {adding && <AddEntryForm databaseId={settings.databaseId} lastWeight={current} onDone={() => setAdding(false)} />}
      </Box>
    )
  }

  // ── chart only ───────────────────────────────────────────────────────────────
  if (view === 'chart') {
    return (
      <Box className="relative w-full h-full overflow-hidden">
        <FlexCol fullHeight fullWidth noSelect>
          <FlexRow fullWidth align="center" justify="between" className="px-3 pt-2 pb-0 flex-shrink-0">
            <RangeTabs range={range} onChange={setRange} />
            <AddBtn onClick={() => setAdding(true)} />
          </FlexRow>
          <Box flex1 className="min-h-0 w-full px-2 pb-2 pt-1">
            <WeightChart entries={entries} goal={goal} range={range} />
          </Box>
        </FlexCol>
        {adding && <AddEntryForm databaseId={settings.databaseId} lastWeight={current} onDone={() => setAdding(false)} />}
      </Box>
    )
  }

  // ── stats only ───────────────────────────────────────────────────────────────
  return (
    <Box className="relative w-full h-full overflow-hidden">
      <FlexCol fullHeight fullWidth noSelect>
        {/* Toolbar */}
        <FlexRow fullWidth align="center" justify="between" className="px-4 pt-3 flex-shrink-0">
          <RangeTabs range={range} onChange={setRange} />
          <AddBtn onClick={() => setAdding(true)} />
        </FlexRow>

        <FlexCol justify="center" flex1 className="min-h-0 px-5 py-3 gap-3">
          {/* Current */}
          <Box>
            <StatLabel>Current</StatLabel>
            <FlexRow align="baseline" className="mt-0.5">
              <Text variant="display" size="large" style={{ fontWeight: '700', lineHeight: '1' }}>{current}</Text>
              <Unit />
            </FlexRow>
          </Box>

          {/* All-time progress bar */}
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
              <StatValue color="accent">{lost > 0 ? `−${lost}` : `${lost}`}<Unit /></StatValue>
            </Box>
          </FlexRow>

          {/* Next milestone */}
          {milestone && (
            <Box>
              <FlexRow align="center" justify="between" className="mb-1">
                <StatLabel>Next goal</StatLabel>
                <Text style={{ fontSize: 11, color: 'var(--wt-text-muted)', opacity: 0.6 }}>
                  {milestone.target} lbs · {+(current - milestone.target).toFixed(1)} to go
                </Text>
              </FlexRow>
              <MiniBar pct={milePct} />
            </Box>
          )}

          {/* Weekly goal — only shown in week range */}
          {weeklyGoal > 0 && range === 'week' && (
            <Box>
              <FlexRow align="center" justify="between" className="mb-1">
                <StatLabel>This week</StatLabel>
                <Text style={{ fontSize: 11, color: weeklyOnTrack ? 'var(--wt-accent)' : 'var(--wt-text-muted)', opacity: 0.8 }}>
                  {weeklyLost > 0 ? `−${weeklyLost}` : weeklyLost} / {weeklyGoal} lbs · {weeklyOnTrack ? 'On track' : 'Behind'}
                </Text>
              </FlexRow>
              <MiniBar
                pct={weeklyPct}
                color={weeklyOnTrack ? 'var(--wt-accent)' : 'oklch(0.65 0.15 25)'}
              />
            </Box>
          )}
        </FlexCol>
      </FlexCol>
      {adding && <AddEntryForm databaseId={settings.databaseId} lastWeight={current} onDone={() => setAdding(false)} />}
    </Box>
  )
}
