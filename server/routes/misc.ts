import { Router } from 'express'
import fs from 'fs'
import path from 'path'

const QUOTES: { quote: string; author: string }[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/components/config/quotes.config.json'), 'utf-8')
)

export function miscRouter(): Router {
  const router = Router()

  router.get('/quote', (_req, res) => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]
    res.json(q)
  })

  return router
}
