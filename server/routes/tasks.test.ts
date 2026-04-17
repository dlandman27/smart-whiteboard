import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { tasksRouter } from './tasks.js'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() },
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockSingle   = vi.fn()
const mockSelect   = vi.fn()
const mockInsert   = vi.fn()
const mockUpdate   = vi.fn()
const mockDelete   = vi.fn()
const mockEq       = vi.fn()
const mockOrder    = vi.fn()
const mockUpsert   = vi.fn()

// Chain builder — each method returns an object that can chain further methods
// and ultimately resolves with mockSingle() or itself
function makeChain() {
  const chain: any = {
    select:  (..._a: any[]) => chain,
    insert:  (..._a: any[]) => { mockInsert(..._a); return chain },
    update:  (..._a: any[]) => { mockUpdate(..._a); return chain },
    delete:  (..._a: any[]) => { mockDelete(..._a); return chain },
    upsert:  (..._a: any[]) => { mockUpsert(..._a); return chain },
    eq:      (..._a: any[]) => { mockEq(..._a); return chain },
    order:   (..._a: any[]) => { mockOrder(..._a); return chain },
    gte:     (..._a: any[]) => chain,
    lte:     (..._a: any[]) => chain,
    single:  () => mockSingle(),
    // Make the chain itself awaitable (for queries without .single())
    then:    (resolve: any) => Promise.resolve(mockSelect()).then(resolve),
  }
  return chain
}

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: (_table: string) => makeChain(),
  },
}))

function buildApp() {
  const app = express()
  app.use(express.json())
  // Simulate auth middleware setting req.userId
  app.use((req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() })
  app.use('/api', tasksRouter())
  app.use(errorMiddleware)
  return app
}

describe('tasks routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /tasks ────────────────────────────────────────────────────────────

  it('GET /tasks returns task list', async () => {
    const tasks = [
      { id: '1', title: 'Buy milk', status: 'needsAction', user_id: 'test-user-id' },
      { id: '2', title: 'Walk dog', status: 'needsAction', user_id: 'test-user-id' },
    ]
    mockSelect.mockReturnValue({ data: tasks, error: null })

    const res = await request(buildApp()).get('/api/tasks')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].title).toBe('Buy milk')
  })

  it('GET /tasks returns 500 on db error', async () => {
    mockSelect.mockReturnValue({ data: null, error: { message: 'DB error' } })

    const res = await request(buildApp()).get('/api/tasks')
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/DB error/)
  })

  it('GET /tasks passes status filter', async () => {
    mockSelect.mockReturnValue({ data: [], error: null })

    const res = await request(buildApp()).get('/api/tasks?status=completed')
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('status', 'completed')
  })

  it('GET /tasks passes list_name filter', async () => {
    mockSelect.mockReturnValue({ data: [], error: null })

    const res = await request(buildApp()).get('/api/tasks?list_name=Shopping%20List')
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('list_name', 'Shopping List')
  })

  // ── GET /tasks/lists ──────────────────────────────────────────────────────

  it('GET /tasks/lists returns lists with My Tasks always first', async () => {
    mockSelect.mockReturnValue({ data: [{ name: 'Work', color: 'blue' }], error: null })

    const res = await request(buildApp()).get('/api/tasks/lists')
    expect(res.status).toBe(200)
    const names = res.body.map((l: any) => l.name)
    expect(names).toContain('My Tasks')
    expect(names).toContain('Work')
    expect(names[0]).toBe('My Tasks')
  })

  it('GET /tasks/lists does not duplicate My Tasks', async () => {
    mockSelect.mockReturnValue({ data: [{ name: 'My Tasks', color: null }], error: null })

    const res = await request(buildApp()).get('/api/tasks/lists')
    expect(res.status).toBe(200)
    const myTasksCount = res.body.filter((l: any) => l.name === 'My Tasks').length
    expect(myTasksCount).toBe(1)
  })

  it('GET /tasks/lists returns 500 on db error', async () => {
    mockSelect.mockReturnValue({ data: null, error: { message: 'Cannot fetch lists' } })

    const res = await request(buildApp()).get('/api/tasks/lists')
    expect(res.status).toBe(500)
  })

  // ── POST /tasks/lists ─────────────────────────────────────────────────────

  it('POST /tasks/lists creates a new list', async () => {
    mockSingle.mockResolvedValue({ data: { name: 'Shopping', color: null }, error: null })

    const res = await request(buildApp()).post('/api/tasks/lists').send({ name: 'Shopping' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Shopping')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'test-user-id',
      name:    'Shopping',
    }))
  })

  it('POST /tasks/lists returns 400 for empty name', async () => {
    const res = await request(buildApp()).post('/api/tasks/lists').send({ name: '  ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })

  it('POST /tasks/lists returns 409 on duplicate', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'unique violation' } })

    const res = await request(buildApp()).post('/api/tasks/lists').send({ name: 'Existing' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/)
  })

  // ── POST /tasks ───────────────────────────────────────────────────────────

  it('POST /tasks creates a task', async () => {
    const newTask = { id: '42', title: 'Buy eggs', status: 'needsAction', user_id: 'test-user-id', priority: 4 }
    mockSingle.mockResolvedValue({ data: newTask, error: null })

    const res = await request(buildApp())
      .post('/api/tasks')
      .send({ title: 'Buy eggs' })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Buy eggs')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      title:     'Buy eggs',
      user_id:   'test-user-id',
      priority:  4,
      list_name: 'My Tasks',
    }))
  })

  it('POST /tasks uses provided list_name and priority', async () => {
    const newTask = { id: '43', title: 'Gym', status: 'needsAction', priority: 1, list_name: 'Health' }
    mockSingle.mockResolvedValue({ data: newTask, error: null })

    const res = await request(buildApp())
      .post('/api/tasks')
      .send({ title: 'Gym', priority: 1, list_name: 'Health' })

    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      priority:  1,
      list_name: 'Health',
    }))
  })

  it('POST /tasks returns 400 for missing title', async () => {
    const res = await request(buildApp()).post('/api/tasks').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })

  it('POST /tasks returns 500 on db error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const res = await request(buildApp()).post('/api/tasks').send({ title: 'Test Task' })
    expect(res.status).toBe(500)
  })

  // ── PATCH /tasks/:id ──────────────────────────────────────────────────────

  it('PATCH /tasks/:id updates a task', async () => {
    const updated = { id: '1', title: 'Buy milk', status: 'completed', completed_at: '2026-04-17T12:00:00Z' }
    mockSingle.mockResolvedValue({ data: updated, error: null })

    const res = await request(buildApp())
      .patch('/api/tasks/1')
      .send({ status: 'completed' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
  })

  it('PATCH /tasks/:id auto-sets completed_at when status=completed', async () => {
    mockSingle.mockResolvedValue({ data: { id: '1', status: 'completed', completed_at: '2026-04-17T12:00:00Z' }, error: null })

    const res = await request(buildApp())
      .patch('/api/tasks/1')
      .send({ status: 'completed' })

    expect(res.status).toBe(200)
    // completed_at should have been added to the update payload
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status:       'completed',
      completed_at: expect.any(String),
    }))
  })

  it('PATCH /tasks/:id clears completed_at when status=needsAction', async () => {
    mockSingle.mockResolvedValue({ data: { id: '1', status: 'needsAction', completed_at: null }, error: null })

    await request(buildApp())
      .patch('/api/tasks/1')
      .send({ status: 'needsAction' })

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      completed_at: null,
    }))
  })

  it('PATCH /tasks/:id strips protected fields', async () => {
    mockSingle.mockResolvedValue({ data: { id: '1', title: 'clean' }, error: null })

    await request(buildApp())
      .patch('/api/tasks/1')
      .send({ title: 'clean', user_id: 'attacker', id: '999', created_at: 'bad' })

    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.user_id).toBeUndefined()
    expect(updateArg.id).toBeUndefined()
    expect(updateArg.created_at).toBeUndefined()
  })

  it('PATCH /tasks/:id returns 404 when no data returned', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })

    const res = await request(buildApp()).patch('/api/tasks/999').send({ title: 'New' })
    expect(res.status).toBe(404)
  })

  it('PATCH /tasks/:id returns 500 on db error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })

    const res = await request(buildApp()).patch('/api/tasks/1').send({ title: 'New' })
    expect(res.status).toBe(500)
  })

  // ── DELETE /tasks/:id ─────────────────────────────────────────────────────

  it('DELETE /tasks/:id deletes a task', async () => {
    mockSelect.mockReturnValue({ error: null })

    const res = await request(buildApp()).delete('/api/tasks/1')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', '1')
  })

  it('DELETE /tasks/:id returns 500 on db error', async () => {
    mockSelect.mockReturnValue({ error: { message: 'delete failed' } })

    const res = await request(buildApp()).delete('/api/tasks/1')
    expect(res.status).toBe(500)
  })
})
