import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, IconButton, Text, FlexCol } from '@whiteboard/ui-kit'

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
  const [visible, setVisible] = useState(true)

  async function load(force = false) {
    if (!force) {
      const cached = loadCache(widgetId)
      if (cached) { setQuote(cached); return }
    }
    // Fade out existing quote before fetching
    if (force && quote) {
      setVisible(false)
      await new Promise((r) => setTimeout(r, 220))
    }
    setLoading(true)
    setError(null)
    try {
      const q = await fetchQuote()
      saveCache(widgetId, { ...q, date: today() })
      setQuote(q)
      setVisible(true)
    } catch {
      setError('Could not load quote')
      setVisible(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const align     = settings.align
  const flexAlign = align === 'center' ? 'center' : 'start'

  return (
    <Container className="relative">
      <FlexCol justify="center" align={flexAlign} fullHeight noSelect gap="sm" className="px-6 py-5"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease' }}
      >
        {error && !loading && (
          <Text variant="body" size="small" color="muted">{error}</Text>
        )}

        {(quote || loading) && (
          <>
            {loading ? (
              <FlexCol style={{ width: '100%', gap: 8 }}>
                {[90, 100, 68].map((w, i) => (
                  <div key={i} className="animate-pulse" style={{
                    height: 15, borderRadius: 6,
                    background: 'var(--wt-surface-hover)',
                    width: `${w}%`,
                    alignSelf: align === 'center' ? 'center' : 'flex-start',
                  }} />
                ))}
              </FlexCol>
            ) : quote && (
              <>
                <Text
                  as="span"
                  color="accent"
                  style={{ fontSize: 48, lineHeight: 0.8, fontFamily: 'Georgia, serif', opacity: 0.6, alignSelf: align === 'center' ? 'center' : 'flex-start' }}
                >
                  "
                </Text>
                <Text variant="body" size={SIZE_MAP[settings.fontSize]} align={align} style={{ fontWeight: '300', lineHeight: 1.6 }}>
                  {quote.text}
                </Text>
                <Text
                  variant="label"
                  size="small"
                  color="muted"
                  align={align}
                  style={{ letterSpacing: '0.06em', marginTop: 4 }}
                >
                  — {quote.author}
                </Text>
              </>
            )}
          </>
        )}
      </FlexCol>

      {/* Refresh button — bottom right, out of the way */}
      {settings.showRefresh && (
        <IconButton
          icon="ArrowsClockwise"
          size="sm"
          variant="ghost"
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-[1] transition-opacity ${loading ? 'animate-spin opacity-60' : 'opacity-50 hover:opacity-90'}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => load(true)}
          title="New quote"
        />
      )}
    </Container>
  )
}
