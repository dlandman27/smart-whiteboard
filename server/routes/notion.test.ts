import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { notionRouter } from './notion.js'
import { errorMiddleware } from '../middleware/error.js'

// ── Auth mock ────────────────────────────────────────────────────────────────
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() },
}))

// ── Credentials mock ─────────────────────────────────────────────────────────
vi.mock('../services/credentials.js', () => ({
  loadCredential:    vi.fn(),
  saveCredential:    vi.fn(),
  loadOAuthTokens:   vi.fn(),
  saveOAuthTokens:   vi.fn(),
  deleteOAuthTokens: vi.fn(),
}))

// ── Notion SDK mock ──────────────────────────────────────────────────────────
const mockNotionSearch     = vi.fn()
const mockDbRetrieve       = vi.fn()
const mockDbQuery          = vi.fn()
const mockDbCreate         = vi.fn()
const mockDbUpdate         = vi.fn()
const mockPagesCreate      = vi.fn()
const mockPagesUpdate      = vi.fn()
const mockBlocksUpdate     = vi.fn()
const mockBlocksChildrenList   = vi.fn()
const mockBlocksChildrenAppend = vi.fn()

vi.mock('@notionhq/client', () => {
  function MockClient(_opts: any) {
    this.search    = mockNotionSearch
    this.databases = {
      retrieve: mockDbRetrieve,
      query:    mockDbQuery,
      create:   mockDbCreate,
      update:   mockDbUpdate,
    }
    this.pages = {
      create: mockPagesCreate,
      update: mockPagesUpdate,
    }
    this.blocks = {
      update:   mockBlocksUpdate,
      children: {
        list:   mockBlocksChildrenList,
        append: mockBlocksChildrenAppend,
      },
    }
  }
  return { Client: MockClient }
})

import {
  loadCredential,
  saveCredential,
  loadOAuthTokens,
  saveOAuthTokens,
  deleteOAuthTokens,
} from '../services/credentials.js'

const loadCredentialMock    = loadCredential    as any
const loadOAuthTokensMock   = loadOAuthTokens   as any
const saveCredentialMock    = saveCredential    as any
const saveOAuthTokensMock   = saveOAuthTokens   as any
const deleteOAuthTokensMock = deleteOAuthTokens as any

function buildApp() {
  const app = express()
  app.use(express.json())
  // Simulate auth middleware setting req.userId
  app.use((req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() })
  app.use('/api', notionRouter())
  app.use(errorMiddleware)
  return app
}

describe('notion routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NOTION_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.NOTION_OAUTH_CLIENT_ID
    delete process.env.NOTION_OAUTH_CLIENT_SECRET
  })

  // ── GET /health ──────────────────────────────────────────────────────────

  it('GET /health returns ok:true without userId', async () => {
    const app = express()
    app.use(express.json())
    // Router without auth middleware so req.userId is undefined
    app.use('/api', notionRouter())
    app.use(errorMiddleware)

    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.configured).toBeUndefined()
  })

  it('GET /health returns services when userId present', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    process.env.ANTHROPIC_API_KEY = 'ant-key'

    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const res = await request(buildApp()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.configured).toBe(true)
    expect(res.body.services.anthropic).toBe(true)
    expect(res.body.services.notion).toBe(true)
  })

  // ── GET /notion/status ───────────────────────────────────────────────────

  it('GET /notion/status returns connected:false when no tokens', async () => {
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const res = await request(buildApp()).get('/api/notion/status')
    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(false)
    expect(res.body.method).toBeNull()
  })

  it('GET /notion/status returns connected:true with oauth token', async () => {
    loadOAuthTokensMock.mockResolvedValue({ access_token: 'abc', refresh_token: 'My Workspace' })
    loadCredentialMock.mockResolvedValue(null)

    const res = await request(buildApp()).get('/api/notion/status')
    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(true)
    expect(res.body.method).toBe('oauth')
    expect(res.body.workspace_name).toBe('My Workspace')
  })

  it('GET /notion/status returns connected:true with api_key credential', async () => {
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue({ api_key: 'secret-key' })

    const res = await request(buildApp()).get('/api/notion/status')
    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(true)
    expect(res.body.method).toBe('api_key')
  })

  // ── POST /notion/connect ─────────────────────────────────────────────────

  it('POST /notion/connect returns 500 if OAuth credentials not configured', async () => {
    const res = await request(buildApp()).post('/api/notion/connect')
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/not configured/)
  })

  it('POST /notion/connect returns authorization URL', async () => {
    // NOTION_OAUTH_CLIENT_ID/SECRET are module-level consts, so we must re-import
    // the router after setting env vars to pick up the new values.
    process.env.NOTION_OAUTH_CLIENT_ID     = 'cid'
    process.env.NOTION_OAUTH_CLIENT_SECRET = 'csec'

    vi.resetModules()
    const { notionRouter: freshRouter } = await import('./notion.js')
    const freshApp = express()
    freshApp.use(express.json())
    freshApp.use((req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() })
    freshApp.use('/api', freshRouter())
    freshApp.use(errorMiddleware)

    const res = await request(freshApp).post('/api/notion/connect')
    expect(res.status).toBe(200)
    expect(res.body.url).toContain('https://api.notion.com/v1/oauth/authorize')
    expect(res.body.url).toContain('cid')
  })

  // ── POST /notion/disconnect ──────────────────────────────────────────────

  it('POST /notion/disconnect returns ok', async () => {
    deleteOAuthTokensMock.mockResolvedValue(undefined)
    const res = await request(buildApp()).post('/api/notion/disconnect')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(deleteOAuthTokensMock).toHaveBeenCalledWith('test-user-id', 'notion')
  })

  // ── GET /databases ───────────────────────────────────────────────────────

  it('GET /databases returns notion search results', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const mockResults = { results: [{ id: 'db1', object: 'database' }] }
    mockNotionSearch.mockResolvedValue(mockResults)

    const res = await request(buildApp()).get('/api/databases')
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
    expect(mockNotionSearch).toHaveBeenCalledWith(expect.objectContaining({
      filter: { value: 'database', property: 'object' },
    }))
  })

  it('GET /databases returns 401 if no Notion credentials', async () => {
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const res = await request(buildApp()).get('/api/databases')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/not connected/)
  })

  // ── GET /databases/:id ───────────────────────────────────────────────────

  it('GET /databases/:id retrieves a database', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const mockDb = { id: 'db123', object: 'database' }
    mockDbRetrieve.mockResolvedValue(mockDb)

    const res = await request(buildApp()).get('/api/databases/db123')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('db123')
  })

  // ── POST /databases/:id/query ────────────────────────────────────────────

  it('POST /databases/:id/query queries a database', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const mockResults = { results: [], has_more: false }
    mockDbQuery.mockResolvedValue(mockResults)

    const res = await request(buildApp())
      .post('/api/databases/db123/query')
      .send({ page_size: 10 })

    expect(res.status).toBe(200)
    expect(res.body.results).toEqual([])
    expect(mockDbQuery).toHaveBeenCalledWith(expect.objectContaining({
      database_id: 'db123',
      page_size:   10,
    }))
  })

  // ── POST /databases/:id/pages ────────────────────────────────────────────

  it('POST /databases/:id/pages creates a page', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const mockPage = { id: 'page1', object: 'page' }
    mockPagesCreate.mockResolvedValue(mockPage)

    const res = await request(buildApp())
      .post('/api/databases/db123/pages')
      .send({ properties: { Name: { title: [{ text: { content: 'Test' } }] } } })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('page1')
  })

  // ── POST /databases/:id/smart-entry ──────────────────────────────────────

  it('POST /databases/:id/smart-entry maps property types correctly', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    mockDbRetrieve.mockResolvedValue({
      id:         'db123',
      properties: {
        Name:   { type: 'title' },
        Count:  { type: 'number' },
        Done:   { type: 'checkbox' },
        Status: { type: 'select' },
      },
    })
    mockPagesCreate.mockResolvedValue({ id: 'page2' })

    const res = await request(buildApp())
      .post('/api/databases/db123/smart-entry')
      .send({ data: { Name: 'Hello', Count: 5, Done: true, Status: 'Active' } })

    expect(res.status).toBe(200)
    expect(mockPagesCreate).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        Name:  { title: [{ text: { content: 'Hello' } }] },
        Count: { number: 5 },
        Done:  { checkbox: true },
      }),
    }))
  })

  // ── PATCH /pages/:id ─────────────────────────────────────────────────────

  it('PATCH /pages/:id updates page properties', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const mockPage = { id: 'page1' }
    mockPagesUpdate.mockResolvedValue(mockPage)

    const res = await request(buildApp())
      .patch('/api/pages/page1')
      .send({ properties: { Status: { select: { name: 'Done' } } } })

    expect(res.status).toBe(200)
    expect(mockPagesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      page_id:    'page1',
      properties: expect.any(Object),
    }))
  })

  // ── DELETE /pages/:id ─────────────────────────────────────────────────────

  it('DELETE /pages/:id archives a page', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    mockPagesUpdate.mockResolvedValue({ id: 'page1', archived: true })

    const res = await request(buildApp()).delete('/api/pages/page1')
    expect(res.status).toBe(200)
    expect(mockPagesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      page_id:  'page1',
      archived: true,
    }))
  })

  // ── GET/POST /notion/workspace-page ──────────────────────────────────────

  it('GET /notion/workspace-page returns null pageId when not set', async () => {
    loadCredentialMock.mockResolvedValue(null)
    const res = await request(buildApp()).get('/api/notion/workspace-page')
    expect(res.status).toBe(200)
    expect(res.body.pageId).toBeNull()
  })

  it('GET /notion/workspace-page returns stored pageId', async () => {
    loadCredentialMock.mockResolvedValue({ redirect_uri: 'page-abc' })
    const res = await request(buildApp()).get('/api/notion/workspace-page')
    expect(res.status).toBe(200)
    expect(res.body.pageId).toBe('page-abc')
  })

  it('POST /notion/workspace-page saves pageId', async () => {
    loadCredentialMock.mockResolvedValue(null)
    saveCredentialMock.mockResolvedValue(undefined)

    const res = await request(buildApp())
      .post('/api/notion/workspace-page')
      .send({ pageId: 'new-page-id' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(saveCredentialMock).toHaveBeenCalledWith('test-user-id', 'notion', expect.objectContaining({
      redirect_uri: 'new-page-id',
    }))
  })

  it('POST /notion/workspace-page returns 400 if no pageId', async () => {
    const res = await request(buildApp()).post('/api/notion/workspace-page').send({})
    expect(res.status).toBe(400)
  })

  // ── POST /notion/databases ────────────────────────────────────────────────

  it('POST /notion/databases creates a database', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue({ redirect_uri: 'parent-page-id' })
    mockDbCreate.mockResolvedValue({ id: 'new-db-id' })

    const res = await request(buildApp())
      .post('/api/notion/databases')
      .send({ title: 'My DB', properties: { Name: { title: {} } } })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('new-db-id')
  })

  it('POST /notion/databases returns 400 when no parent page configured', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const res = await request(buildApp())
      .post('/api/notion/databases')
      .send({ title: 'My DB', properties: {} })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('MISSING_PARENT_PAGE')
  })

  // ── GET /pages/:id/blocks ─────────────────────────────────────────────────

  it('GET /pages/:id/blocks returns block list', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    mockBlocksChildrenList.mockResolvedValue({ results: [{ id: 'b1', type: 'paragraph' }] })

    const res = await request(buildApp()).get('/api/pages/page1/blocks')
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
  })

  // ── PATCH /blocks/:id ─────────────────────────────────────────────────────

  it('PATCH /blocks/:id updates a block', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    mockBlocksUpdate.mockResolvedValue({ id: 'b1' })

    const res = await request(buildApp())
      .patch('/api/blocks/b1')
      .send({ paragraph: { rich_text: [{ text: { content: 'Updated' } }] } })

    expect(res.status).toBe(200)
    expect(mockBlocksUpdate).toHaveBeenCalledWith(expect.objectContaining({ block_id: 'b1' }))
  })

  // ── POST /doc ─────────────────────────────────────────────────────────────

  it('POST /doc creates a Notion page with parsed markdown', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue({ redirect_uri: 'parent-page' })

    const createdPage = { id: 'doc-page', url: 'https://notion.so/doc-page' }
    mockPagesCreate.mockResolvedValue(createdPage)

    const res = await request(buildApp())
      .post('/api/doc')
      .send({ title: 'My Doc', content: '# Heading\n\nSome text.\n- bullet one' })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('doc-page')
    expect(res.body.url).toBeTruthy()
  })

  it('POST /doc returns 400 when title missing', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue({ redirect_uri: 'parent-page' })

    const res = await request(buildApp()).post('/api/doc').send({ content: 'text' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })

  it('POST /doc returns 400 when no parent page configured', async () => {
    process.env.NOTION_API_KEY = 'test-key'
    loadOAuthTokensMock.mockResolvedValue(null)
    loadCredentialMock.mockResolvedValue(null)

    const res = await request(buildApp()).post('/api/doc').send({ title: 'My Doc', content: 'text' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('MISSING_PARENT_PAGE')
  })
})
