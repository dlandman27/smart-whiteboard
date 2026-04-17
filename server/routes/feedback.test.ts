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

// --- Supabase mock helpers ---
// We need a chainable query builder mock that supports .from().select().eq()...
// The approach: track the current table + return a fixed result per call.

const mockFrom = vi.fn()

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}))

import { feedbackRouter } from './feedback.js'

function createApp() {
  const app = express()
  app.use(express.json())
  // Simulate requireAuth by setting userId (the router checks req.userId directly)
  app.use((req: any, _res: any, next: any) => {
    req.userId = 'test-user-id'
    next()
  })
  app.use('/api', feedbackRouter())
  app.use(errorMiddleware)
  return app
}

/** Builds a fluent mock query chain that always resolves to `result`. */
function makeChain(result: { data?: any; error?: any }) {
  const chain: any = {}
  const methods = ['select', 'eq', 'order', 'in', 'insert', 'update', 'delete', 'single', 'maybeSingle']
  for (const m of methods) {
    chain[m] = (..._args: any[]) => {
      if (m === 'single' || m === 'maybeSingle') return Promise.resolve(result)
      return chain
    }
  }
  // Make the chain itself thenable so `await query` works
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve)
  return chain
}

describe('feedback router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /api/feedback/posts ───────────────────────────────────────────────

  describe('GET /api/feedback/posts', () => {
    it('returns a list of posts with voted and comment_count enrichment', async () => {
      const posts = [
        { id: 'p1', title: 'Feature A', vote_count: 5, category: 'idea', status: 'open', created_at: '2026-01-01' },
      ]

      mockFrom.mockImplementation((table: string) => {
        if (table === 'feedback_posts') return makeChain({ data: posts, error: null })
        if (table === 'feedback_votes') return makeChain({ data: [], error: null })
        if (table === 'feedback_comments') return makeChain({ data: [], error: null })
        return makeChain({ data: null, error: null })
      })

      const res = await request(createApp()).get('/api/feedback/posts')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.posts)).toBe(true)
      expect(res.body.posts[0].id).toBe('p1')
      expect(res.body.posts[0]).toHaveProperty('has_voted')
      expect(res.body.posts[0]).toHaveProperty('comment_count')
    })

    it('marks posts as voted when user has voted', async () => {
      const posts = [{ id: 'p1', title: 'Feature A', vote_count: 3 }]

      mockFrom.mockImplementation((table: string) => {
        if (table === 'feedback_posts') return makeChain({ data: posts, error: null })
        if (table === 'feedback_votes') return makeChain({ data: [{ post_id: 'p1' }], error: null })
        if (table === 'feedback_comments') return makeChain({ data: [], error: null })
        return makeChain({ data: null, error: null })
      })

      const res = await request(createApp()).get('/api/feedback/posts')

      expect(res.status).toBe(200)
      expect(res.body.posts[0].has_voted).toBe(true)
    })

    it('returns 500 when supabase query fails', async () => {
      mockFrom.mockImplementation(() =>
        makeChain({ data: null, error: { message: 'DB error' } }),
      )

      const res = await request(createApp()).get('/api/feedback/posts')
      expect(res.status).toBe(500)
    })
  })

  // ── GET /api/feedback/posts/:id ───────────────────────────────────────────

  describe('GET /api/feedback/posts/:id', () => {
    it('returns a single post with comments', async () => {
      const post = { id: 'p1', title: 'Feature A', vote_count: 2 }
      const comments = [{ id: 'c1', body: 'Nice idea', post_id: 'p1' }]

      let callIndex = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'feedback_posts') {
          callIndex++
          return makeChain({ data: post, error: null })
        }
        if (table === 'feedback_comments') return makeChain({ data: comments, error: null })
        if (table === 'feedback_votes') return makeChain({ data: null, error: null })
        return makeChain({ data: null, error: null })
      })

      const res = await request(createApp()).get('/api/feedback/posts/p1')

      expect(res.status).toBe(200)
      expect(res.body.post.id).toBe('p1')
      expect(Array.isArray(res.body.comments)).toBe(true)
    })

    it('returns 404 when post is not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'feedback_posts') return makeChain({ data: null, error: { message: 'not found' } })
        return makeChain({ data: null, error: null })
      })

      const res = await request(createApp()).get('/api/feedback/posts/missing-id')
      expect(res.status).toBe(404)
    })
  })

  // ── POST /api/feedback/posts ──────────────────────────────────────────────

  describe('POST /api/feedback/posts', () => {
    it('creates a new post and returns it', async () => {
      const created = { id: 'p2', title: 'New Idea', category: 'idea', user_id: 'test-user-id' }

      mockFrom.mockImplementation(() => makeChain({ data: created, error: null }))

      const res = await request(createApp())
        .post('/api/feedback/posts')
        .send({ title: 'New Idea', category: 'idea' })

      expect(res.status).toBe(200)
      expect(res.body.post.id).toBe('p2')
    })

    it('returns 400 when title is missing', async () => {
      const res = await request(createApp())
        .post('/api/feedback/posts')
        .send({ category: 'bug' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/title/i)
    })

    it('defaults category to "idea" for invalid category values', async () => {
      const created = { id: 'p3', title: 'Some Post', category: 'idea' }
      mockFrom.mockImplementation(() => makeChain({ data: created, error: null }))

      const res = await request(createApp())
        .post('/api/feedback/posts')
        .send({ title: 'Some Post', category: 'invalid-cat' })

      expect(res.status).toBe(200)
    })

    it('returns 500 when insert fails', async () => {
      mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'insert failed' } }))

      const res = await request(createApp())
        .post('/api/feedback/posts')
        .send({ title: 'Failing Post' })

      expect(res.status).toBe(500)
    })
  })

  // ── POST /api/feedback/posts/:id/vote ─────────────────────────────────────

  describe('POST /api/feedback/posts/:id/vote', () => {
    it('returns voted:true when adding a new vote', async () => {
      const post = { id: 'p1', vote_count: 5 }
      let callCount = 0

      mockFrom.mockImplementation((table: string) => {
        if (table === 'feedback_votes') {
          callCount++
          if (callCount === 1) {
            // maybeSingle check — no existing vote
            return makeChain({ data: null, error: null })
          }
          // insert new vote
          return makeChain({ data: {}, error: null })
        }
        if (table === 'feedback_posts') return makeChain({ data: post, error: null })
        return makeChain({ data: null, error: null })
      })

      const res = await request(createApp()).post('/api/feedback/posts/p1/vote')

      expect(res.status).toBe(200)
      expect(res.body.voted).toBe(true)
    })

    it('returns voted:false when removing an existing vote', async () => {
      const post = { id: 'p1', vote_count: 3 }
      let voteCallCount = 0

      mockFrom.mockImplementation((table: string) => {
        if (table === 'feedback_votes') {
          voteCallCount++
          if (voteCallCount === 1) {
            // existing vote found
            return makeChain({ data: { post_id: 'p1' }, error: null })
          }
          // delete call
          return makeChain({ data: {}, error: null })
        }
        if (table === 'feedback_posts') return makeChain({ data: post, error: null })
        return makeChain({ data: null, error: null })
      })

      const res = await request(createApp()).post('/api/feedback/posts/p1/vote')

      expect(res.status).toBe(200)
      expect(res.body.voted).toBe(false)
    })
  })

  // ── POST /api/feedback/posts/:id/comments ────────────────────────────────

  describe('POST /api/feedback/posts/:id/comments', () => {
    it('creates a comment and returns it', async () => {
      const comment = { id: 'c1', body: 'Great idea!', post_id: 'p1' }
      mockFrom.mockImplementation(() => makeChain({ data: comment, error: null }))

      const res = await request(createApp())
        .post('/api/feedback/posts/p1/comments')
        .send({ body: 'Great idea!' })

      expect(res.status).toBe(200)
      expect(res.body.comment.id).toBe('c1')
    })

    it('returns 400 when comment body is empty', async () => {
      const res = await request(createApp())
        .post('/api/feedback/posts/p1/comments')
        .send({ body: '   ' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/body/i)
    })

    it('returns 400 when comment body is missing', async () => {
      const res = await request(createApp())
        .post('/api/feedback/posts/p1/comments')
        .send({})

      expect(res.status).toBe(400)
    })

    it('returns 500 when insert fails', async () => {
      mockFrom.mockImplementation(() =>
        makeChain({ data: null, error: { message: 'insert failed' } }),
      )

      const res = await request(createApp())
        .post('/api/feedback/posts/p1/comments')
        .send({ body: 'A valid comment' })

      expect(res.status).toBe(500)
    })
  })
})
