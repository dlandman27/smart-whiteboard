import { canvas } from '../board-utils.js'
import { getSpotifyAccessToken } from '../spotify.js'
import type { VoiceTool } from './_types.js'

export const mediaTools: VoiceTool[] = [
  {
    definition: {
      name:        'spotify_control',
      description: "Control Spotify playback. Use this when the user says play, pause, skip, next, previous, or asks what's playing.",
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['play', 'pause', 'next', 'previous', 'now_playing'],
            description: "play=resume, pause=pause, next=skip, previous=go back, now_playing=read what's currently on",
          },
        },
        required: ['action'],
      },
    },
    execute: async (input) => {
      const { action } = input as { action: string }
      const port = Number(process.env.PORT) || 3001

      if (action === 'now_playing') {
        const token = await getSpotifyAccessToken()
        if (!token) return 'Spotify is not connected.'
        const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (r.status === 204) return 'Nothing is currently playing on Spotify.'
        const data = await r.json() as any
        if (!data?.item) return 'Nothing is currently playing.'
        return `${data.item.name} by ${data.item.artists?.map((a: any) => a.name).join(', ')}, ${data.is_playing ? 'playing' : 'paused'}.`
      }

      const r = await fetch(`http://localhost:${port}/api/spotify/${action}`, { method: 'POST' })
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as any
        if (r.status === 401) return 'Spotify is not connected. Open the Spotify widget settings to connect.'
        return `Spotify error: ${err.error ?? r.status}`
      }
      const labels: Record<string, string> = { play: 'Resuming.', pause: 'Paused.', next: 'Skipped.', previous: 'Going back.' }
      return labels[action] ?? 'Done.'
    },
  },

  {
    definition: {
      name:        'search_youtube',
      description: 'Search YouTube for a video and display it in a YouTube widget. Use get_board_state first to find an existing YouTube widget ID, or create one if none exists.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query:    { type: 'string', description: 'Search query, e.g. "lofi hip hop" or "how to make pasta"' },
          widgetId: { type: 'string', description: 'YouTube widget ID to update. If omitted, a new widget is created.' },
        },
        required: ['query'],
      },
    },
    execute: async (input) => {
      const port   = Number(process.env.PORT) || 3001
      const result = await fetch(`http://localhost:${port}/api/youtube/search?q=${encodeURIComponent(input.query)}`)
        .then((r) => r.json()) as { videoId?: string; title?: string; error?: string }
      if (result.error) return `YouTube search failed: ${result.error}`
      if (!result.videoId) return `No video found for "${input.query}"`

      const settings = { videoId: result.videoId, title: result.title ?? '' }
      if (input.widgetId) {
        canvas.updateWidget(input.widgetId, { settings })
        return `Now playing: ${result.title}`
      }
      const { id } = canvas.createWidget({
        widgetType: '@whiteboard/youtube',
        width: 560, height: 360,
        label: 'YouTube',
        settings,
      })
      return `Created YouTube widget playing: ${result.title} (id: ${id})`
    },
  },
]
