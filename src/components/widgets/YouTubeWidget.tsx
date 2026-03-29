import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'

export interface YouTubeWidgetSettings {
  videoId:  string
  autoplay: boolean
  mute:     boolean
  title:    string
}

export const DEFAULT_YOUTUBE_SETTINGS: YouTubeWidgetSettings = {
  videoId:  '',
  autoplay: false,
  mute:     true,
  title:    '',
}

export function YouTubeWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<YouTubeWidgetSettings>(widgetId, DEFAULT_YOUTUBE_SETTINGS)
  const { videoId, autoplay, mute, title } = settings

  if (!videoId) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, color: 'var(--wt-text-muted)',
        background: 'var(--wt-bg)',
      }}>
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
          <rect x={2} y={4} width={20} height={16} rx={3} fill="#ff0000" opacity={0.15} stroke="#ff0000" strokeWidth={1.5} />
          <polygon points="10,8 16,12 10,16" fill="#ff0000" />
        </svg>
        <span style={{ fontSize: 13 }}>No video set</span>
        <span style={{ fontSize: 11, opacity: 0.6, textAlign: 'center', maxWidth: 180 }}>
          Say "hey wally, play a video about…" or paste a video ID in settings
        </span>
      </div>
    )
  }

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute:     mute     ? '1' : '0',
    rel:      '0',
    modestbranding: '1',
  })

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', borderRadius: 'inherit', overflow: 'hidden' }}>
      {title && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '6px 10px', fontSize: 12, fontWeight: 500,
          color: '#fff', background: 'linear-gradient(rgba(0,0,0,0.7), transparent)',
          zIndex: 1, pointerEvents: 'none',
        }}>
          {title}
        </div>
      )}
      <iframe
        key={videoId}
        src={`https://www.youtube.com/embed/${videoId}?${params}`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function YouTubeSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<YouTubeWidgetSettings>(widgetId, DEFAULT_YOUTUBE_SETTINGS)
  const [input, setInput] = useState(settings.videoId ?? '')

  function parseVideoId(val: string): string {
    try {
      const url = new URL(val)
      if (url.hostname.includes('youtube.com')) return url.searchParams.get('v') ?? val
      if (url.hostname === 'youtu.be')           return url.pathname.slice(1)
    } catch { /* not a URL, treat as raw ID */ }
    return val.trim()
  }

  function apply() {
    const id = parseVideoId(input)
    set({ videoId: id })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>Video URL or ID</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            placeholder="youtube.com/watch?v=… or video ID"
            style={{
              flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 8,
              border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
              color: 'var(--wt-text)', outline: 'none',
            }}
          />
          <button
            onClick={apply}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--wt-accent)', color: 'var(--wt-accent-text)', border: 'none', cursor: 'pointer',
            }}
          >
            Set
          </button>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={settings.autoplay}
          onChange={(e) => set({ autoplay: e.target.checked })}
        />
        Autoplay
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={settings.mute}
          onChange={(e) => set({ mute: e.target.checked })}
        />
        Muted
      </label>
    </div>
  )
}
