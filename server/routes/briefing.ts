import { Router } from 'express'
import { Client } from '@notionhq/client'
import { compileBriefing } from '../services/briefing.js'
import { loadTokens, saveTokens } from '../services/tokens.js'
import { asyncRoute } from '../middleware/error.js'
import { getNotionClient } from './notion.js'

export function briefingRouter(): Router {
  const router = Router()

  router.get('/briefing', asyncRoute(async (req, res) => {
    const notion = await getNotionClient(req.userId!) ?? new Client({ auth: 'noop' })
    const text = await compileBriefing(notion)
    res.json({ text })
  }))

  router.post('/briefing/settings', (req, res) => {
    const { time } = req.body as { time?: string }
    saveTokens({ briefing_time: time ?? '' })
    res.json({ ok: true })
  })

  router.get('/briefing/settings', (_req, res) => {
    const tokens = loadTokens()
    res.json({ time: tokens?.briefing_time ?? '' })
  })

  return router
}
