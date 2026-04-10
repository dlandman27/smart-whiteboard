import { describe, it, expect, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { AppError, asyncRoute, errorMiddleware } from './error.js'

// ─── AppError ────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('has the correct name, message, and statusCode', () => {
    const err = new AppError(404, 'Not found')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.name).toBe('AppError')
    expect(err.message).toBe('Not found')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBeUndefined()
  })

  it('stores an optional error code', () => {
    const err = new AppError(409, 'Conflict', 'DUPLICATE')
    expect(err.code).toBe('DUPLICATE')
  })
})

// ─── asyncRoute ──────────────────────────────────────────────────────────────

describe('asyncRoute', () => {
  it('forwards async errors to next()', async () => {
    const app = express()
    app.get(
      '/boom',
      asyncRoute(async () => {
        throw new AppError(422, 'bad input')
      }),
    )
    app.use(errorMiddleware)

    const res = await request(app).get('/boom')
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ error: 'bad input' })
  })

  it('forwards sync errors to next()', async () => {
    const app = express()
    app.get(
      '/sync-boom',
      asyncRoute(() => {
        throw new Error('sync fail')
      }),
    )
    app.use(errorMiddleware)

    const res = await request(app).get('/sync-boom')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Internal server error' })
  })

  it('allows successful responses through', async () => {
    const app = express()
    app.get(
      '/ok',
      asyncRoute(async (_req, res) => {
        res.json({ ok: true })
      }),
    )
    app.use(errorMiddleware)

    const res = await request(app).get('/ok')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

// ─── errorMiddleware ─────────────────────────────────────────────────────────

describe('errorMiddleware', () => {
  it('returns structured JSON for AppError', async () => {
    const app = express()
    app.get('/test', (_req, _res, next) => {
      next(new AppError(403, 'Forbidden', 'AUTH_REQUIRED'))
    })
    app.use(errorMiddleware)

    const res = await request(app).get('/test')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Forbidden', code: 'AUTH_REQUIRED' })
  })

  it('omits code field when not set', async () => {
    const app = express()
    app.get('/test', (_req, _res, next) => {
      next(new AppError(400, 'Bad request'))
    })
    app.use(errorMiddleware)

    const res = await request(app).get('/test')
    expect(res.body).toEqual({ error: 'Bad request' })
    expect(res.body).not.toHaveProperty('code')
  })

  it('returns 500 for unknown errors and logs them', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = express()
    app.get('/test', (_req, _res, next) => {
      next(new Error('unexpected'))
    })
    app.use(errorMiddleware)

    const res = await request(app).get('/test')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Internal server error' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
