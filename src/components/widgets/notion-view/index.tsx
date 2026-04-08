import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { useWidgetSettings } from '@whiteboard/sdk'
import { useNotionView } from '../../../hooks/useNotion'
import { FlexCol, FlexRow, Box, Center } from '@whiteboard/ui-kit'
import { Text } from '@whiteboard/ui-kit'
import type { NotionViewSettings, TemplateProps, NotionPage } from './types'
import { getProp, formatDate, formatValue } from './utils'

const DEFAULTS: NotionViewSettings = {
  databaseId: '',
  template:   'data-table',
  fieldMap:   {},
  options:    {},
}

// ── Shared ────────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <Center fullHeight>
      <Text variant="caption" color="muted">{label}</Text>
    </Center>
  )
}

function WidgetHeader({ title }: { title?: string }) {
  if (!title) return null
  return (
    <FlexRow fullWidth align="center" className="px-4 pt-3 pb-1 flex-shrink-0">
      <Text variant="label" size="small" color="muted"
        style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>
        {title}
      </Text>
    </FlexRow>
  )
}

// ── Template: metric-chart ────────────────────────────────────────────────────
// fieldMap: { value: "PropName", date: "PropName" }
// options:  { goal?, unit?, label?, chartType?: "line"|"bar" }

type MetricRange = 'week' | 'month' | 'year' | 'all'
const RANGES: { value: MetricRange; label: string }[] = [
  { value: 'week',  label: 'W' },
  { value: 'month', label: 'M' },
  { value: 'year',  label: 'Y' },
  { value: 'all',   label: 'All' },
]

function filterByRange(entries: { date: string; value: number }[], range: MetricRange) {
  if (range === 'all') return entries
  const days   = range === 'week' ? 7 : range === 'month' ? 30 : 365
  const cutoff = new Date(Date.now() - days * 86_400_000)
  return entries.filter((e) => new Date(e.date) >= cutoff)
}

function MetricChartTemplate({ pages, fieldMap, options }: TemplateProps) {
  const [range, setRange] = useState<MetricRange>('month')
  const valueField = fieldMap.value as string
  const dateField  = fieldMap.date  as string
  const unit       = options.unit   as string | undefined
  const goal       = options.goal   as number | undefined
  const chartType  = (options.chartType as string) ?? 'line'

  const entries = pages
    .map((p) => ({ date: getProp(p, dateField) as string, value: getProp(p, valueField) as number }))
    .filter((e) => e.date && e.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (!entries.length) return <EmptyState label="No data yet" />

  const current  = entries[entries.length - 1].value
  const filtered = filterByRange(entries, range)
  const chartData = filtered.map((e) => ({
    label: formatDate(e.date),
    value: e.value,
  }))

  const values = filtered.map((e) => e.value)
  const minV   = values.length ? Math.min(...values, ...(goal !== undefined ? [goal] : [])) : 0
  const maxV   = values.length ? Math.max(...values, ...(goal !== undefined ? [goal] : [])) : 0
  const pad    = Math.max((maxV - minV) * 0.2, 3)

  const tooltipStyle = {
    background:   'var(--wt-settings-bg)',
    border:       '1px solid var(--wt-border)',
    borderRadius: '8px',
    fontSize:     '11px',
    color:        'var(--wt-text)',
  }

  return (
    <FlexCol fullHeight fullWidth noSelect>
      {/* Header */}
      <FlexRow fullWidth align="center" justify="between" className="px-4 pt-3 pb-1 flex-shrink-0">
        <FlexRow align="baseline" className="gap-1">
          <Text variant="display" size="large" style={{ fontWeight: 700, lineHeight: 1 }}>{current}</Text>
          {unit && <Text variant="caption" color="muted" style={{ opacity: 0.5 }}>{unit}</Text>}
        </FlexRow>
        <FlexRow align="center" className="gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setRange(r.value)}
              style={{
                fontSize:   10,
                fontWeight: range === r.value ? 600 : 400,
                padding:    '2px 6px',
                borderRadius: 6,
                background: range === r.value ? 'var(--wt-accent)' : 'transparent',
                color:      range === r.value ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
                opacity:    range === r.value ? 1 : 0.5,
              }}
            >
              {r.label}
            </button>
          ))}
        </FlexRow>
      </FlexRow>

      {/* Chart */}
      <Box flex1 className="min-h-0 w-full px-2 pb-2">
        {filtered.length < 2
          ? <EmptyState label="Not enough data for this range" />
          : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar'
                ? (
                  <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="var(--wt-border)" strokeOpacity={0.4} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--wt-text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[minV - pad, maxV + pad]} tick={{ fontSize: 9, fill: 'var(--wt-text-muted)' }} tickLine={false} axisLine={false} tickCount={4} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}${unit ? ' ' + unit : ''}`, options.label ?? valueField]} />
                    {goal !== undefined && <ReferenceLine y={goal} stroke="var(--wt-accent)" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    <Bar dataKey="value" fill="var(--wt-accent)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="var(--wt-border)" strokeOpacity={0.4} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--wt-text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[minV - pad, maxV + pad]} tick={{ fontSize: 9, fill: 'var(--wt-text-muted)' }} tickLine={false} axisLine={false} tickCount={4} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}${unit ? ' ' + unit : ''}`, options.label ?? valueField]} />
                    {goal !== undefined && <ReferenceLine y={goal} stroke="var(--wt-accent)" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    <Line type="monotone" dataKey="value" stroke="var(--wt-accent)" strokeWidth={2}
                      dot={filtered.length <= 20 ? { r: 3, fill: 'var(--wt-accent)', strokeWidth: 0 } : false}
                      activeDot={{ r: 5, fill: 'var(--wt-accent)', strokeWidth: 0 }} />
                  </LineChart>
                )
              }
            </ResponsiveContainer>
          )
        }
      </Box>
    </FlexCol>
  )
}

// ── Template: data-table ──────────────────────────────────────────────────────
// fieldMap: { columns: ["Prop1", "Prop2", ...] }
// options:  { sortBy?, sortDir?: "asc"|"desc", limit? }

function DataTableTemplate({ pages, fieldMap, options }: TemplateProps) {
  const columns: string[] = Array.isArray(fieldMap.columns) ? fieldMap.columns : []
  if (!columns.length) return <EmptyState label="No columns configured" />

  const limit   = (options.limit as number) ?? 200
  const sortBy  = options.sortBy  as string | undefined
  const sortDir = (options.sortDir as string) ?? 'desc'

  let rows = [...pages]
  if (sortBy) {
    rows.sort((a, b) => {
      const av = getProp(a, sortBy)
      const bv = getProp(b, sortBy)
      if (av === null) return 1
      if (bv === null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }
  rows = rows.slice(0, limit)

  if (!rows.length) return <EmptyState label="No entries" />

  return (
    <FlexCol fullHeight fullWidth noSelect style={{ overflow: 'hidden' }}>
      {/* Header */}
      <FlexRow
        fullWidth
        className="flex-shrink-0 px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--wt-border)', background: 'var(--wt-surface)' }}
      >
        {columns.map((col) => (
          <Box key={col} flex1 style={{ minWidth: 0 }}>
            <Text variant="label" size="small" style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {col}
            </Text>
          </Box>
        ))}
      </FlexRow>

      {/* Rows */}
      <Box flex1 style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {rows.map((page, i) => (
          <FlexRow
            key={page.id}
            fullWidth
            className="px-3 py-1.5"
            style={{
              borderBottom: '1px solid var(--wt-border)',
              background: i % 2 === 0 ? 'transparent' : 'var(--wt-surface)',
            }}
          >
            {columns.map((col) => (
              <Box key={col} flex1 style={{ minWidth: 0 }}>
                <Text variant="caption" size="small" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatValue(getProp(page, col))}
                </Text>
              </Box>
            ))}
          </FlexRow>
        ))}
      </Box>
    </FlexCol>
  )
}

// ── Template: stat-cards ──────────────────────────────────────────────────────
// fieldMap: { value: "PropName", title?: "PropName", date?: "PropName" }
// options:  { unit?, stats?: ["count","sum","avg","latest","min","max"] }

function StatCardsTemplate({ pages, fieldMap, options }: TemplateProps) {
  const valueField = fieldMap.value as string
  const unit       = options.unit as string | undefined
  const stats      = (options.stats as string[]) ?? ['count', 'sum', 'avg', 'latest']

  const values = pages
    .map((p) => getProp(p, valueField) as number | null)
    .filter((v): v is number => v !== null)

  const count  = pages.length
  const sum    = values.reduce((a, b) => a + b, 0)
  const avg    = values.length ? sum / values.length : 0
  const latest = values.length ? values[values.length - 1] : null
  const min    = values.length ? Math.min(...values) : null
  const max    = values.length ? Math.max(...values) : null

  const statMap: Record<string, { label: string; value: string }> = {
    count:  { label: 'Count',   value: String(count) },
    sum:    { label: 'Total',   value: `${sum.toFixed(1)}${unit ? ' ' + unit : ''}` },
    avg:    { label: 'Average', value: `${avg.toFixed(1)}${unit ? ' ' + unit : ''}` },
    latest: { label: 'Latest',  value: latest !== null ? `${latest}${unit ? ' ' + unit : ''}` : '—' },
    min:    { label: 'Min',     value: min    !== null ? `${min}${unit ? ' ' + unit : ''}` : '—' },
    max:    { label: 'Max',     value: max    !== null ? `${max}${unit ? ' ' + unit : ''}` : '—' },
  }

  const cards = stats.map((s) => statMap[s]).filter(Boolean)

  return (
    <Box fullWidth fullHeight style={{ padding: '12px', overflow: 'hidden' }}>
      <div style={{
        display:             'grid',
        gridTemplateColumns: `repeat(${Math.min(cards.length, 2)}, 1fr)`,
        gap:                 8,
        height:              '100%',
      }}>
        {cards.map((card) => (
          <Box
            key={card.label}
            style={{
              background:   'var(--wt-surface)',
              border:       '1px solid var(--wt-border)',
              borderRadius: 12,
              padding:      '10px 14px',
              display:      'flex',
              flexDirection:'column',
              justifyContent: 'center',
            }}
          >
            <Text variant="label" size="small" style={{ fontSize: 9, opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {card.label}
            </Text>
            <Text variant="heading" size="small" style={{ marginTop: 2, fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
              {card.value}
            </Text>
          </Box>
        ))}
      </div>
    </Box>
  )
}

// ── Template: habit-grid ──────────────────────────────────────────────────────
// fieldMap: { date: "PropName", done: "PropName", title?: "PropName" }
// options:  { weeks?: number }

function HabitGridTemplate({ pages, fieldMap, options }: TemplateProps) {
  const dateField = fieldMap.date as string
  const doneField = fieldMap.done as string
  const weeks     = (options.weeks as number) ?? 8

  // Build a map of date → done
  const doneByDate: Record<string, boolean> = {}
  for (const page of pages) {
    const date = getProp(page, dateField) as string | null
    const done = getProp(page, doneField)
    if (date) doneByDate[date] = !!done
  }

  // Generate grid: last `weeks` weeks, Mon–Sun
  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = (today.getDay() + 6) % 7  // Mon=0 … Sun=6
  const gridStart = new Date(today)
  gridStart.setDate(gridStart.getDate() - dayOfWeek - (weeks - 1) * 7)

  const days: { date: string; done: boolean; isToday: boolean; isFuture: boolean }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d       = new Date(gridStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const isFuture = d > today
    days.push({ date: dateStr, done: doneByDate[dateStr] ?? false, isToday: dateStr === today.toISOString().slice(0, 10), isFuture })
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <FlexCol fullHeight fullWidth noSelect style={{ padding: '10px 12px', overflow: 'hidden' }}>
      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {dayLabels.map((l, i) => (
          <Center key={i}>
            <Text style={{ fontSize: 8, opacity: 0.4, color: 'var(--wt-text-muted)' }}>{l}</Text>
          </Center>
        ))}
      </div>

      {/* Grid */}
      <Box flex1 style={{ minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${weeks}, 1fr)`, gap: 3, height: '100%' }}>
          {days.map(({ date, done, isToday, isFuture }) => (
            <Box
              key={date}
              style={{
                borderRadius: 4,
                background: isFuture
                  ? 'transparent'
                  : done
                    ? 'var(--wt-accent)'
                    : 'var(--wt-surface)',
                border: isToday
                  ? '1.5px solid var(--wt-accent)'
                  : '1px solid var(--wt-border)',
                opacity: isFuture ? 0.2 : 1,
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </Box>

      {/* Legend */}
      <FlexRow align="center" className="gap-2 mt-2 flex-shrink-0">
        <FlexRow align="center" className="gap-1">
          <Box style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }} />
          <Text style={{ fontSize: 9, opacity: 0.4 }}>No</Text>
        </FlexRow>
        <FlexRow align="center" className="gap-1">
          <Box style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--wt-accent)' }} />
          <Text style={{ fontSize: 9, opacity: 0.4 }}>Done</Text>
        </FlexRow>
      </FlexRow>
    </FlexCol>
  )
}

// ── Template: kanban ──────────────────────────────────────────────────────────
// fieldMap: { title: "PropName", group: "PropName", subtitle?: "PropName" }
// options:  { columns?: string[] }

function KanbanTemplate({ pages, fieldMap, options }: TemplateProps) {
  const titleField    = fieldMap.title    as string
  const groupField    = fieldMap.group    as string
  const subtitleField = fieldMap.subtitle as string | undefined

  // Build groups
  const groups: Record<string, NotionPage[]> = {}
  for (const page of pages) {
    const group = (getProp(page, groupField) as string | null) ?? 'None'
    if (!groups[group]) groups[group] = []
    groups[group].push(page)
  }

  const colOrder: string[] = options.columns
    ? (options.columns as string[])
    : Object.keys(groups).sort()

  // Ensure all found groups appear even if not in colOrder
  for (const g of Object.keys(groups)) {
    if (!colOrder.includes(g)) colOrder.push(g)
  }

  return (
    <FlexRow fullHeight fullWidth noSelect style={{ gap: 8, padding: '10px', overflowX: 'auto', overflowY: 'hidden' }}>
      {colOrder.map((col) => {
        const cards = groups[col] ?? []
        return (
          <FlexCol key={col} style={{ minWidth: 140, flex: '0 0 auto', height: '100%' }}>
            {/* Column header */}
            <FlexRow align="center" className="gap-1.5 mb-2 flex-shrink-0">
              <Box style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--wt-accent)', opacity: 0.7 }} />
              <Text variant="label" style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</Text>
              <Text variant="caption" style={{ fontSize: 9, opacity: 0.35 }}>({cards.length})</Text>
            </FlexRow>

            {/* Cards */}
            <FlexCol style={{ gap: 5, overflowY: 'auto', flex: 1 }}>
              {cards.map((page) => (
                <Box
                  key={page.id}
                  style={{
                    background:   'var(--wt-surface)',
                    border:       '1px solid var(--wt-border)',
                    borderRadius: 8,
                    padding:      '7px 10px',
                    flexShrink:   0,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>
                    {formatValue(getProp(page, titleField))}
                  </Text>
                  {subtitleField && (
                    <Text style={{ fontSize: 10, opacity: 0.5, marginTop: 2, lineHeight: 1.2 }}>
                      {formatValue(getProp(page, subtitleField))}
                    </Text>
                  )}
                </Box>
              ))}
              {cards.length === 0 && (
                <Text style={{ fontSize: 10, opacity: 0.3, padding: '4px 0' }}>Empty</Text>
              )}
            </FlexCol>
          </FlexCol>
        )
      })}
    </FlexRow>
  )
}

// ── Template: timeline ────────────────────────────────────────────────────────
// fieldMap: { title: "PropName", date: "PropName", subtitle?: "PropName", status?: "PropName" }
// options:  { limit?, sort?: "asc"|"desc" }

function TimelineTemplate({ pages, fieldMap, options }: TemplateProps) {
  const titleField    = fieldMap.title    as string
  const dateField     = fieldMap.date     as string
  const subtitleField = fieldMap.subtitle as string | undefined
  const statusField   = fieldMap.status   as string | undefined
  const limit         = (options.limit as number) ?? 50
  const sort          = (options.sort  as string) ?? 'desc'

  const items = pages
    .map((p) => ({
      id:       p.id,
      title:    formatValue(getProp(p, titleField)),
      date:     getProp(p, dateField) as string | null,
      subtitle: subtitleField ? formatValue(getProp(p, subtitleField)) : undefined,
      status:   statusField   ? getProp(p, statusField) as string | null : undefined,
    }))
    .filter((i) => i.date)
    .sort((a, b) => {
      const cmp = a.date!.localeCompare(b.date!)
      return sort === 'asc' ? cmp : -cmp
    })
    .slice(0, limit)

  if (!items.length) return <EmptyState label="No entries" />

  return (
    <FlexCol fullHeight fullWidth noSelect style={{ overflowY: 'auto', padding: '10px 14px', gap: 0 }}>
      {items.map((item, i) => (
        <FlexRow key={item.id} align="stretch" style={{ gap: 10, paddingBottom: 10 }}>
          {/* Timeline line + dot */}
          <FlexCol align="center" style={{ width: 16, flexShrink: 0 }}>
            <Box style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background:  item.status ? 'var(--wt-accent)' : 'var(--wt-border)',
              border:      '1.5px solid var(--wt-border)',
              marginTop:   3,
            }} />
            {i < items.length - 1 && (
              <Box style={{ flex: 1, width: 1, background: 'var(--wt-border)', opacity: 0.4, marginTop: 3 }} />
            )}
          </FlexCol>

          {/* Content */}
          <FlexCol style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>{item.title}</Text>
            <FlexRow align="center" className="gap-2" style={{ marginTop: 2 }}>
              <Text style={{ fontSize: 9, opacity: 0.45, color: 'var(--wt-text-muted)' }}>
                {formatDate(item.date!)}
              </Text>
              {item.status && (
                <Text style={{ fontSize: 9, opacity: 0.6, color: 'var(--wt-accent)' }}>{item.status}</Text>
              )}
            </FlexRow>
            {item.subtitle && item.subtitle !== '—' && (
              <Text style={{ fontSize: 10, opacity: 0.5, marginTop: 1, lineHeight: 1.3 }}>{item.subtitle}</Text>
            )}
          </FlexCol>
        </FlexRow>
      ))}
    </FlexCol>
  )
}

// ── Template: todo-list ───────────────────────────────────────────────────────
// fieldMap: { title: "Name", status: "Status", priority?: "Priority", due?: "Due" }
// options:  { statusDone?: "Done", hideCompleted?: true, groupByPriority?: false }

const PRIORITY_COLOR: Record<string, string> = {
  High:   '#ef4444',
  Medium: '#f59e0b',
  Low:    '#6b7280',
}

const STATUS_COLOR: Record<string, string> = {
  'Not started': '#6b7280',
  'In progress': '#3b82f6',
  'Done':        '#22c55e',
}

function TodoListTemplate({ pages, fieldMap, options }: TemplateProps) {
  const [filter,    setFilter]   = useState<'all' | 'active' | 'done'>('active')
  const [toggling,  setToggling] = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const titleField    = fieldMap.title    as string
  const statusField   = fieldMap.status   as string | undefined
  const priorityField = fieldMap.priority as string | undefined
  const dueField      = fieldMap.due      as string | undefined
  const statusDone    = (options.statusDone   as string) ?? 'Done'
  const statusActive  = (options.statusActive as string) ?? 'Not started'

  const today = new Date().toISOString().slice(0, 10)

  const items = pages.map((p) => {
    const rawDone = statusField ? getProp(p, statusField) === statusDone : false
    const done    = p.id in overrides ? overrides[p.id] : rawDone
    return {
      id:       p.id,
      title:    formatValue(getProp(p, titleField)),
      status:   statusField   ? (getProp(p, statusField) as string | null) : null,
      priority: priorityField ? (getProp(p, priorityField) as string | null) : null,
      due:      dueField      ? (getProp(p, dueField) as string | null) : null,
      done,
    }
  })

  async function toggle(id: string, currentDone: boolean) {
    if (toggling.has(id) || !statusField) return
    setToggling((s) => new Set([...s, id]))
    setOverrides((o) => ({ ...o, [id]: !currentDone }))
    try {
      const newStatus = currentDone ? statusActive : statusDone
      const prop = pages.find((p) => p.id === id)?.properties[statusField]
      const isCheckbox = prop?.type === 'checkbox'
      await fetch(`/api/pages/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: isCheckbox
            ? { [statusField]: { checkbox: !currentDone } }
            : { [statusField]: { status: { name: newStatus } } },
        }),
      })
    } catch {
      setOverrides((o) => ({ ...o, [id]: currentDone }))
    } finally {
      setToggling((s) => { const n = new Set(s); n.delete(id); return n })
    }
  }

  const filtered = items.filter((i) => {
    if (filter === 'active') return !i.done
    if (filter === 'done')   return i.done
    return true
  })

  // Sort: overdue first, then by priority, then by due date
  const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
  filtered.sort((a, b) => {
    const aOverdue = a.due && a.due < today && !a.done
    const bOverdue = b.due && b.due < today && !b.done
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    const ap = priorityOrder[a.priority ?? ''] ?? 3
    const bp = priorityOrder[b.priority ?? ''] ?? 3
    if (ap !== bp) return ap - bp
    if (a.due && b.due) return a.due.localeCompare(b.due)
    if (a.due) return -1
    if (b.due) return 1
    return 0
  })

  const activeCount = items.filter((i) => !i.done).length
  const doneCount   = items.filter((i) =>  i.done).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 14px 8px', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['active', 'all', 'done'] as const).map((f) => (
            <button
              key={f}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 10, fontWeight: 500, padding: '3px 10px',
                borderRadius: 20, border: 'none', cursor: 'pointer',
                background: filter === f ? 'var(--wt-accent)' : 'var(--wt-surface)',
                color:      filter === f ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
              }}
            >
              {f === 'active' ? `Active (${activeCount})` : f === 'done' ? `Done (${doneCount})` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 24, color: 'var(--wt-text-muted)', fontSize: 12 }}>
            {filter === 'active' ? 'All caught up!' : 'Nothing here'}
          </div>
        )}
        {filtered.map((item) => {
          const isOverdue = item.due && item.due < today && !item.done
          return (
            <button
              key={item.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => toggle(item.id, item.done)}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '8px 10px', marginBottom: 4,
                borderRadius: 10, textAlign: 'left',
                border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--wt-border)'}`,
                background: item.done
                  ? 'transparent'
                  : isOverdue
                    ? 'rgba(239,68,68,0.04)'
                    : 'var(--wt-surface)',
                cursor: 'pointer',
                opacity: toggling.has(item.id) ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {/* Status dot */}
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                border: item.done ? 'none' : '1.5px solid var(--wt-border)',
                background: item.done
                  ? '#22c55e'
                  : item.status
                    ? (STATUS_COLOR[item.status] ?? 'transparent')
                    : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.done && (
                  <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500, lineHeight: 1.35,
                  color: 'var(--wt-text)',
                  textDecoration: item.done ? 'line-through' : 'none',
                  opacity: item.done ? 0.4 : 1,
                }}>
                  {item.title}
                </div>
                {/* Meta row */}
                {(item.priority || item.due || item.status) && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {item.priority && (
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                        background: `${PRIORITY_COLOR[item.priority] ?? '#6b7280'}20`,
                        color: PRIORITY_COLOR[item.priority] ?? '#6b7280',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {item.priority}
                      </span>
                    )}
                    {item.status && !item.done && (
                      <span style={{
                        fontSize: 9, fontWeight: 500, padding: '1px 6px', borderRadius: 4,
                        background: 'var(--wt-border)',
                        color: STATUS_COLOR[item.status] ?? 'var(--wt-text-muted)',
                      }}>
                        {item.status}
                      </span>
                    )}
                    {item.due && (
                      <span style={{
                        fontSize: 9, color: isOverdue ? '#ef4444' : 'var(--wt-text-muted)',
                        fontWeight: isOverdue ? 600 : 400,
                      }}>
                        {isOverdue ? '⚠ ' : ''}{formatDate(item.due)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

const TEMPLATE_MAP = {
  'metric-chart': MetricChartTemplate,
  'data-table':   DataTableTemplate,
  'stat-cards':   StatCardsTemplate,
  'habit-grid':   HabitGridTemplate,
  'kanban':       KanbanTemplate,
  'timeline':     TimelineTemplate,
  'todo-list':    TodoListTemplate,
}

export function NotionViewWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<NotionViewSettings>(widgetId, DEFAULTS)

  const sortBy  = settings.options?.sortBy  as string | undefined
  const sortDir = settings.options?.sortDir as 'ascending' | 'descending' | undefined
  const limit   = settings.options?.limit   as number | undefined

  const { data, isLoading, error } = useNotionView(settings.databaseId, { sortBy, sortDir, limit })

  if (!settings.databaseId) {
    return <EmptyState label="No database — ask the AI to set one up" />
  }
  if (isLoading) {
    return <EmptyState label="Loading…" />
  }
  if (error) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="danger">{(error as Error).message}</Text>
      </Center>
    )
  }

  const pages   = data?.results ?? []
  const Template = TEMPLATE_MAP[settings.template] ?? DataTableTemplate

  return (
    <Box fullWidth fullHeight style={{ overflow: 'hidden' }}>
      <WidgetHeader title={settings.title} />
      <Box style={{ height: settings.title ? 'calc(100% - 28px)' : '100%' }}>
        <Template pages={pages} fieldMap={settings.fieldMap ?? {}} options={settings.options ?? {}} />
      </Box>
    </Box>
  )
}

export { NotionViewSettingsPanel } from './NotionViewSettings'
