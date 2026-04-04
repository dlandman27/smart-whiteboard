import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { broadcast, getWidgets, getCanvas } from '../ws.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function canvasRouter(): Router {
  const router = Router()

  router.get('/canvas/widgets', (_req, res) => {
    res.json({ widgets: getWidgets(), canvas: getCanvas() })
  })

  router.post('/canvas/widget', (req, res) => {
    const id = crypto.randomUUID()
    broadcast({ type: 'create_widget', id, ...req.body })
    res.json({ id })
  })

  router.patch('/canvas/widget/:id', (req, res) => {
    broadcast({ type: 'update_widget', id: req.params.id, ...req.body })
    res.json({ ok: true })
  })

  router.delete('/canvas/widget/:id', (req, res) => {
    broadcast({ type: 'delete_widget', id: req.params.id })
    res.json({ ok: true })
  })

  router.post('/canvas/clear-widgets', (_req, res) => {
    broadcast({ type: 'clear_widgets' })
    res.json({ ok: true })
  })

  router.post('/canvas/layout', (req, res) => {
    const { slots } = req.body
    if (!Array.isArray(slots)) throw new AppError(400, 'slots must be an array')
    broadcast({ type: 'set_custom_layout', slots })
    res.json({ ok: true })
  })

  router.post('/canvas/focus-widget', (req, res) => {
    const { id } = req.body
    if (id) broadcast({ type: 'focus_widget', id })
    else    broadcast({ type: 'unfocus_widget' })
    res.json({ ok: true })
  })

  router.post('/canvas/theme', (req, res) => {
    broadcast({ type: 'set_theme', themeId: req.body.themeId })
    res.json({ ok: true })
  })

  router.post('/canvas/custom-theme', (req, res) => {
    broadcast({ type: 'set_custom_theme', vars: req.body.vars ?? {}, background: req.body.background })
    res.json({ ok: true })
  })

  router.post('/theme/generate', asyncRoute(async (req, res) => {
    const { description } = req.body as { description?: string }
    if (!description?.trim()) throw new AppError(400, 'description required')

    const apiKey = process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new AppError(503, 'ANTHROPIC_API_KEY not set', 'MISSING_CONFIG')

    const themeAnthropic = new Anthropic({ apiKey })
    const msg = await themeAnthropic.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages:   [{
        role:    'user',
        content: `Generate a whiteboard theme based on this description: "${description}"

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "name": "Theme Name",
  "dark": true or false,
  "background": { "label": "...", "bg": "#hex", "dot": "#hex" },
  "vars": {
    "widgetBg": "#hex",
    "widgetBorder": "#hex or rgba(...)",
    "widgetBorderActive": "#hex",
    "shadowSm": "0 1px 3px rgba(...)",
    "shadowMd": "0 4px 12px rgba(...)",
    "shadowLg": "0 20px 40px rgba(...)",
    "backdropFilter": "none",
    "textPrimary": "#hex",
    "textMuted": "#hex",
    "surfaceSubtle": "#hex",
    "surfaceHover": "#hex",
    "surfaceDanger": "#hex",
    "accent": "#hex",
    "accentText": "#hex",
    "danger": "#hex",
    "actionBg": "#hex",
    "actionBorder": "#hex",
    "settingsBg": "#hex",
    "settingsBorder": "#hex",
    "settingsDivider": "#hex",
    "settingsLabel": "#hex",
    "scrollThumb": "#hex",
    "clockFaceFill": "#hex",
    "clockFaceStroke": "#hex",
    "clockTickMajor": "#hex",
    "clockTickMinor": "#hex",
    "clockHands": "#hex",
    "clockSecond": "#hex",
    "clockCenter": "#hex",
    "noteDefaultBg": "#hex"
  }
}`,
      }],
    })

    const raw  = (msg.content[0] as any).text as string
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim())
    broadcast({ type: 'set_custom_theme', vars: json.vars, background: json.background })
    res.json({ ok: true, theme: json })
  }))

  return router
}
