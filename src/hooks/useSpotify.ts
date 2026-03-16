import { useQuery, useQueryClient } from '@tanstack/react-query'

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

export function useInvalidateSpotifyStatus() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['spotify', 'status'] })
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
