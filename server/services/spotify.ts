import { loadTokens, saveTokens } from './tokens.js'

export const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state'

export let pendingSpotifyAuth: { clientId: string; clientSecret: string; redirectUri: string } | null = null

export function setPendingSpotifyAuth(auth: typeof pendingSpotifyAuth) {
  pendingSpotifyAuth = auth
}

export async function getSpotifyAccessToken(): Promise<string | null> {
  const tokens       = loadTokens()
  const accessToken  = tokens?.spotify_access_token
  const refreshToken = tokens?.spotify_refresh_token
  const clientId     = tokens?.spotify_client_id
  const clientSecret = tokens?.spotify_client_secret
  const expiresAt    = Number(tokens?.spotify_expires_at ?? 0)

  if (!accessToken || !refreshToken || !clientId || !clientSecret) return null
  if (Date.now() < expiresAt - 60_000) return accessToken

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  const data = await resp.json() as any
  if (!data.access_token) return null

  saveTokens({
    spotify_access_token: data.access_token,
    spotify_expires_at:   String(Date.now() + data.expires_in * 1000),
    ...(data.refresh_token ? { spotify_refresh_token: data.refresh_token } : {}),
  })
  return data.access_token
}

export async function spotifyControl(method: string, endpoint: string, body?: object): Promise<{ ok: boolean; error?: string }> {
  const accessToken = await getSpotifyAccessToken()
  if (!accessToken) return { ok: false, error: 'Not authenticated' }
  const res = await fetch(`https://api.spotify.com/v1/me/player${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204 || res.status === 200) return { ok: true }
  const text = await res.text().catch(() => '')
  return { ok: false, error: `Spotify ${res.status}: ${text.slice(0, 100)}` }
}
