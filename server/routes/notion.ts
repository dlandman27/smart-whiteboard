import { Router } from 'express'
import { Client } from '@notionhq/client'
import { loadCredential, saveCredential } from '../services/credentials.js'
import { loadOAuthTokens, saveOAuthTokens, deleteOAuthTokens } from '../services/credentials.js'
import { AppError, asyncRoute } from '../middleware/error.js'

const NOTION_CLIENT_ID     = process.env.NOTION_OAUTH_CLIENT_ID
const NOTION_CLIENT_SECRET = process.env.NOTION_OAUTH_CLIENT_SECRET
const NOTION_REDIRECT_URI  = process.env.NOTION_REDIRECT_URI ?? 'http://localhost:3001/api/notion/callback'

// Short-lived map: OAuth state → userId (for callback)
const pendingOAuth = new Map<string, string>()

/**
 * Get a per-user Notion client.
 * Priority: OAuth token → user API key credential → global NOTION_API_KEY env var.
 */
export async function getNotionClient(userId: string): Promise<Client | null> {
  // 1. Try user's OAuth token first
  const tokens = await loadOAuthTokens(userId, 'notion')
  if (tokens?.access_token) return new Client({ auth: tokens.access_token })

  // 2. Try user's stored API key
  const cred = await loadCredential(userId, 'notion')
  if (cred?.api_key) return new Client({ auth: cred.api_key })

  // 3. Fall back to global API key
  if (process.env.NOTION_API_KEY) return new Client({ auth: process.env.NOTION_API_KEY })

  return null
}

async function requireNotion(userId: string): Promise<Client> {
  const client = await getNotionClient(userId)
  if (!client) throw new AppError(401, 'Notion not connected — connect via OAuth or add your API key in Connectors')
  return client
}

export function notionRouter(): Router {
  const router = Router()

  router.get('/health', asyncRoute(async (req, res) => {
    // Unauthenticated callers only get a basic health check
    if (!req.userId) {
      res.json({ ok: true })
      return
    }

    const hasGlobalKey = !!process.env.NOTION_API_KEY
    const userCred = await loadCredential(req.userId, 'notion')
    const userOAuth = await loadOAuthTokens(req.userId, 'notion')
    const notionConfigured = hasGlobalKey || !!userCred?.api_key || !!userOAuth?.access_token

    res.json({
      ok:         true,
      configured: notionConfigured,
      services: {
        notion:      notionConfigured,
        notionOauth: !!(NOTION_CLIENT_ID && NOTION_CLIENT_SECRET),
        anthropic:   !!process.env.ANTHROPIC_API_KEY,
        elevenlabs:  !!process.env.ELEVENLABS_API_KEY,
        youtube:     !!process.env.YOUTUBE_API_KEY,
        bing:        !!process.env.BING_API_KEY,
        googleOauth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
    })
  }))

  // ── Notion OAuth status ──────────────────────────────────────────────────

  router.get('/notion/status', asyncRoute(async (req, res) => {
    const oauthTokens = await loadOAuthTokens(req.userId!, 'notion')
    const userCred    = await loadCredential(req.userId!, 'notion')
    const hasOAuth    = !!oauthTokens?.access_token
    const hasApiKey   = !!userCred?.api_key || !!process.env.NOTION_API_KEY
    res.json({
      connected:  hasOAuth || hasApiKey,
      method:     hasOAuth ? 'oauth' : hasApiKey ? 'api_key' : null,
      configured: !!(NOTION_CLIENT_ID && NOTION_CLIENT_SECRET),
      workspace_name: oauthTokens?.refresh_token ?? null,  // we store workspace_name in refresh_token field
    })
  }))

  // ── Connect (start OAuth) ─────────────────────────────────────────────────

  router.post('/notion/connect', (req, res) => {
    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      throw new AppError(500, 'Notion OAuth credentials not configured on the server. Set NOTION_OAUTH_CLIENT_ID and NOTION_OAUTH_CLIENT_SECRET in .env')
    }
    const state = crypto.randomUUID()
    pendingOAuth.set(state, req.userId!)
    // Clean up after 10 minutes
    setTimeout(() => pendingOAuth.delete(state), 10 * 60_000)

    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${encodeURIComponent(NOTION_CLIENT_ID)}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}&state=${state}`
    res.json({ url })
  })

  // ── OAuth callback ────────────────────────────────────────────────────────

  router.get('/notion/callback', asyncRoute(async (req, res) => {
    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      throw new AppError(500, 'Notion OAuth credentials not configured')
    }
    if (req.query.error) {
      throw new AppError(400, `Notion OAuth error: ${req.query.error}`)
    }

    const state  = req.query.state as string
    const userId = pendingOAuth.get(state)
    if (!userId) {
      throw new AppError(400, 'Invalid or expired OAuth state. Please try connecting again.')
    }
    pendingOAuth.delete(state)

    const code = req.query.code as string
    const basicAuth = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')

    let tokenData: any
    try {
      const resp = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          grant_type:   'authorization_code',
          code,
          redirect_uri: NOTION_REDIRECT_URI,
        }),
      })
      tokenData = await resp.json()
      if (!resp.ok) {
        throw new Error(tokenData?.error ?? 'Token exchange failed')
      }
    } catch (e: any) {
      throw new AppError(500, `Failed to exchange code: ${e?.message ?? 'unknown error'}`)
    }

    await saveOAuthTokens(userId, 'notion', {
      access_token:  tokenData.access_token,
      // Store workspace_name in refresh_token field (Notion tokens are permanent, no refresh needed)
      refresh_token: tokenData.workspace_name ?? undefined,
    })

    const workspaceName = tokenData.workspace_name ?? 'Notion'
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connected</title></head>
        <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4;color:#166534">
          <div style="text-align:center;padding:32px">
            <div style="font-size:52px;margin-bottom:12px">&#10003;</div>
            <h2 style="margin:0 0 8px;font-size:20px">Notion connected!</h2>
            <p style="margin:0;color:#555;font-size:14px">Workspace: ${workspaceName}</p>
            <p style="margin:8px 0 0;color:#555;font-size:14px">You can close this window.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'notion-connected' }, window.location.origin)
              setTimeout(() => window.close(), 800)
            }
          </script>
        </body>
      </html>
    `)
  }))

  // ── Disconnect ────────────────────────────────────────────────────────────

  router.post('/notion/disconnect', asyncRoute(async (req, res) => {
    await deleteOAuthTokens(req.userId!, 'notion')
    res.json({ ok: true })
  }))

  router.get('/databases', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    const response = await notion.search({
      filter:    { value: 'database', property: 'object' },
      sort:      { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 100,
    })
    res.json(response)
  }))

  router.get('/databases/:id', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    res.json(await notion.databases.retrieve({ database_id: req.params.id }))
  }))

  router.post('/databases/:id/query', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    const response = await notion.databases.query({
      database_id: req.params.id,
      sorts:       req.body.sorts,
      filter:      req.body.filter,
      page_size:   req.body.page_size ?? 50,
    })
    res.json(response)
  }))

  router.post('/databases/:id/pages', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    res.json(await notion.pages.create({
      parent:     { database_id: req.params.id },
      properties: req.body.properties,
    }))
  }))

  router.post('/databases/:id/smart-entry', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    const db   = await notion.databases.retrieve({ database_id: req.params.id })
    const data = req.body.data as Record<string, any>
    const props: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      const prop = (db.properties as any)[key]
      if (!prop) continue
      switch (prop.type) {
        case 'title':        props[key] = { title:        [{ text: { content: String(value) } }] }; break
        case 'rich_text':    props[key] = { rich_text:    [{ text: { content: String(value) } }] }; break
        case 'number':       props[key] = { number:       Number(value) };                           break
        case 'checkbox':     props[key] = { checkbox:     Boolean(value) };                          break
        case 'date':         props[key] = { date:         { start: String(value) } };                break
        case 'select':       props[key] = { select:       { name: String(value) } };                 break
        case 'status':       props[key] = { status:       { name: String(value) } };                 break
        case 'multi_select': props[key] = { multi_select: (Array.isArray(value) ? value : [value]).map((v: any) => ({ name: String(v) })) }; break
        case 'url':          props[key] = { url:          String(value) };                           break
        case 'email':        props[key] = { email:        String(value) };                           break
        case 'phone_number': props[key] = { phone_number: String(value) };                           break
      }
    }

    res.json(await notion.pages.create({ parent: { database_id: req.params.id }, properties: props }))
  }))

  router.patch('/pages/:id', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    res.json(await notion.pages.update({ page_id: req.params.id, properties: req.body.properties }))
  }))

  router.delete('/pages/:id', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    res.json(await notion.pages.update({ page_id: req.params.id, archived: true }))
  }))

  router.delete('/databases/:id', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    res.json(await (notion as any).databases.update({ database_id: req.params.id, archived: true }))
  }))

  router.get('/notion/workspace-page', asyncRoute(async (req, res) => {
    const cred = await loadCredential(req.userId!, 'notion')
    const pageId = cred?.redirect_uri ?? process.env.NOTION_PARENT_PAGE_ID ?? null
    // Note: we repurpose redirect_uri field to store the workspace page ID for Notion
    res.json({ pageId })
  }))

  router.post('/notion/workspace-page', asyncRoute(async (req, res) => {
    const { pageId } = req.body
    if (!pageId) throw new AppError(400, 'pageId required')
    // Store workspace page in the credential's redirect_uri field
    const existing = await loadCredential(req.userId!, 'notion')
    await saveCredential(req.userId!, 'notion', {
      ...existing,
      redirect_uri: pageId,
    })
    res.json({ ok: true })
  }))

  router.post('/notion/databases', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    const cred = await loadCredential(req.userId!, 'notion')
    const { title, properties } = req.body
    const parentPageId = req.body.parentPageId
      ?? cred?.redirect_uri
      ?? process.env.NOTION_PARENT_PAGE_ID

    if (!parentPageId) {
      throw new AppError(400, 'No Notion parent page configured. Use set_notion_workspace_page to set one.', 'MISSING_PARENT_PAGE')
    }

    const db = await notion.databases.create({
      parent:     { type: 'page_id', page_id: parentPageId },
      title:      [{ type: 'text', text: { content: title } }],
      properties: properties,
    } as any)
    res.json({ id: db.id })
  }))

  router.get('/pages/:id/blocks', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    res.json(await notion.blocks.children.list({ block_id: req.params.id, page_size: 100 }))
  }))

  router.patch('/blocks/:id', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    res.json(await notion.blocks.update({ block_id: req.params.id, ...req.body }))
  }))

  router.post('/doc', asyncRoute(async (req, res) => {
    const notion = await requireNotion(req.userId!)
    const cred = await loadCredential(req.userId!, 'notion')
    const parentPageId: string | undefined =
      req.body.parentPageId
      ?? cred?.redirect_uri
      ?? process.env.NOTION_PARENT_PAGE_ID

    if (!parentPageId) {
      throw new AppError(400, 'No Notion parent page configured. Set NOTION_PARENT_PAGE_ID or use set_notion_workspace_page.', 'MISSING_PARENT_PAGE')
    }

    const { title, content } = req.body as { title: string; content: string }
    if (!title) throw new AppError(400, 'title is required')

    const blocks: any[] = []
    const lines = (content ?? '').split('\n')
    let inCode = false
    let codeLang = ''
    let codeLines: string[] = []

    for (const raw of lines) {
      const line = raw

      if (line.startsWith('```')) {
        if (!inCode) {
          inCode = true
          codeLang = line.slice(3).trim() || 'plain text'
          codeLines = []
        } else {
          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              language: codeLang,
              rich_text: [{ type: 'text', text: { content: codeLines.join('\n') } }],
            },
          })
          inCode = false
          codeLines = []
        }
        continue
      }

      if (inCode) { codeLines.push(line); continue }

      if (line.startsWith('### ')) {
        blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4) } }] } })
      } else if (line.startsWith('## ')) {
        blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3) } }] } })
      } else if (line.startsWith('# ')) {
        blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } })
      } else if (line.match(/^[-*] /)) {
        blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } })
      } else if (line.match(/^\d+\. /)) {
        blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ type: 'text', text: { content: line.replace(/^\d+\. /, '') } }] } })
      } else if (line.match(/^---+$/)) {
        blocks.push({ object: 'block', type: 'divider', divider: {} })
      } else if (line.trim() === '') {
        // skip
      } else {
        blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: line } }] } })
      }
    }

    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: parentPageId },
      properties: {
        title: { title: [{ type: 'text', text: { content: title } }] },
      },
      children: blocks.slice(0, 100),
    } as any)

    if (blocks.length > 100) {
      await notion.blocks.children.append({
        block_id: page.id,
        children: blocks.slice(100, 200),
      } as any)
    }

    res.json({ id: page.id, url: (page as any).url })
  }))

  return router
}
