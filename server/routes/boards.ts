import { Router } from 'express'
import { broadcast, getBoards, getActiveBoardId } from '../ws.js'

export function boardsRouter(): Router {
  const router = Router()

  router.get('/canvas/boards', (_req, res) => {
    res.json({ boards: getBoards(), activeBoardId: getActiveBoardId() })
  })

  router.post('/canvas/board', (req, res) => {
    const id = crypto.randomUUID()
    broadcast({ type: 'create_board', id, name: req.body.name ?? 'New Board' })
    res.json({ id })
  })

  router.patch('/canvas/board/:id', (req, res) => {
    broadcast({ type: 'rename_board', id: req.params.id, name: req.body.name })
    res.json({ ok: true })
  })

  router.delete('/canvas/board/:id', (req, res) => {
    broadcast({ type: 'delete_board', id: req.params.id })
    res.json({ ok: true })
  })

  router.post('/canvas/board/:id/activate', (req, res) => {
    broadcast({ type: 'switch_board', id: req.params.id })
    res.json({ ok: true })
  })

  return router
}
