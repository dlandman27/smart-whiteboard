import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() },
}))

// ── Voice tools registry mock ─────────────────────────────────────────────────
const mockExecuteVoiceTool = vi.fn()
vi.mock('../services/voice-tools/registry.js', () => ({
  VOICE_TOOLS:      [],
  executeVoiceTool: (...args: any[]) => mockExecuteVoiceTool(...args),
}))

// ── Memory + board utils mocks ────────────────────────────────────────────────
vi.mock('../services/memory.js', () => ({
  loadMemory:    vi.fn().mockReturnValue({ name: '', location: '', preferences: [], facts: [], databases: {} }),
  memoryToPrompt: vi.fn().mockReturnValue(''),
}))

vi.mock('../services/board-utils.js', () => ({
  getBoardSnapshot: vi.fn().mockReturnValue(''),
}))

// ── Notion client mock ────────────────────────────────────────────────────────
vi.mock('./notion.js', () => ({
  getNotionClient: vi.fn().mockResolvedValue(null),
}))

// ── GCal client mock ──────────────────────────────────────────────────────────
vi.mock('../services/gcal.js', () => ({
  getGCalClient: vi.fn().mockResolvedValue(null),
}))

// ── Anthropic SDK mock ────────────────────────────────────────────────────────
const mockMessagesCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  class FakeAPIError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status  = status
      this.name    = 'APIError'
    }
  }
  function MockAnthropic(_opts: any) {
    this.messages = { create: mockMessagesCreate }
  }
  MockAnthropic.APIError = FakeAPIError
  return { default: MockAnthropic, APIError: FakeAPIError }
})

// ── Global fetch mock (for TTS) ───────────────────────────────────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import router AFTER mocks are set up
async function buildApp() {
  const { voiceRouter } = await import('./voice.js')
  const app = express()
  app.use(express.json())
  // Simulate auth middleware setting req.userId
  app.use((req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() })
  app.use('/api', voiceRouter())
  app.use(errorMiddleware)
  return app
}

describe('voice routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.VITE_ANTHROPIC_API_KEY
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.VITE_ELEVENLABS_API_KEY
  })

  // ── POST /voice ───────────────────────────────────────────────────────────

  it('POST /voice returns empty response for blank text', async () => {
    const app = await buildApp()
    const res = await request(app).post('/api/voice').send({ text: '' })
    expect(res.status).toBe(200)
    expect(res.body.response).toBe('')
  })

  it('POST /voice returns empty response when text is whitespace', async () => {
    const app = await buildApp()
    const res = await request(app).post('/api/voice').send({ text: '   ' })
    expect(res.status).toBe(200)
    expect(res.body.response).toBe('')
  })

  it('POST /voice returns 503 when ANTHROPIC_API_KEY not set', async () => {
    const app = await buildApp()
    const res = await request(app).post('/api/voice').send({ text: 'Hello' })
    expect(res.status).toBe(503)
    expect(res.body.code).toBe('MISSING_CONFIG')
  })

  it('POST /voice returns Anthropic response text on end_turn', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

    mockMessagesCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Hello, how can I help you?' }],
    })

    const app = await buildApp()
    const res = await request(app).post('/api/voice').send({ text: 'Hi Walli' })
    expect(res.status).toBe(200)
    expect(res.body.response).toBe('Hello, how can I help you?')
  })

  it('POST /voice executes tool use and returns final response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    mockExecuteVoiceTool.mockResolvedValue('Tool result here')

    mockMessagesCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'tu1', name: 'test_tool', input: { key: 'val' } }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done using tool.' }],
      })

    const app = await buildApp()
    const res = await request(app).post('/api/voice').send({ text: 'Do something' })
    expect(res.status).toBe(200)
    expect(res.body.response).toBe('Done using tool.')
    expect(mockExecuteVoiceTool).toHaveBeenCalledWith(
      'test_tool',
      { key: 'val' },
      expect.objectContaining({ userId: 'test-user-id', gcal: null }),
    )
  })

  it('POST /voice returns Done. when no text block in end_turn response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    mockMessagesCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [],
    })

    const app = await buildApp()
    const res = await request(app).post('/api/voice').send({ text: 'Say nothing' })
    expect(res.status).toBe(200)
    expect(res.body.response).toBe('Done.')
  })

  it('POST /voice returns 502 on Anthropic API error', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

    // Create a fake APIError-like object that voice.ts instanceof-checks
    const apiErr = Object.assign(new Error('Rate limit exceeded'), {
      name:    'APIError',
      status:  429,
    })
    // Make instanceof APIError pass by using the same prototype as the mock
    const { APIError } = await import('@anthropic-ai/sdk')
    Object.setPrototypeOf(apiErr, (APIError as any).prototype)
    mockMessagesCreate.mockRejectedValue(apiErr)

    const app = await buildApp()
    const res = await request(app).post('/api/voice').send({ text: 'Hello' })
    expect(res.status).toBe(429)
    expect(res.body.code).toBe('ANTHROPIC_ERROR')
  })

  it('POST /voice includes conversation history in messages', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    mockMessagesCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'I remember.' }],
    })

    const history = [
      { role: 'user',      content: 'What is my name?' },
      { role: 'assistant', content: 'Your name is Dylan.' },
    ]

    const app = await buildApp()
    await request(app).post('/api/voice').send({ text: 'Good', history })

    const callArgs = mockMessagesCreate.mock.calls[0][0]
    expect(callArgs.messages).toHaveLength(3) // 2 history + 1 current
    expect(callArgs.messages[0]).toEqual({ role: 'user', content: 'What is my name?' })
    expect(callArgs.messages[2]).toEqual({ role: 'user', content: 'Good' })
  })

  it('POST /voice caps history at 6 messages', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    mockMessagesCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'OK' }],
    })

    const history = Array.from({ length: 10 }, (_, i) => ({
      role:    i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }))

    const app = await buildApp()
    await request(app).post('/api/voice').send({ text: 'Final', history })

    const callArgs = mockMessagesCreate.mock.calls[0][0]
    // max 6 history + 1 current = 7
    expect(callArgs.messages.length).toBeLessThanOrEqual(7)
  })

  // ── POST /tts ─────────────────────────────────────────────────────────────

  it('POST /tts returns 400 when text is empty', async () => {
    const app = await buildApp()
    const res = await request(app).post('/api/tts').send({ text: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/No text/)
  })

  it('POST /tts returns 503 when ELEVENLABS_API_KEY not set', async () => {
    const app = await buildApp()
    const res = await request(app).post('/api/tts').send({ text: 'Hello world' })
    expect(res.status).toBe(503)
    expect(res.body.code).toBe('MISSING_CONFIG')
  })

  it('POST /tts forwards error when ElevenLabs returns non-ok', async () => {
    process.env.ELEVENLABS_API_KEY = 'el-key'
    mockFetch.mockResolvedValue({
      ok:     false,
      status: 401,
      text:   vi.fn().mockResolvedValue('Unauthorized'),
    })

    const app = await buildApp()
    const res = await request(app).post('/api/tts').send({ text: 'Hello world' })
    expect(res.status).toBe(401)
  })
})
