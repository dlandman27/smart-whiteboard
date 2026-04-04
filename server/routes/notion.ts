import { Router } from 'express'
import type { Client } from '@notionhq/client'
import { loadTokens, saveTokens } from '../services/tokens.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function notionRouter(notion: Client): Router {
  const router = Router()

  router.get('/health', (_req, res) => {
    res.json({ ok: true, configured: !!process.env.NOTION_API_KEY })
  })

  router.get('/databases', asyncRoute(async (_req, res) => {
    const response = await notion.search({
      filter:    { value: 'database', property: 'object' },
      sort:      { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 100,
    })
    res.json(response)
  }))

  router.get('/databases/:id', asyncRoute(async (req, res) => {
    res.json(await notion.databases.retrieve({ database_id: req.params.id }))
  }))

  router.post('/databases/:id/query', asyncRoute(async (req, res) => {
    const response = await notion.databases.query({
      database_id: req.params.id,
      sorts:       req.body.sorts,
      filter:      req.body.filter,
      page_size:   req.body.page_size ?? 50,
    })
    res.json(response)
  }))

  router.post('/databases/:id/pages', asyncRoute(async (req, res) => {
    res.json(await notion.pages.create({
      parent:     { database_id: req.params.id },
      properties: req.body.properties,
    }))
  }))

  router.post('/databases/:id/smart-entry', asyncRoute(async (req, res) => {
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
    res.json(await notion.pages.update({ page_id: req.params.id, properties: req.body.properties }))
  }))

  router.delete('/pages/:id', asyncRoute(async (req, res) => {
    res.json(await notion.pages.update({ page_id: req.params.id, archived: true }))
  }))

  router.delete('/databases/:id', asyncRoute(async (req, res) => {
    res.json(await (notion as any).databases.update({ database_id: req.params.id, archived: true }))
  }))

  router.get('/notion/workspace-page', (_req, res) => {
    const tokens = loadTokens()
    const pageId = tokens?.notion_parent_page_id ?? process.env.NOTION_PARENT_PAGE_ID ?? null
    res.json({ pageId })
  })

  router.post('/notion/workspace-page', (req, res) => {
    const { pageId } = req.body
    if (!pageId) throw new AppError(400, 'pageId required')
    saveTokens({ notion_parent_page_id: pageId })
    res.json({ ok: true })
  })

  router.post('/notion/databases', asyncRoute(async (req, res) => {
    const tokens = loadTokens()
    const { title, properties } = req.body
    const parentPageId = req.body.parentPageId
      ?? tokens?.notion_parent_page_id
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
    res.json(await notion.blocks.children.list({ block_id: req.params.id, page_size: 100 }))
  }))

  router.patch('/blocks/:id', asyncRoute(async (req, res) => {
    res.json(await notion.blocks.update({ block_id: req.params.id, ...req.body }))
  }))

  return router
}
