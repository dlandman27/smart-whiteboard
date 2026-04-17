import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { eventsRouter } from './events.js'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() },
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq     = vi.fn()
const mockOrder  = vi.fn()
const mockGte    = vi.fn()
const mockLte    = vi.fn()

function makeChain() {
  const chain: any = {
    select:  (..._a: any[]) => chain,
    insert:  (..._a: any[]) => { mockInsert(..._a); return chain },
    update:  (..._a: any[]) => { mockUpdate(..._a); return chain },
    delete:  (..._a: any[]) => { mockDelete(..._a); return chain },
    eq:      (..._a: any[]) => { mockEq(..._a); return chain },
    order:   (..._a: any[]) => { mockOrder(..._a); return chain },
    gte:     (..._a: any[]) => { mockGte(..._a); return chain },
    lte:     (..._a: any[]) => { mockLte(..._a); return chain },
    single:  () => mockSingle(),
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
  app.use('/api', eventsRouter())
  app.use(errorMiddleware)
  return app
}

describe('events routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /events ───────────────────────────────────────────────────────────

  it('GET /events returns event list', async () => {
    const events = [
      { id: 'e1', title: 'Team standup', start_at: '2026-04-17T09:00:00Z', user_id: 'test-user-id' },
      { id: 'e2', title: 'Lunch',        start_at: '2026-04-17T12:00:00Z', user_id: 'test-user-id' },
    ]
    mockSelect.mockReturnValue({ data: events, error: null })

    const res = await request(buildApp()).get('/api/events')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].title).toBe('Team standup')
  })

  it('GET /events filters by timeMin', async () => {
    mockSelect.mockReturnValue({ data: [], error: null })
    const res = await request(buildApp()).get('/api/events?timeMin=2026-04-17T00:00:00Z')
    expect(res.status).toBe(200)
    expect(mockGte).toHaveBeenCalledWith('start_at', '2026-04-17T00:00:00Z')
  })

  it('GET /events filters by timeMax', async () => {
    mockSelect.mockReturnValue({ data: [], error: null })
    const res = await request(buildApp()).get('/api/events?timeMax=2026-04-17T23:59:59Z')
    expect(res.status).toBe(200)
    expect(mockLte).toHaveBeenCalledWith('start_at', '2026-04-17T23:59:59Z')
  })

  it('GET /events filters by calendar_name', async () => {
    mockSelect.mockReturnValue({ data: [], error: null })
    const res = await request(buildApp()).get('/api/events?calendar_name=Work')
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('calendar_name', 'Work')
  })

  it('GET /events returns 500 on db error', async () => {
    mockSelect.mockReturnValue({ data: null, error: { message: 'DB error' } })
    const res = await request(buildApp()).get('/api/events')
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/DB error/)
  })

  // ── GET /events/calendars ─────────────────────────────────────────────────

  it('GET /events/calendars returns distinct calendar names', async () => {
    mockSelect.mockReturnValue({
      data: [
        { calendar_name: 'Work' },
        { calendar_name: 'Personal' },
        { calendar_name: 'Work' },   // duplicate
      ],
      error: null,
    })

    const res = await request(buildApp()).get('/api/events/calendars')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    const names = res.body.map((c: any) => c.name)
    expect(names).toContain('Work')
    expect(names).toContain('Personal')
  })

  it('GET /events/calendars returns 500 on db error', async () => {
    mockSelect.mockReturnValue({ data: null, error: { message: 'fail' } })
    const res = await request(buildApp()).get('/api/events/calendars')
    expect(res.status).toBe(500)
  })

  // ── POST /events ──────────────────────────────────────────────────────────

  it('POST /events creates an event', async () => {
    const newEvent = {
      id:            'e3',
      title:         'Sprint Planning',
      start_at:      '2026-04-18T10:00:00Z',
      calendar_name: 'Work',
      all_day:       false,
      user_id:       'test-user-id',
    }
    mockSingle.mockResolvedValue({ data: newEvent, error: null })

    const res = await request(buildApp())
      .post('/api/events')
      .send({ title: 'Sprint Planning', start_at: '2026-04-18T10:00:00Z', calendar_name: 'Work' })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Sprint Planning')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      title:         'Sprint Planning',
      user_id:       'test-user-id',
      calendar_name: 'Work',
    }))
  })

  it('POST /events uses defaults for optional fields', async () => {
    const newEvent = { id: 'e4', title: 'Standup', start_at: '2026-04-18T09:00:00Z', calendar_name: 'My Calendar', all_day: false }
    mockSingle.mockResolvedValue({ data: newEvent, error: null })

    await request(buildApp())
      .post('/api/events')
      .send({ title: 'Standup', start_at: '2026-04-18T09:00:00Z' })

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      calendar_name: 'My Calendar',
      all_day:       false,
    }))
  })

  it('POST /events returns 400 when title is missing', async () => {
    const res = await request(buildApp())
      .post('/api/events')
      .send({ start_at: '2026-04-18T09:00:00Z' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })

  it('POST /events returns 400 when start_at is missing', async () => {
    const res = await request(buildApp())
      .post('/api/events')
      .send({ title: 'Meeting' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/start_at/)
  })

  it('POST /events returns 500 on db error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const res = await request(buildApp())
      .post('/api/events')
      .send({ title: 'Meeting', start_at: '2026-04-18T10:00:00Z' })

    expect(res.status).toBe(500)
  })

  // ── PATCH /events/:id ─────────────────────────────────────────────────────

  it('PATCH /events/:id updates an event', async () => {
    const updated = { id: 'e1', title: 'Updated Meeting', start_at: '2026-04-17T09:00:00Z' }
    mockSingle.mockResolvedValue({ data: updated, error: null })

    const res = await request(buildApp())
      .patch('/api/events/e1')
      .send({ title: 'Updated Meeting' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated Meeting')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Meeting' }))
    expect(mockEq).toHaveBeenCalledWith('id', 'e1')
  })

  it('PATCH /events/:id strips protected fields', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'e1', title: 'ok' }, error: null })

    await request(buildApp())
      .patch('/api/events/e1')
      .send({ title: 'ok', user_id: 'attacker', id: 'other', created_at: 'nope' })

    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.user_id).toBeUndefined()
    expect(updateArg.id).toBeUndefined()
    expect(updateArg.created_at).toBeUndefined()
  })

  it('PATCH /events/:id returns 404 when event not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const res = await request(buildApp()).patch('/api/events/nope').send({ title: 'X' })
    expect(res.status).toBe(404)
  })

  it('PATCH /events/:id returns 500 on db error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })
    const res = await request(buildApp()).patch('/api/events/e1').send({ title: 'X' })
    expect(res.status).toBe(500)
  })

  // ── DELETE /events/:id ────────────────────────────────────────────────────

  it('DELETE /events/:id deletes an event', async () => {
    mockSelect.mockReturnValue({ error: null })

    const res = await request(buildApp()).delete('/api/events/e1')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'e1')
  })

  it('DELETE /events/:id returns 500 on db error', async () => {
    mockSelect.mockReturnValue({ error: { message: 'delete failed' } })
    const res = await request(buildApp()).delete('/api/events/e1')
    expect(res.status).toBe(500)
  })
})
