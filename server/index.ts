import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Client } from '@notionhq/client'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// Health check + config status
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: !!process.env.NOTION_API_KEY,
  })
})

// Search for all databases accessible to the integration
app.get('/api/databases', async (_req, res) => {
  try {
    const response = await notion.search({
      filter: { value: 'database', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 100,
    })
    res.json(response)
  } catch (error: any) {
    console.error('Error fetching databases:', error.message)
    res.status(500).json({ error: error.message, code: error.code })
  }
})

// Get a single database (metadata + properties)
app.get('/api/databases/:id', async (req, res) => {
  try {
    const database = await notion.databases.retrieve({ database_id: req.params.id })
    res.json(database)
  } catch (error: any) {
    console.error('Error fetching database:', error.message)
    res.status(500).json({ error: error.message, code: error.code })
  }
})

// Query database entries
app.post('/api/databases/:id/query', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: req.params.id,
      sorts: req.body.sorts,
      filter: req.body.filter,
      page_size: req.body.page_size ?? 50,
    })
    res.json(response)
  } catch (error: any) {
    console.error('Error querying database:', error.message)
    res.status(500).json({ error: error.message, code: error.code })
  }
})

// Create a new page in a database
app.post('/api/databases/:id/pages', async (req, res) => {
  try {
    const response = await notion.pages.create({
      parent: { database_id: req.params.id },
      properties: req.body.properties,
    })
    res.json(response)
  } catch (error: any) {
    console.error('Error creating page:', error.message)
    res.status(500).json({ error: error.message, code: error.code })
  }
})

// Update a page's properties
app.patch('/api/pages/:id', async (req, res) => {
  try {
    const response = await notion.pages.update({
      page_id: req.params.id,
      properties: req.body.properties,
    })
    res.json(response)
  } catch (error: any) {
    console.error('Error updating page:', error.message)
    res.status(500).json({ error: error.message, code: error.code })
  }
})

// Archive (soft-delete) a page
app.delete('/api/pages/:id', async (req, res) => {
  try {
    const response = await notion.pages.update({
      page_id: req.params.id,
      archived: true,
    })
    res.json(response)
  } catch (error: any) {
    console.error('Error archiving page:', error.message)
    res.status(500).json({ error: error.message, code: error.code })
  }
})

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`\n🗂  Smart Whiteboard server running on http://localhost:${PORT}`)
  if (!process.env.NOTION_API_KEY) {
    console.warn('⚠️  NOTION_API_KEY is not set — copy .env.example to .env and add your key')
  } else {
    console.log('✅  Notion API key loaded')
  }
})
