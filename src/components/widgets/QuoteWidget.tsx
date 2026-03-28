import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Icon, Text } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'

export interface QuoteSettings {
  showRefresh: boolean
  fontSize:    'sm' | 'md' | 'lg'
  align:       'left' | 'center'
}

export const DEFAULT_QUOTE_SETTINGS: QuoteSettings = {
  showRefresh: true,
  fontSize:    'md',
  align:       'center',
}

// ── Cache: one quote per calendar day per widget ───────────────────────────────

interface CachedQuote {
  text:   string
  author: string
  date:   string  // YYYY-MM-DD
}

const CACHE_KEY_PREFIX = 'quote-cache-'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function loadCache(widgetId: string): CachedQuote | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + widgetId)
    if (!raw) return null
    const parsed: CachedQuote = JSON.parse(raw)
    return parsed.date === today() ? parsed : null
  } catch {
    return null
  }
}

function saveCache(widgetId: string, quote: CachedQuote) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + widgetId, JSON.stringify(quote))
  } catch {}
}

async function fetchQuote(): Promise<{ text: string; author: string }> {
  const res  = await fetch('/api/quote')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return { text: data.quote, author: data.author }
}

// ── Size map ───────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<QuoteSettings['fontSize'], 'small' | 'medium' | 'large'> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
}

// ── Widget ─────────────────────────────────────────────────────────────────────

export function QuoteWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<QuoteSettings>(widgetId, DEFAULT_QUOTE_SETTINGS)
  const [quote, setQuote]     = useState<{ text: string; author: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function load(force = false) {
    if (!force) {
      const cached = loadCache(widgetId)
      if (cached) { setQuote(cached); return }
    }
    setLoading(true)
    setError(null)
    try {
      const q = await fetchQuote()
      saveCache(widgetId, { ...q, date: today() })
      setQuote(q)
    } catch {
      setError('Could not load quote')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const align    = settings.align
  const flexAlign = align === 'center' ? 'center' : 'start'

  return (
    <div className="relative w-full h-full">
      {settings.showRefresh && (
        <button
          className="absolute top-3 right-3 opacity-25 hover:opacity-70 transition-opacity"
          style={{ zIndex: 1 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => load(true)}
          title="New quote"
        >
          <Icon icon="ArrowsClockwise" size={13} />
        </button>
      )}

      <FlexCol justify="center" align={flexAlign} fullHeight noSelect gap="md" className="px-6 py-5">
        {loading && (
          <Text variant="body" size="small" color="muted" className="animate-pulse">Loading…</Text>
        )}

        {error && !loading && (
          <Text variant="body" size="small" color="muted">{error}</Text>
        )}

        {quote && !loading && (
          <>
            <Text
              as="span"
              variant="display"
              size="large"
              color="accent"
              style={{ fontSize: '36px', lineHeight: '1', marginBottom: '-0.5rem', opacity: 0.5, fontFamily: 'serif' }}
            >
              "
            </Text>

            <Text variant="body" size={SIZE_MAP[settings.fontSize]} align={align} style={{ fontWeight: '300' }}>
              {quote.text}
            </Text>

            <Text
              variant="label"
              size="small"
              color="muted"
              textTransform="uppercase"
              align={align}
              style={{ opacity: 0.6, letterSpacing: '0.1em' }}
            >
              — {quote.author}
            </Text>
          </>
        )}
      </FlexCol>
    </div>
  )
}
