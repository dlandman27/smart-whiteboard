import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

export function gifsRouter() {
  const router = Router()

  router.get('/gifs/search', asyncRoute(async (req, res) => {
    const q     = String(req.query.q ?? '').trim()
    const limit = Math.min(Number(req.query.limit ?? 1), 10)

    if (!q) throw new AppError(400, 'Missing query parameter "q"')

    const key = process.env.TENOR_API_KEY
    if (!key) throw new AppError(503, 'TENOR_API_KEY is not configured')

    const url = new URL('https://tenor.googleapis.com/v2/search')
    url.searchParams.set('q', q)
    url.searchParams.set('key', key)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('media_filter', 'gif,mediumgif')

    const tenor = await fetch(url.toString())
    if (!tenor.ok) throw new AppError(502, `Tenor API error: ${tenor.status}`)

    const data: any = await tenor.json()
    const results: any[] = data.results ?? []

    if (results.length === 0) {
      throw new AppError(404, `No GIFs found for "${q}"`)
    }

    // Prefer mediumgif for smaller file size; fall back to gif
    const pick = (r: any) => {
      const fmt = r.media_formats ?? {}
      return fmt.mediumgif?.url ?? fmt.gif?.url ?? null
    }

    if (limit === 1) {
      const gifUrl = pick(results[0])
      if (!gifUrl) throw new AppError(502, 'Tenor returned a result with no gif URL')
      res.json({ url: gifUrl, title: results[0].title ?? q })
    } else {
      const hits = results
        .map((r: any) => ({ url: pick(r), title: r.title ?? '' }))
        .filter((r: any) => r.url)
      res.json({ results: hits })
    }
  }))

  return router
}
