import { useEffect, useState, useCallback } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, Center, Text, FlexRow, FlexCol, useWidgetSizeContext } from '@whiteboard/ui-kit'
import { apiFetch } from '../../lib/apiFetch'

export interface StockTickerSettings {
  symbols:  string[]
  compact:  boolean
}

export const DEFAULT_STOCK_SETTINGS: StockTickerSettings = {
  symbols: ['AAPL', 'GOOGL', 'MSFT'],
  compact: false,
}

interface StockQuote {
  symbol:        string
  name:          string
  price:         number
  change:        number
  changePercent: number
  open:          number
  high:          number
  low:           number
  volume:        number
  marketCap:     number | null
  peRatio:       number | null
  marketState:   string
  points:        number[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtChange(n: number) {
  return (n >= 0 ? '+' : '') + fmt(n)
}

function fmtPct(n: number) {
  return (n >= 0 ? '+' : '') + fmt(n) + '%'
}

function fmtCompact(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ points, color, width, height }: { points: number[]; color: string; width: number; height: number }) {
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const xs = points.map((_, i) => (i / (points.length - 1)) * width)
  const ys = points.map((v) => height - ((v - min) / range) * height * 0.85 - height * 0.05)

  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${width},${height} L0,${height} Z`

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Single stock detail card ──────────────────────────────────────────────────

function DetailCard({ q, w, h }: { q: StockQuote; w: number; h: number }) {
  const isUp    = q.change >= 0
  const color   = isUp ? 'var(--wt-success)' : 'var(--wt-danger)'
  const priceFs = Math.max(28, Math.min(Math.round(w * 0.18), 72))
  const labelFs = Math.max(10, Math.round(w * 0.038))
  const nameFs  = Math.max(11, Math.round(w * 0.045))
  const chartH  = Math.round(h * 0.32)

  const stats = [
    { label: 'Open',    value: fmt(q.open) },
    { label: 'High',    value: fmt(q.high) },
    { label: 'Low',     value: fmt(q.low) },
    { label: 'Vol',     value: fmtCompact(q.volume) },
    ...(q.peRatio   != null ? [{ label: 'P/E',     value: fmt(q.peRatio, 1) }] : []),
    ...(q.marketCap != null ? [{ label: 'Mkt Cap', value: fmtCompact(q.marketCap) }] : []),
  ]

  return (
    <FlexCol fullHeight noSelect style={{ padding: '14px 16px 10px' }}>
      {/* Header */}
      <FlexRow justify="between" align="start" style={{ marginBottom: 4 }}>
        <FlexCol gap="none">
          <Text style={{ fontSize: nameFs, fontWeight: 700, lineHeight: 1.2 }}>
            {q.symbol}
          </Text>
          <Text color="muted" style={{ fontSize: labelFs, lineHeight: 1.3, marginTop: 1 }}>
            {q.name}
          </Text>
        </FlexCol>
        <FlexCol align="end" gap="none">
          <Text style={{ fontSize: labelFs + 1, fontWeight: 600, color }}>
            {fmtChange(q.change)}
          </Text>
          <Text style={{ fontSize: labelFs, fontWeight: 600, color }}>
            {fmtPct(q.changePercent)}
          </Text>
        </FlexCol>
      </FlexRow>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '3px 8px', margin: '6px 0',
      }}>
        {stats.map(({ label, value }) => (
          <FlexRow key={label} justify="between" style={{ minWidth: 0 }}>
            <Text color="muted" style={{ fontSize: labelFs - 1 }}>{label}</Text>
            <Text style={{ fontSize: labelFs - 1, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
          </FlexRow>
        ))}
      </div>

      {/* Big price */}
      <Text style={{ fontSize: priceFs, fontWeight: 200, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color, margin: '4px 0' }}>
        {fmt(q.price)}
      </Text>

      {/* Chart */}
      {q.points.length > 1 && (
        <div style={{ flex: 1, minHeight: chartH, marginTop: 4 }}>
          <Sparkline points={q.points} color={color} width={w - 32} height={chartH} />
        </div>
      )}
    </FlexCol>
  )
}

// ── List row (multi-stock) ────────────────────────────────────────────────────

function ListRow({ q, w }: { q: StockQuote; width?: number; w: number }) {
  const isUp    = q.change >= 0
  const color   = isUp ? 'var(--wt-success)' : 'var(--wt-danger)'
  const nameFs  = Math.max(12, Math.round(w * 0.042))
  const labelFs = Math.max(10, Math.round(w * 0.034))
  const priceFs = Math.max(14, Math.round(w * 0.048))
  const sparkW  = Math.round(w * 0.22)

  return (
    <FlexRow
      align="center"
      style={{
        padding: '10px 4px',
        borderBottom: '1px solid var(--wt-border)',
        gap: 8,
      }}
    >
      {/* Left: name */}
      <FlexCol gap="none" style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: nameFs, fontWeight: 700, lineHeight: 1.2 }}>{q.symbol}</Text>
        <Text color="muted" style={{ fontSize: labelFs, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</Text>
      </FlexCol>

      {/* Sparkline */}
      {q.points.length > 1 && (
        <Sparkline points={q.points} color={color} width={sparkW} height={32} />
      )}

      {/* Right: price + change */}
      <FlexCol align="end" gap="none" style={{ flexShrink: 0 }}>
        <Text style={{ fontSize: priceFs, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
          {fmt(q.price)}
        </Text>
        <Text style={{ fontSize: labelFs, fontWeight: 500, color, lineHeight: 1.3 }}>
          {fmtChange(q.change)}
        </Text>
      </FlexCol>
    </FlexRow>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function StockTickerWidget({ widgetId }: { widgetId: string }) {
  return (
    <Container className="overflow-hidden">
      <StockContent widgetId={widgetId} />
    </Container>
  )
}

function StockContent({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<StockTickerSettings>(widgetId, DEFAULT_STOCK_SETTINGS)
  const { containerWidth: w, containerHeight: h } = useWidgetSizeContext()
  const [quotes, setQuotes]   = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!settings.symbols.length) return
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ symbols: settings.symbols.join(',') })
      const data = await apiFetch<any>(`/api/stocks/quote?${params}`)
      setQuotes(data.quotes ?? [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [settings.symbols.join(',')])

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => {
    const id = setInterval(fetch, 2 * 60_000)
    return () => clearInterval(id)
  }, [fetch])

  if (!settings.symbols.length) return (
    <Center fullHeight><Text color="muted" size="small">Add symbols in settings</Text></Center>
  )
  if (loading && !quotes.length) return (
    <Center fullHeight><Text color="muted" size="small" className="animate-pulse">Loading…</Text></Center>
  )
  if (error && !quotes.length) return (
    <Center fullHeight className="px-4"><Text color="muted" size="small" align="center">{error}</Text></Center>
  )
  if (!quotes.length) return (
    <Center fullHeight><Text color="muted" size="small">No data</Text></Center>
  )

  // Single symbol → big detail card
  if (quotes.length === 1) {
    return <DetailCard q={quotes[0]} w={w || 320} h={h || 400} />
  }

  // Multiple → list
  return (
    <div style={{ padding: '8px 12px', height: '100%', overflowY: 'auto' }}>
      {quotes.map((q) => <ListRow key={q.symbol} q={q} w={w || 320} />)}
    </div>
  )
}
