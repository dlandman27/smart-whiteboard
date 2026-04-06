import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Icon } from '../../ui/web'
import { fontFamily } from '../../ui/theme'
import type { WidgetProps } from './registry'

// ── Settings interface ────────────────────────────────────────────────────────

export interface GiphyWidgetSettings {
  gifUrl:      string   // full URL to the GIF (mp4 preferred, gif fallback)
  gifMp4Url:   string   // mp4 URL for efficient playback (empty = use gifUrl)
  gifTitle:    string   // alt text / title from Giphy
  gifId:       string   // Giphy GIF id
  objectFit:   'cover' | 'contain'
  showTitle:   boolean
}

export const DEFAULT_GIPHY_SETTINGS: GiphyWidgetSettings = {
  gifUrl:    '',
  gifMp4Url: '',
  gifTitle:  '',
  gifId:     '',
  objectFit: 'cover',
  showTitle: false,
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ containerW }: { containerW: number }) {
  const iconSize  = Math.max(28, Math.round(containerW * 0.14))
  const labelSize = Math.max(11, Math.round(containerW * 0.05))
  const hintSize  = Math.max(10, Math.round(containerW * 0.04))

  return (
    <div
      style={{
        width:          '100%',
        height:         '100%',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            8,
        padding:        16,
        boxSizing:      'border-box',
      }}
    >
      <Icon
        icon="GifIcon"
        size={iconSize}
        style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }}
      />
      <span
        style={{
          fontSize:   labelSize,
          fontFamily: fontFamily.base,
          fontWeight: '500',
          color:      'var(--wt-text-muted)',
          lineHeight: 1.3,
        }}
      >
        No GIF selected
      </span>
      <span
        style={{
          fontSize:   hintSize,
          fontFamily: fontFamily.base,
          fontWeight: '400',
          color:      'var(--wt-text-muted)',
          opacity:    0.65,
          textAlign:  'center',
          lineHeight: 1.4,
          maxWidth:   Math.min(containerW - 32, 200),
        }}
      >
        Open settings to search and pick a GIF
      </span>
    </div>
  )
}

// ── GIF renderer ─────────────────────────────────────────────────────────────
// Prefer mp4 (via <video>) for efficiency; fall back to <img> for plain GIF URLs.

function GifRenderer({
  gifUrl,
  gifMp4Url,
  gifTitle,
  objectFit,
}: {
  gifUrl:    string
  gifMp4Url: string
  gifTitle:  string
  objectFit: 'cover' | 'contain'
}) {
  const [imgError, setImgError] = useState(false)

  // Reset error state when URL changes
  useEffect(() => { setImgError(false) }, [gifUrl, gifMp4Url])

  const sharedStyle: React.CSSProperties = {
    width:      '100%',
    height:     '100%',
    objectFit,
    display:    'block',
  }

  // Use <video> for mp4 (autoplay, loop, muted — required for autoplay in browsers)
  if (gifMp4Url && !imgError) {
    return (
      <video
        key={gifMp4Url}
        src={gifMp4Url}
        style={sharedStyle}
        autoPlay
        loop
        muted
        playsInline
        aria-label={gifTitle || 'Animated GIF'}
        onError={() => setImgError(true)}
      />
    )
  }

  // Fall back to <img> for plain GIF URLs
  if (gifUrl && !imgError) {
    return (
      <img
        key={gifUrl}
        src={gifUrl}
        alt={gifTitle || 'Animated GIF'}
        style={sharedStyle}
        onError={() => setImgError(true)}
      />
    )
  }

  // Both failed — show broken state
  return (
    <div
      style={{
        width:          '100%',
        height:         '100%',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            8,
      }}
    >
      <Icon icon="ImageBroken" size={28} style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }} />
      <span
        style={{
          fontSize:   12,
          fontFamily: fontFamily.base,
          color:      'var(--wt-text-muted)',
          opacity:    0.7,
        }}
      >
        GIF failed to load
      </span>
    </div>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function GiphyWidget({ widgetId }: WidgetProps) {
  const [settings] = useWidgetSettings<GiphyWidgetSettings>(widgetId, DEFAULT_GIPHY_SETTINGS)

  // ResizeObserver for responsive sizing (title overlay, empty state)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(320)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hasGif = Boolean(settings.gifUrl || settings.gifMp4Url)

  const titleSize = Math.max(10, Math.round(containerW * 0.042))

  return (
    <div
      ref={containerRef}
      style={{
        width:     '100%',
        height:    '100%',
        boxSizing: 'border-box',
        position:  'relative',
        overflow:  'hidden',
        background: 'var(--wt-surface)',
      }}
    >
      {hasGif ? (
        <>
          <GifRenderer
            gifUrl={settings.gifUrl}
            gifMp4Url={settings.gifMp4Url}
            gifTitle={settings.gifTitle}
            objectFit={settings.objectFit}
          />

          {/* Optional title overlay */}
          {settings.showTitle && settings.gifTitle && (
            <div
              style={{
                position:   'absolute',
                bottom:     0,
                left:       0,
                right:      0,
                padding:    '6px 10px',
                background: 'linear-gradient(transparent, color-mix(in srgb, var(--wt-surface) 80%, transparent))',
                fontSize:   titleSize,
                fontFamily: fontFamily.base,
                fontWeight: '500',
                color:      'var(--wt-text)',
                overflow:   'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                pointerEvents: 'none',
              }}
            >
              {settings.gifTitle}
            </div>
          )}
        </>
      ) : (
        <EmptyState containerW={containerW} />
      )}
    </div>
  )
}
