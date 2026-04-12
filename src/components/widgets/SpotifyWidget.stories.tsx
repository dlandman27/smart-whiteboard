import type { Meta, StoryObj } from '@storybook/react'
import { SpotifyWidget } from './SpotifyWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

function mockSpotifyFetch(opts: { connected: boolean; track: Record<string, unknown> | null }) {
  const origFetch = window.fetch
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (url.includes('/api/spotify/status')) {
      return new Response(JSON.stringify({ connected: opts.connected }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/api/spotify/now-playing')) {
      if (!opts.track) return new Response(null, { status: 204 })
      return new Response(JSON.stringify(opts.track), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/api/spotify')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return origFetch(input, init)
  }
}

const MOCK_TRACK = {
  isPlaying: true,
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  album: 'After Hours',
  albumArt: 'https://picsum.photos/300/300?random=1',
  progressMs: 87000,
  durationMs: 200000,
  externalUrl: 'https://open.spotify.com/track/example',
}

const meta: Meta<typeof SpotifyWidget> = {
  title: 'Widgets/Spotify',
  component: SpotifyWidget,
  tags: ['autodocs'],
  decorators: [widgetDecorator],
  parameters: {
    widgetSize: { width: 320, height: 420 },
    widgetSettings: {
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      redirectUri: 'http://localhost:3001/api/spotify/callback',
    },
  },
}
export default meta

type Story = StoryObj<typeof SpotifyWidget>

export const NowPlaying: Story = {
  render: () => <SpotifyWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockSpotifyFetch({ connected: true, track: MOCK_TRACK })
      return <Story />
    },
  ],
}

export const Paused: Story = {
  render: () => <SpotifyWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockSpotifyFetch({ connected: true, track: { ...MOCK_TRACK, isPlaying: false, progressMs: 45000 } })
      return <Story />
    },
  ],
}

export const NothingPlaying: Story = {
  name: 'Nothing Playing',
  render: () => <SpotifyWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockSpotifyFetch({ connected: true, track: null })
      return <Story />
    },
  ],
}

export const Disconnected: Story = {
  render: () => <SpotifyWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockSpotifyFetch({ connected: false, track: null })
      return <Story />
    },
  ],
}

export const NotConfigured: Story = {
  name: 'Not Configured',
  render: () => <SpotifyWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      clientId: '',
      clientSecret: '',
      redirectUri: '',
    },
  },
  decorators: [
    (Story) => {
      mockSpotifyFetch({ connected: false, track: null })
      return <Story />
    },
  ],
}
