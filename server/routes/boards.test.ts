import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id'
    next()
  },
}))

// vi.mock factories are hoisted to the top, so we cannot reference variables
// declared outside them. Use vi.hoisted to create the spies first.
const { mockBroadcast, mockGetBoards, mockGetActiveBoardId } = vi.hoisted(() => ({
  mockBroadcast:        vi.fn(),
  mockGetBoards:        vi.fn(() => [{ id: 'board-1', name: 'Board One', widgets: [] }]),
  mockGetActiveBoardId: vi.fn(() => 'board-1'),
}))

vi.mock('../ws.js', () => ({
  broadcast:        mockBroadcast,
  getBoards:        mockGetBoards,
  getActiveBoardId: mockGetActiveBoardId,
  getWidgets:       vi.fn(() => []),
  getCanvas:        vi.fn(() => ({ width: 1920, height: 1080 })),
}))

import { boardsRouter } from './boards.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', boardsRouter())
  app.use(errorMiddleware)
  return app
}

describe('boards router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBoards.mockReturnValue([{ id: 'board-1', name: 'Board One', widgets: [] }])
    mockGetActiveBoardId.mockReturnValue('board-1')
  })

  describe('GET /api/canvas/boards', () => {
    it('returns current boards and active board id', async () => {
      const res = await request(createApp()).get('/api/canvas/boards')

      expect(res.status).toBe(200)
      expect(res.body.boards).toEqual([{ id: 'board-1', name: 'Board One', widgets: [] }])
      expect(res.body.activeBoardId).toBe('board-1')
    })

    it('returns empty boards array when there are no boards', async () => {
      mockGetBoards.mockReturnValue([])
      mockGetActiveBoardId.mockReturnValue('')

      const res = await request(createApp()).get('/api/canvas/boards')

      expect(res.status).toBe(200)
      expect(res.body.boards).toEqual([])
      expect(res.body.activeBoardId).toBe('')
    })
  })

  describe('POST /api/canvas/board', () => {
    it('broadcasts create_board and returns a new id', async () => {
      const res = await request(createApp())
        .post('/api/canvas/board')
        .send({ name: 'My New Board' })

      expect(res.status).toBe(200)
      expect(typeof res.body.id).toBe('string')
      expect(res.body.id).toBeTruthy()
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'create_board', name: 'My New Board' }),
      )
    })

    it('uses "New Board" as default name when none supplied', async () => {
      const res = await request(createApp())
        .post('/api/canvas/board')
        .send({})

      expect(res.status).toBe(200)
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'create_board', name: 'New Board' }),
      )
    })
  })

  describe('PATCH /api/canvas/board/:id', () => {
    it('broadcasts rename_board and returns ok', async () => {
      const res = await request(createApp())
        .patch('/api/canvas/board/board-1')
        .send({ name: 'Renamed Board' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({
        type: 'rename_board',
        id:   'board-1',
        name: 'Renamed Board',
      })
    })
  })

  describe('DELETE /api/canvas/board/:id', () => {
    it('broadcasts delete_board and returns ok', async () => {
      const res = await request(createApp()).delete('/api/canvas/board/board-1')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'delete_board', id: 'board-1' })
    })
  })

  describe('POST /api/canvas/board/:id/activate', () => {
    it('broadcasts switch_board and returns ok', async () => {
      const res = await request(createApp())
        .post('/api/canvas/board/board-2/activate')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'switch_board', id: 'board-2' })
    })
  })
})
