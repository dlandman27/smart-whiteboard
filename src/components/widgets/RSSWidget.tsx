import { useEffect, useState, useCallback } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, Center, Text, Icon, useWidgetSizeContext } from '@whiteboard/ui-kit'

export interface RSSSettings {
  feedUrl:        string
  feedName?:      string
  limit:          number
  showThumbnails: boolean
  autoScroll:     boolean
}

export const DEFAULT_RSS_SETTINGS: RSSSettings = {
  feedUrl:        '',
  feedName:       '',
  limit:          10,
  showThumbnails: true,
  autoScroll:     false,
}

interface FeedItem {
  title:      string
  link:       string
  pubDate?:   string
  content?:   string
  thumbnail?: string
}

interface FeedData {
  title:       string
  description: string
  items:       FeedItem[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Widget ───────────────────────────────────────────────────────────────────

export function RSSWidget({ widgetId }: { widgetId: string }) {
  return (
    <Container className="flex flex-col overflow-hidden" style={{ background: 'var(--wt-bg)', borderRadius: 'inherit' }}>
      <RSSContent widgetId={widgetId} />
    </Container>
  )
}

function RSSContent({ widgetId }: { widgetId: string }) {
  const { containerHeight } = useWidgetSizeContext()
  const [settings] = useWidgetSettings<RSSSettings>(widgetId, DEFAULT_RSS_SETTINGS)
  const [feed, setFeed]       = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [scrollIndex, setScrollIndex] = useState(0)

  const fetchFeed = useCallback(async () => {
    if (!settings.feedUrl) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ url: settings.feedUrl, limit: String(settings.limit) })
      const res = await fetch(`/api/rss/feed?${params}`)
      if (!res.ok) throw new Error('Failed to fetch feed')
      const data = await res.json()
      setFeed(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [settings.feedUrl, settings.limit])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!settings.feedUrl) return
    const id = setInterval(fetchFeed, 5 * 60_000)
    return () => clearInterval(id)
  }, [fetchFeed, settings.feedUrl])

  // Auto-scroll through items
  useEffect(() => {
    if (!settings.autoScroll || !feed?.items.length) return
    const id = setInterval(() => {
      setScrollIndex((i) => (i + 1) % feed.items.length)
    }, 8000)
    return () => clearInterval(id)
  }, [settings.autoScroll, feed?.items.length])

  // No feed URL configured
  if (!settings.feedUrl) {
    return (
      <Center fullHeight className="px-6">
        <div className="text-center">
          <Icon icon="Newspaper" size={28} style={{ marginBottom: 8, color: 'var(--wt-text-muted)' }} />
          <Text variant="body" size="small" color="muted" align="center">
            Add an RSS feed URL in settings
          </Text>
        </div>
      </Center>
    )
  }

  if (loading && !feed) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading feed…</Text>
      </Center>
    )
  }

  if (error && !feed) {
    return (
      <Center fullHeight className="px-6">
        <Text variant="body" size="small" color="muted" align="center">{error}</Text>
      </Center>
    )
  }

  if (!feed?.items.length) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted">No articles found</Text>
      </Center>
    )
  }

  const displayName = settings.feedName || feed.title
  const isCompact = containerHeight < 300

  return (
    <div className="flex flex-col h-full p-3 gap-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 px-1 flex-shrink-0">
        <Icon icon="Rss" size={14} style={{ color: '#F97316' }} />
        <span
          className="text-xs font-semibold truncate"
          style={{ color: 'var(--wt-text)' }}
        >
          {displayName}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin' }}>
        {feed.items.map((item, i) => (
          <a
            key={`${item.link}-${i}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-2.5 px-1 py-2 rounded-lg transition-colors group"
            style={{
              borderBottom: i < feed.items.length - 1 ? '1px solid var(--wt-border)' : undefined,
              textDecoration: 'none',
            }}
          >
            {settings.showThumbnails && item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                className="rounded flex-shrink-0 object-cover"
                style={{ width: isCompact ? 36 : 48, height: isCompact ? 36 : 48 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-medium leading-snug group-hover:underline"
                style={{
                  color: 'var(--wt-text)',
                  display: '-webkit-box',
                  WebkitLineClamp: isCompact ? 1 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.title}
              </div>
              {!isCompact && item.content && (
                <div
                  className="text-xs mt-0.5 leading-snug"
                  style={{
                    color: 'var(--wt-text-muted)',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    opacity: 0.7,
                  }}
                >
                  {item.content}
                </div>
              )}
              {item.pubDate && (
                <span className="text-xs mt-0.5 block" style={{ color: 'var(--wt-text-muted)', opacity: 0.5, fontSize: 10 }}>
                  {timeAgo(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
