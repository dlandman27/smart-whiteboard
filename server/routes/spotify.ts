import { Router } from 'express'
import { saveOAuthTokens } from '../services/credentials.js'
import { saveCredential } from '../services/credentials.js'
import { SPOTIFY_SCOPES, getSpotifyAccessToken, spotifyControl, pendingSpotifyAuths } from '../services/spotify.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function spotifyRouter(): Router {
  const router = Router()

  router.get('/spotify/status', asyncRoute(async (req, res) => {
    const token = await getSpotifyAccessToken(req.userId!)
    res.json({ connected: !!token })
  }))

  router.post('/spotify/start-auth', asyncRoute(async (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body as Record<string, string>
    if (!clientId || !clientSecret || !redirectUri) {
      throw new AppError(400, 'clientId, clientSecret, and redirectUri are required')
    }

    // Save the client credentials for this user
    await saveCredential(req.userId!, 'spotify', {
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
    })

    const state = crypto.randomUUID()
    pendingSpotifyAuths.set(state, { userId: req.userId!, clientId, clientSecret, redirectUri })
    setTimeout(() => pendingSpotifyAuths.delete(state), 10 * 60_000)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     clientId,
      scope:         SPOTIFY_SCOPES,
      redirect_uri:  redirectUri,
      state,
    })
    res.json({ url: `https://accounts.spotify.com/authorize?${params}` })
  }))

  router.get('/spotify/callback', asyncRoute(async (req, res) => {
    const state = req.query.state as string
    const pending = pendingSpotifyAuths.get(state)
    if (!pending) throw new AppError(400, 'No pending Spotify auth — initiate via the widget')
    pendingSpotifyAuths.delete(state)

    const { userId, clientId, clientSecret, redirectUri } = pending

    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code:         req.query.code as string,
        redirect_uri: redirectUri,
      }),
    })
    const data = await resp.json() as any
    if (!data.access_token) throw new AppError(400, 'Token exchange failed: ' + JSON.stringify(data))

    await saveOAuthTokens(userId, 'spotify', {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })

    res.send(`
      <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;
        height:100vh;margin:0;background:#f0fdf4;color:#166534">
        <div style="text-align:center">
          <div style="font-size:48px">✓</div>
          <h2>Spotify connected!</h2>
          <p style="color:#555">You can close this window.</p>
          <script>setTimeout(() => window.close(), 1500)</script>
        </div>
      </body></html>
    `)
  }))

  router.get('/spotify/now-playing', asyncRoute(async (req, res) => {
    const accessToken = await getSpotifyAccessToken(req.userId!)
    if (!accessToken) throw new AppError(401, 'Not authenticated')

    const resp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    if (resp.status === 204) return res.json(null)
    if (!resp.ok) throw new AppError(resp.status, 'Spotify API error')

    const data = await resp.json() as any
    if (!data?.item) return res.json(null)

    res.json({
      isPlaying:   data.is_playing,
      title:       data.item.name,
      artist:      data.item.artists?.map((a: any) => a.name).join(', ') ?? '',
      album:       data.item.album?.name ?? '',
      albumArt:    data.item.album?.images?.[0]?.url ?? null,
      progressMs:  data.progress_ms ?? 0,
      durationMs:  data.item.duration_ms ?? 0,
      externalUrl: data.item.external_urls?.spotify ?? '',
    })
  }))

  router.post('/spotify/play', asyncRoute(async (req, res) => {
    const r = await spotifyControl(req.userId!, 'PUT', '/play')
    r.ok ? res.json({ ok: true }) : res.status(400).json(r)
  }))

  router.post('/spotify/pause', asyncRoute(async (req, res) => {
    const r = await spotifyControl(req.userId!, 'PUT', '/pause')
    r.ok ? res.json({ ok: true }) : res.status(400).json(r)
  }))

  router.post('/spotify/next', asyncRoute(async (req, res) => {
    const r = await spotifyControl(req.userId!, 'POST', '/next')
    r.ok ? res.json({ ok: true }) : res.status(400).json(r)
  }))

  router.post('/spotify/previous', asyncRoute(async (req, res) => {
    const r = await spotifyControl(req.userId!, 'POST', '/previous')
    r.ok ? res.json({ ok: true }) : res.status(400).json(r)
  }))

  router.post('/spotify/volume', asyncRoute(async (req, res) => {
    const volume = Math.max(0, Math.min(100, Number(req.body.volume ?? 50)))
    const r = await spotifyControl(req.userId!, 'PUT', `/volume?volume_percent=${volume}`)
    r.ok ? res.json({ ok: true }) : res.status(400).json(r)
  }))

  return router
}
