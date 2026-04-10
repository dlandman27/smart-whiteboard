import { loadOAuthTokens, saveOAuthTokens, loadCredential } from './credentials.js'

export const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state'

// Short-lived pending auth state: state → { userId, clientId, clientSecret, redirectUri }
export const pendingSpotifyAuths = new Map<string, { userId: string; clientId: string; clientSecret: string; redirectUri: string }>()

export async function getSpotifyAccessToken(userId: string): Promise<string | null> {
  const tokens = await loadOAuthTokens(userId, 'spotify')
  const cred   = await loadCredential(userId, 'spotify')

  if (!tokens?.access_token || !tokens?.refresh_token || !cred?.client_id || !cred?.client_secret) return null

  // Check if token is still valid (with 60s buffer)
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0
  if (Date.now() < expiresAt - 60_000) return tokens.access_token

  // Refresh
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${cred.client_id}:${cred.client_secret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
  })
  const data = await resp.json() as any
  if (!data.access_token) return null

  await saveOAuthTokens(userId, 'spotify', {
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? tokens.refresh_token,
    expires_at:    new Date(Date.now() + data.expires_in * 1000).toISOString(),
  })
  return data.access_token
}

export async function spotifyControl(userId: string, method: string, endpoint: string, body?: object): Promise<{ ok: boolean; error?: string }> {
  const accessToken = await getSpotifyAccessToken(userId)
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
