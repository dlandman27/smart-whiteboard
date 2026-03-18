import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { RefreshCw } from 'lucide-react'

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

// ── Font maps ──────────────────────────────────────────────────────────────────

const FONT_SIZE: Record<QuoteSettings['fontSize'], string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

// ── Widget ─────────────────────────────────────────────────────────────────────

export function QuoteWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<QuoteSettings>(widgetId, DEFAULT_QUOTE_SETTINGS)
  const [quote, setQuote]       = useState<{ text: string; author: string } | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

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
    } catch (e) {
      setError('Could not load quote')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const alignClass = settings.align === 'center' ? 'text-center items-center' : 'text-left items-start'

  return (
    <div
      className={`flex flex-col justify-center h-full px-6 py-5 gap-4 select-none ${alignClass}`}
      style={{ color: 'var(--wt-text)' }}
    >
      {loading && (
        <p className="text-sm animate-pulse" style={{ color: 'var(--wt-text-muted)' }}>Loading…</p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>{error}</p>
      )}

      {quote && !loading && (
        <>
          {/* Opening mark */}
          <span className="text-4xl font-serif leading-none -mb-2" style={{ color: 'var(--wt-accent)', opacity: 0.5 }}>"</span>

          {/* Quote text */}
          <p className={`font-light leading-relaxed ${FONT_SIZE[settings.fontSize]}`} style={{ color: 'var(--wt-text)' }}>
            {quote.text}
          </p>

          {/* Author */}
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--wt-text-muted)', opacity: 0.6 }}>
            — {quote.author}
          </p>
        </>
      )}

      {/* Refresh button */}
      {settings.showRefresh && !loading && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => load(true)}
          className="mt-1 flex items-center gap-1.5 text-xs opacity-30 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--wt-text-muted)' }}
          title="Get a new quote"
        >
          <RefreshCw size={11} />
          new quote
        </button>
      )}
    </div>
  )
}
