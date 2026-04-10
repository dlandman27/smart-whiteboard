import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import {
  Container, Center, FlexCol, FlexRow, Text,
  Input, Button, Checkbox, SettingsSection,
} from '@whiteboard/ui-kit'

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
      <Container>
        <Center fullHeight gap="sm">
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <rect x={2} y={4} width={20} height={16} rx={3} fill="var(--wt-danger)" opacity={0.15} stroke="var(--wt-danger)" strokeWidth={1.5} />
            <polygon points="10,8 16,12 10,16" fill="var(--wt-danger)" />
          </svg>
          <Text variant="body" size="small" color="muted">No video set</Text>
          <Text variant="caption" size="small" color="muted" align="center" style={{ maxWidth: 180 }}>
            Say "hey wally, play a video about…" or paste a video ID in settings
          </Text>
        </Center>
      </Container>
    )
  }

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute:     mute     ? '1' : '0',
    rel:      '0',
    modestbranding: '1',
  })

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--wt-surface)', borderRadius: 'inherit', overflow: 'hidden' }}>
      {title && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '6px 10px', fontSize: 12, fontWeight: 500,
          color: 'var(--wt-text)', background: 'linear-gradient(var(--wt-bg), transparent)',
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
    <SettingsSection label="Video">
      <FlexCol gap="sm">
        <FlexRow gap="sm" align="end">
          <Input
            label="Video URL or ID"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            placeholder="youtube.com/watch?v=… or video ID"
            size="sm"
          />
          <Button variant="accent" size="sm" onClick={apply}>Set</Button>
        </FlexRow>
        <Checkbox
          label="Autoplay"
          checked={settings.autoplay}
          onChange={(v) => set({ autoplay: v })}
        />
        <Checkbox
          label="Muted"
          checked={settings.mute}
          onChange={(v) => set({ mute: v })}
        />
      </FlexCol>
    </SettingsSection>
  )
}
