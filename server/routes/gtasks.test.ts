import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

vi.mock('../services/gcal.js', () => ({
  getGCalClient: vi.fn(),
}))

vi.mock('googleapis', () => {
  const tasksMock = {
    tasklists: { list: vi.fn() },
    tasks: { list: vi.fn(), insert: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }
  return {
    google: {
      tasks: vi.fn(() => tasksMock),
    },
    __tasksMock: tasksMock,
  }
})

import { gtasksRouter } from './gtasks.js'
import * as gcalService from '../services/gcal.js'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', gtasksRouter())
  app.use(errorMiddleware)
  return app
}

describe('gtasks router', () => {
  let mockTasks: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockTasks = (google.tasks as any)()
  })

  // ── Status ──────────────────────────────────────────────────────────────────

  describe('GET /api/gtasks/status', () => {
    it('returns connected:true when client works', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasklists.list.mockResolvedValue({ data: { items: [] } })

      const res = await request(createApp()).get('/api/gtasks/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(true)
    })

    it('returns connected:false when not authenticated', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)

      const res = await request(createApp()).get('/api/gtasks/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(false)
    })

    it('returns connected:false with needsReauth:true on 403', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasklists.list.mockRejectedValue({ code: 403 })

      const res = await request(createApp()).get('/api/gtasks/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(false)
      expect(res.body.needsReauth).toBe(true)
    })

    it('returns connected:false on generic error', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasklists.list.mockRejectedValue(new Error('network error'))

      const res = await request(createApp()).get('/api/gtasks/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(false)
    })
  })

  // ── Task lists ───────────────────────────────────────────────────────────────

  describe('GET /api/gtasks/lists', () => {
    it('returns task lists', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasklists.list.mockResolvedValue({ data: { items: [{ id: 'list1', title: 'My Tasks' }] } })

      const res = await request(createApp()).get('/api/gtasks/lists')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
    })

    it('returns empty items array when no lists', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasklists.list.mockResolvedValue({ data: {} })

      const res = await request(createApp()).get('/api/gtasks/lists')
      expect(res.status).toBe(200)
      expect(res.body.items).toEqual([])
    })

    it('returns 401 when not authenticated', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/gtasks/lists')
      expect(res.status).toBe(401)
    })
  })

  // ── Tasks ────────────────────────────────────────────────────────────────────

  describe('GET /api/gtasks/tasks', () => {
    it('returns tasks for a task list', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasks.list.mockResolvedValue({ data: { items: [{ id: 't1', title: 'Buy milk' }] } })

      const res = await request(createApp()).get('/api/gtasks/tasks?taskListId=list1')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
    })

    it('returns 400 when taskListId is missing', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      const res = await request(createApp()).get('/api/gtasks/tasks')
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/taskListId is required/i)
    })

    it('returns 401 when not authenticated', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/gtasks/tasks?taskListId=list1')
      expect(res.status).toBe(401)
    })
  })

  // ── Create task ──────────────────────────────────────────────────────────────

  describe('POST /api/gtasks/tasks', () => {
    it('creates and returns a task', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasks.insert.mockResolvedValue({ data: { id: 'new-t', title: 'Walk the dog' } })

      const res = await request(createApp())
        .post('/api/gtasks/tasks')
        .send({ taskListId: 'list1', title: 'Walk the dog' })
      expect(res.status).toBe(200)
      expect(res.body.id).toBe('new-t')
    })

    it('returns 400 when taskListId missing', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      const res = await request(createApp())
        .post('/api/gtasks/tasks')
        .send({ title: 'Walk the dog' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/taskListId is required/i)
    })

    it('returns 400 when title missing', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      const res = await request(createApp())
        .post('/api/gtasks/tasks')
        .send({ taskListId: 'list1' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/title is required/i)
    })

    it('returns 401 when not authenticated', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp())
        .post('/api/gtasks/tasks')
        .send({ taskListId: 'list1', title: 'Task' })
      expect(res.status).toBe(401)
    })
  })

  // ── Update task ──────────────────────────────────────────────────────────────

  describe('PATCH /api/gtasks/tasks/:taskListId/:taskId', () => {
    it('updates and returns the task', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasks.patch.mockResolvedValue({ data: { id: 't1', status: 'completed' } })

      const res = await request(createApp())
        .patch('/api/gtasks/tasks/list1/t1')
        .send({ status: 'completed' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('completed')
    })

    it('returns 401 when not authenticated', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp())
        .patch('/api/gtasks/tasks/list1/t1')
        .send({ status: 'completed' })
      expect(res.status).toBe(401)
    })
  })

  // ── Delete task ──────────────────────────────────────────────────────────────

  describe('DELETE /api/gtasks/tasks/:taskListId/:taskId', () => {
    it('deletes task and returns ok:true', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ credentials: {} } as any)
      mockTasks.tasks.delete.mockResolvedValue({})

      const res = await request(createApp()).delete('/api/gtasks/tasks/list1/t1')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('returns 401 when not authenticated', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp()).delete('/api/gtasks/tasks/list1/t1')
      expect(res.status).toBe(401)
    })
  })
})
