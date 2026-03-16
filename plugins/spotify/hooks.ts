import { useQuery } from '@tanstack/react-query'

export interface NowPlayingTrack {
  isPlaying:   boolean
  title:       string
  artist:      string
  album:       string
  albumArt:    string | null
  progressMs:  number
  durationMs:  number
  externalUrl: string
}

export function useSpotifyStatus() {
  return useQuery<{ connected: boolean }>({
    queryKey:  ['spotify', 'status'],
    queryFn:   async () => {
      const res = await fetch('/api/spotify/status')
      if (!res.ok) throw new Error('Failed to fetch Spotify status')
      return res.json()
    },
    staleTime: 10_000,
  })
}

export function useSpotifyNowPlaying(enabled = true) {
  return useQuery<NowPlayingTrack | null>({
    queryKey:        ['spotify', 'now-playing'],
    queryFn:         async () => {
      const res = await fetch('/api/spotify/now-playing')
      if (!res.ok) throw new Error('Failed to fetch now playing')
      return res.json()
    },
    refetchInterval: 5_000,
    enabled,
  })
}

export async function startSpotifyAuth(clientId: string, clientSecret: string, redirectUri: string): Promise<string> {
  const res = await fetch('/api/spotify/start-auth', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId, clientSecret, redirectUri }),
  })
  if (!res.ok) throw new Error('Failed to start auth')
  const { url } = await res.json()
  return url
}
