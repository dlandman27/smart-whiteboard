import { useEffect, useState, useCallback } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, Center, Text, Icon, FlexRow, FlexCol } from '@whiteboard/ui-kit'
import { apiFetch } from '../../lib/apiFetch'

export interface StockTickerSettings {
  symbols:     string[]
  showChange:  boolean
  showPercent: boolean
  compact:     boolean
}

export const DEFAULT_STOCK_SETTINGS: StockTickerSettings = {
  symbols:     ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
  showChange:  true,
  showPercent: true,
  compact:     false,
}

interface StockQuote {
  symbol:        string
  name:          string
  price:         number
  change:        number
  changePercent: number
  marketState:   string
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatChange(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}`
}

function formatPercent(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function marketStateLabel(state: string): { label: string; color: string } {
  switch (state) {
    case 'regular':    return { label: 'Open',       color: 'var(--wt-success)' }
    case 'pre':        return { label: 'Pre-market', color: 'var(--wt-accent)' }
    case 'post':       return { label: 'After-hours', color: 'var(--wt-accent)' }
    case 'prepre':
    case 'postpost':
    case 'closed':
    default:           return { label: 'Closed',     color: 'var(--wt-text-muted)' }
  }
}

// ── Widget ───────────────────────────────────────────────────────────────────

export function StockTickerWidget({ widgetId }: { widgetId: string }) {
  return (
    <Container className="flex flex-col overflow-hidden" style={{ background: 'var(--wt-bg)', borderRadius: 'inherit' }}>
      <StockTickerContent widgetId={widgetId} />
    </Container>
  )
}

function StockTickerContent({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<StockTickerSettings>(widgetId, DEFAULT_STOCK_SETTINGS)
  const [quotes, setQuotes]     = useState<StockQuote[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  const fetchQuotes = useCallback(async () => {
    if (!settings.symbols.length) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ symbols: settings.symbols.join(',') })
      const data = await apiFetch<any>(`/api/stocks/quote?${params}`)
      console.log('[StockTicker] response:', data)
      setQuotes(data.quotes ?? [])
      setFetchedAt(data.fetchedAt ?? null)
    } catch (e: any) {
      console.error('[StockTicker] error:', e)
      setError(e.message || 'Failed to load stocks')
    } finally {
      setLoading(false)
    }
  }, [settings.symbols.join(',')])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!settings.symbols.length) return
    const id = setInterval(fetchQuotes, 2 * 60_000)
    return () => clearInterval(id)
  }, [fetchQuotes, settings.symbols.length])

  // No symbols configured
  if (!settings.symbols.length) {
    return (
      <Center fullHeight className="px-6">
        <div className="text-center">
          <Icon icon="TrendUp" size={28} style={{ marginBottom: 8, color: 'var(--wt-text-muted)' }} />
          <Text variant="body" size="small" color="muted" align="center">
            Add stock symbols in settings
          </Text>
        </div>
      </Center>
    )
  }

  if (loading && !quotes.length) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading stocks…</Text>
      </Center>
    )
  }

  if (error && !quotes.length) {
    return (
      <Center fullHeight className="px-6">
        <Text variant="body" size="small" color="muted" align="center">{error}</Text>
      </Center>
    )
  }

  if (!quotes.length) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted">No data available</Text>
      </Center>
    )
  }

  // Derive market state from first quote
  const marketInfo = marketStateLabel(quotes[0]?.marketState ?? 'closed')

  return (
    <div className="flex flex-col h-full p-3 gap-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-1 flex-shrink-0">
        <FlexRow align="center" className="gap-2">
          <Icon icon="TrendUp" size={14} style={{ color: '#16a34a' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--wt-text)' }}>
            Stocks
          </span>
        </FlexRow>
        <FlexRow align="center" className="gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: marketInfo.color }}
          />
          <span className="text-xs" style={{ color: 'var(--wt-text-muted)', fontSize: 10 }}>
            {marketInfo.label}
          </span>
        </FlexRow>
      </div>

      {/* Quotes list */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin' }}>
        {quotes.map((q) => {
          const isUp = q.change >= 0
          const changeColor = isUp ? 'var(--wt-success)' : 'var(--wt-danger)'

          if (settings.compact) {
            return (
              <div
                key={q.symbol}
                className="flex items-center justify-between px-1 py-1.5"
                style={{ borderBottom: '1px solid var(--wt-border)' }}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--wt-text)' }}>
                  {q.symbol}
                </span>
                <FlexRow align="center" className="gap-2">
                  <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--wt-text)' }}>
                    {formatPrice(q.price)}
                  </span>
                  {settings.showChange && (
                    <span className="text-xs tabular-nums" style={{ color: changeColor, fontSize: 10 }}>
                      {settings.showPercent ? formatPercent(q.changePercent) : formatChange(q.change)}
                    </span>
                  )}
                </FlexRow>
              </div>
            )
          }

          return (
            <div
              key={q.symbol}
              className="flex items-center gap-2.5 px-1 py-2 rounded-lg transition-colors"
              style={{ borderBottom: '1px solid var(--wt-border)' }}
            >
              {/* Change indicator */}
              <div
                className="w-0.5 self-stretch rounded-full flex-shrink-0"
                style={{ background: changeColor, minHeight: 20 }}
              />

              <FlexCol className="flex-1 min-w-0 gap-0">
                <FlexRow justify="between" align="center">
                  <span className="text-xs font-semibold" style={{ color: 'var(--wt-text)' }}>
                    {q.symbol}
                  </span>
                  <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--wt-text)' }}>
                    ${formatPrice(q.price)}
                  </span>
                </FlexRow>

                <FlexRow justify="between" align="center">
                  <span
                    className="text-xs truncate"
                    style={{ color: 'var(--wt-text-muted)', fontSize: 10, maxWidth: '60%' }}
                  >
                    {q.name}
                  </span>
                  <FlexRow align="center" className="gap-1.5 flex-shrink-0">
                    {settings.showChange && (
                      <span className="text-xs tabular-nums" style={{ color: changeColor, fontSize: 10 }}>
                        {formatChange(q.change)}
                      </span>
                    )}
                    {settings.showPercent && (
                      <span
                        className="text-xs tabular-nums px-1 py-0.5 rounded"
                        style={{
                          color: changeColor,
                          fontSize: 10,
                          background: isUp ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                        }}
                      >
                        {isUp ? '\u25B2' : '\u25BC'} {formatPercent(q.changePercent)}
                      </span>
                    )}
                  </FlexRow>
                </FlexRow>
              </FlexCol>
            </div>
          )
        })}
      </div>

      {/* Last updated */}
      {fetchedAt && (
        <div className="flex-shrink-0 px-1 pt-1">
          <span className="text-xs" style={{ color: 'var(--wt-text-muted)', opacity: 0.4, fontSize: 9 }}>
            Updated {new Date(fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  )
}
