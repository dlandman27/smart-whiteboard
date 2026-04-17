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

// ── Hoist spy instances so vi.mock factories can reference them ───────────────

const { mockBroadcast, mockGetWidgets, mockGetCanvas } = vi.hoisted(() => ({
  mockBroadcast:  vi.fn(),
  mockGetWidgets: vi.fn(() => [{ id: 'w1', type: 'note', x: 0, y: 0 }]),
  mockGetCanvas:  vi.fn(() => ({ width: 1920, height: 1080 })),
}))

vi.mock('../ws.js', () => ({
  broadcast:        mockBroadcast,
  getWidgets:       mockGetWidgets,
  getCanvas:        mockGetCanvas,
  getBoards:        vi.fn(() => []),
  getActiveBoardId: vi.fn(() => ''),
}))

// ── Mock Anthropic SDK so POST /theme/generate never hits real API ──────────

vi.mock('@anthropic-ai/sdk', () => {
  const fakeTheme = {
    name:       'Ocean',
    dark:       true,
    background: { label: 'Deep', bg: '#001122', dot: '#003344' },
    vars: {
      widgetBg:           '#112233',
      widgetBorder:       '#223344',
      widgetBorderActive: '#334455',
      shadowSm:           '0 1px 3px rgba(0,0,0,0.5)',
      shadowMd:           '0 4px 12px rgba(0,0,0,0.5)',
      shadowLg:           '0 20px 40px rgba(0,0,0,0.5)',
      backdropFilter:     'none',
      textPrimary:        '#ffffff',
      textMuted:          '#aaaaaa',
      surfaceSubtle:      '#1a2233',
      surfaceHover:       '#2a3244',
      surfaceDanger:      '#ff0000',
      accent:             '#00aaff',
      accentText:         '#ffffff',
      danger:             '#ff4444',
      actionBg:           '#1a2233',
      actionBorder:       '#334455',
      settingsBg:         '#0a1122',
      settingsBorder:     '#223344',
      settingsDivider:    '#334455',
      settingsLabel:      '#aaaaaa',
      scrollThumb:        '#334455',
      clockFaceFill:      '#001122',
      clockFaceStroke:    '#003344',
      clockTickMajor:     '#ffffff',
      clockTickMinor:     '#888888',
      clockHands:         '#ffffff',
      clockSecond:        '#ff4444',
      clockCenter:        '#ffffff',
      noteDefaultBg:      '#112233',
    },
  }

  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(fakeTheme) }],
        }),
      }
    },
  }
})

import { canvasRouter } from './canvas.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', canvasRouter())
  app.use(errorMiddleware)
  return app
}

describe('canvas router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWidgets.mockReturnValue([{ id: 'w1', type: 'note', x: 0, y: 0 }])
    mockGetCanvas.mockReturnValue({ width: 1920, height: 1080 })
  })

  // ── GET /api/canvas/widgets ───────────────────────────────────────────────

  describe('GET /api/canvas/widgets', () => {
    it('returns current widgets and canvas dimensions', async () => {
      const res = await request(createApp()).get('/api/canvas/widgets')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.widgets)).toBe(true)
      expect(res.body.canvas.width).toBe(1920)
    })
  })

  // ── POST /api/canvas/widget ───────────────────────────────────────────────

  describe('POST /api/canvas/widget', () => {
    it('broadcasts create_widget and returns a new id', async () => {
      // Note: the route spreads req.body AFTER setting type:'create_widget',
      // so a 'type' field in the body will override it.
      // Send body without a 'type' field to verify the default type.
      const res = await request(createApp())
        .post('/api/canvas/widget')
        .send({ x: 100, y: 200 })

      expect(res.status).toBe(200)
      expect(typeof res.body.id).toBe('string')
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'create_widget', x: 100, y: 200 }),
      )
    })
  })

  // ── PATCH /api/canvas/widget/:id ─────────────────────────────────────────

  describe('PATCH /api/canvas/widget/:id', () => {
    it('broadcasts update_widget and returns ok', async () => {
      const res = await request(createApp())
        .patch('/api/canvas/widget/w1')
        .send({ x: 300, y: 400 })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'update_widget', id: 'w1', x: 300, y: 400 }),
      )
    })
  })

  // ── DELETE /api/canvas/widget/:id ────────────────────────────────────────

  describe('DELETE /api/canvas/widget/:id', () => {
    it('broadcasts delete_widget and returns ok', async () => {
      const res = await request(createApp()).delete('/api/canvas/widget/w1')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'delete_widget', id: 'w1' })
    })
  })

  // ── POST /api/canvas/clear-widgets ───────────────────────────────────────

  describe('POST /api/canvas/clear-widgets', () => {
    it('broadcasts clear_widgets and returns ok', async () => {
      const res = await request(createApp()).post('/api/canvas/clear-widgets')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'clear_widgets' })
    })
  })

  // ── POST /api/canvas/layout ───────────────────────────────────────────────

  describe('POST /api/canvas/layout', () => {
    it('broadcasts set_custom_layout and returns ok', async () => {
      const slots = [{ id: 'slot1', x: 0, y: 0, w: 400, h: 300 }]

      const res = await request(createApp())
        .post('/api/canvas/layout')
        .send({ slots })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'set_custom_layout', slots })
    })

    it('returns 400 when slots is not an array', async () => {
      const res = await request(createApp())
        .post('/api/canvas/layout')
        .send({ slots: 'not-an-array' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/array/i)
    })
  })

  // ── POST /api/canvas/screensaver ──────────────────────────────────────────

  describe('POST /api/canvas/screensaver', () => {
    it('broadcasts set_screensaver active:true and returns active', async () => {
      const res = await request(createApp())
        .post('/api/canvas/screensaver')
        .send({ active: true })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.active).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'set_screensaver', active: true })
    })

    it('broadcasts set_screensaver active:false', async () => {
      const res = await request(createApp())
        .post('/api/canvas/screensaver')
        .send({ active: false })

      expect(res.status).toBe(200)
      expect(res.body.active).toBe(false)
    })
  })

  // ── POST /api/canvas/focus-widget ─────────────────────────────────────────

  describe('POST /api/canvas/focus-widget', () => {
    it('broadcasts focus_widget when id is provided', async () => {
      const res = await request(createApp())
        .post('/api/canvas/focus-widget')
        .send({ id: 'w1' })

      expect(res.status).toBe(200)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'focus_widget', id: 'w1' })
    })

    it('broadcasts unfocus_widget when no id is provided', async () => {
      const res = await request(createApp())
        .post('/api/canvas/focus-widget')
        .send({})

      expect(res.status).toBe(200)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'unfocus_widget' })
    })
  })

  // ── POST /api/canvas/theme ────────────────────────────────────────────────

  describe('POST /api/canvas/theme', () => {
    it('broadcasts set_theme and returns ok', async () => {
      const res = await request(createApp())
        .post('/api/canvas/theme')
        .send({ themeId: 'dark' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'set_theme', themeId: 'dark' })
    })
  })

  // ── POST /api/canvas/custom-theme ────────────────────────────────────────

  describe('POST /api/canvas/custom-theme', () => {
    it('broadcasts set_custom_theme with vars and background', async () => {
      const vars       = { widgetBg: '#fff' }
      const background = { label: 'White', bg: '#fff', dot: '#eee' }

      const res = await request(createApp())
        .post('/api/canvas/custom-theme')
        .send({ vars, background })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockBroadcast).toHaveBeenCalledWith({ type: 'set_custom_theme', vars, background })
    })

    it('defaults vars to {} when not provided', async () => {
      const res = await request(createApp())
        .post('/api/canvas/custom-theme')
        .send({})

      expect(res.status).toBe(200)
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'set_custom_theme', vars: {} }),
      )
    })
  })

  // ── POST /api/theme/generate ──────────────────────────────────────────────

  describe('POST /api/theme/generate', () => {
    it('returns generated theme when description is provided', async () => {
      process.env.VITE_ANTHROPIC_API_KEY = 'test-key'

      const res = await request(createApp())
        .post('/api/theme/generate')
        .send({ description: 'A deep ocean theme' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.theme).toBeDefined()
      expect(res.body.theme.name).toBe('Ocean')

      delete process.env.VITE_ANTHROPIC_API_KEY
    })

    it('returns 400 when description is missing', async () => {
      const res = await request(createApp())
        .post('/api/theme/generate')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/description/i)
    })

    it('returns 400 when description is only whitespace', async () => {
      const res = await request(createApp())
        .post('/api/theme/generate')
        .send({ description: '   ' })

      expect(res.status).toBe(400)
    })

    it('returns 503 when no API key is configured', async () => {
      const savedVite  = process.env.VITE_ANTHROPIC_API_KEY
      const savedPlain = process.env.ANTHROPIC_API_KEY
      delete process.env.VITE_ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY

      const res = await request(createApp())
        .post('/api/theme/generate')
        .send({ description: 'A nice theme' })

      expect(res.status).toBe(503)

      if (savedVite)  process.env.VITE_ANTHROPIC_API_KEY = savedVite
      if (savedPlain) process.env.ANTHROPIC_API_KEY       = savedPlain
    })
  })
})
