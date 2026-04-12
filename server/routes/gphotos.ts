import { Router } from 'express'
import { getGCalClient } from '../services/gcal.js'
import { AppError, asyncRoute } from '../middleware/error.js'

const PHOTOS_API = 'https://photoslibrary.googleapis.com/v1'

async function getAccessToken(userId: string): Promise<string> {
  const client = await getGCalClient(userId)
  if (!client) throw new AppError(401, 'Google account not connected')
  const { token } = await client.getAccessToken()
  if (!token) throw new AppError(401, 'Unable to get access token')
  return token
}

export function gphotosRouter(): Router {
  const router = Router()

  // ── Status (reuses gcal oauth) ──────────────────────────────────────────────

  router.get('/gphotos/status', asyncRoute(async (req, res) => {
    const client = await getGCalClient(req.userId!)
    res.json({ connected: !!client })
  }))

  // ── Albums ──────────────────────────────────────────────────────────────────

  router.get('/gphotos/albums', asyncRoute(async (req, res) => {
    const token = await getAccessToken(req.userId!)
    const r = await fetch(`${PHOTOS_API}/albums?pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) throw new AppError(r.status, `Google Photos API error: ${r.statusText}`)
    const data = await r.json()
    res.json(data.albums ?? [])
  }))

  // ── Photos ──────────────────────────────────────────────────────────────────

  router.get('/gphotos/photos', asyncRoute(async (req, res) => {
    const token = await getAccessToken(req.userId!)
    const albumId  = req.query.albumId as string | undefined
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 100)
    const pageToken = req.query.pageToken as string | undefined

    let data: any

    if (albumId) {
      // Search within album
      const r = await fetch(`${PHOTOS_API}/mediaItems:search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          albumId,
          pageSize,
          ...(pageToken ? { pageToken } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!r.ok) throw new AppError(r.status, `Google Photos API error: ${r.statusText}`)
      data = await r.json()
    } else {
      // Recent photos
      const params = new URLSearchParams({ pageSize: String(pageSize) })
      if (pageToken) params.set('pageToken', pageToken)
      const r = await fetch(`${PHOTOS_API}/mediaItems?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (!r.ok) throw new AppError(r.status, `Google Photos API error: ${r.statusText}`)
      data = await r.json()
    }

    const items = (data.mediaItems ?? [])
      .filter((item: any) => item.mimeType?.startsWith('image/'))
      .map((item: any) => ({
        id:          item.id,
        baseUrl:     item.baseUrl,
        width:       item.mediaMetadata?.width,
        height:      item.mediaMetadata?.height,
        description: item.description ?? '',
        createdAt:   item.mediaMetadata?.creationTime,
      }))

    res.json({
      items,
      nextPageToken: data.nextPageToken ?? null,
    })
  }))

  return router
}
