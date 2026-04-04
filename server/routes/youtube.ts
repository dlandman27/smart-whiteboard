import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

export function youtubeRouter(): Router {
  const router = Router()

  router.get('/youtube/search', asyncRoute(async (req, res) => {
    const query  = req.query.q as string
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!query)  throw new AppError(400, 'Missing q param')
    if (!apiKey) throw new AppError(503, 'YOUTUBE_API_KEY not set', 'MISSING_CONFIG')
    const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`
    const data = await fetch(url).then((r) => r.json()) as any
    const item = data.items?.[0]
    if (!item) return res.json({ videoId: null })
    res.json({ videoId: item.id.videoId, title: item.snippet.title })
  }))

  return router
}
