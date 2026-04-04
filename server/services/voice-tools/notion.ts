import { getCachedSchema } from '../schema-cache.js'
import { loadMemory, saveMemory } from '../memory.js'
import { broadcast } from '../../ws.js'
import type { VoiceTool } from './_types.js'

export const notionTools: VoiceTool[] = [
  {
    definition: {
      name:        'add_notion_item',
      description: 'Add an item to a Notion-backed widget (tasks, grocery list, etc.). Use get_board_state first to find the databaseId in the widget settings.',
      input_schema: {
        type: 'object' as const,
        properties: {
          databaseId: { type: 'string', description: 'Notion database ID from widget settings' },
          title:      { type: 'string', description: 'Item text to add' },
        },
        required: ['databaseId', 'title'],
      },
    },
    execute: async (input, { notion }) => {
      const { databaseId, title } = input as { databaseId: string; title: string }
      await notion.pages.create({
        parent:     { database_id: databaseId },
        properties: { Name: { title: [{ text: { content: title } }] } },
      })
      broadcast({ type: 'notion_invalidate', databaseId })
      return `Added "${title}"`
    },
  },

  {
    definition: {
      name:        'check_off_item',
      description: 'Mark a Notion task or item as done.',
      input_schema: {
        type: 'object' as const,
        properties: {
          pageId: { type: 'string', description: 'Notion page ID of the item' },
        },
        required: ['pageId'],
      },
    },
    execute: async (input, { notion }) => {
      await notion.pages.update({
        page_id:    input.pageId,
        properties: { Status: { status: { name: 'Done' } } },
      })
      broadcast({ type: 'notion_invalidate', databaseId: input.databaseId ?? null })
      return `Checked off item ${input.pageId}`
    },
  },

  {
    definition: {
      name:        'query_notion_database',
      description: 'Search for entries in a Notion database by title/name or filter by a property value. Returns matching page IDs and their key properties so you can identify which entry to update or reference.',
      input_schema: {
        type: 'object' as const,
        properties: {
          databaseId:     { type: 'string' },
          search:         { type: 'string', description: 'Text to search for in the title field (partial match)' },
          filterProperty: { type: 'string', description: 'Property name to filter by' },
          filterValue:    { type: 'string', description: 'Value that property must equal' },
          limit:          { type: 'number', description: 'Max results to return (default 10)' },
        },
        required: ['databaseId'],
      },
    },
    execute: async (input, { notion }) => {
      const { databaseId, search, filterProperty, filterValue, limit = 10 } = input as {
        databaseId: string; search?: string; filterProperty?: string; filterValue?: string; limit?: number
      }
      const filter: any = (() => {
        if (filterProperty && filterValue) {
          return {
            or: [
              { property: filterProperty, status:    { equals: filterValue } },
              { property: filterProperty, select:    { equals: filterValue } },
              { property: filterProperty, rich_text: { contains: filterValue } },
            ],
          }
        }
        return undefined
      })()

      const response  = await notion.databases.query({ database_id: databaseId, filter, page_size: limit })
      const props     = await getCachedSchema(notion, databaseId)
      const titleProp = props.find((p) => p.type === 'title')?.name ?? 'Name'

      const results = (response.results as any[])
        .map((page: any) => {
          const titleArr = page.properties?.[titleProp]?.title as any[]
          const title    = titleArr?.map((t: any) => t.plain_text).join('') ?? '(untitled)'
          const fields: Record<string, string> = {}
          for (const [key, val] of Object.entries(page.properties as any)) {
            if (key === titleProp) continue
            const v = val as any
            if (v.type === 'status')     fields[key] = v.status?.name ?? ''
            else if (v.type === 'select')    fields[key] = v.select?.name ?? ''
            else if (v.type === 'checkbox')  fields[key] = String(v.checkbox)
            else if (v.type === 'date')      fields[key] = v.date?.start ?? ''
            else if (v.type === 'number')    fields[key] = String(v.number ?? '')
            else if (v.type === 'rich_text') fields[key] = v.rich_text?.map((r: any) => r.plain_text).join('') ?? ''
          }
          return { id: page.id, title, ...fields }
        })
        .filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase()))

      if (!results.length) return 'No matching entries found.'
      return JSON.stringify(results)
    },
  },

  {
    definition: {
      name:        'update_notion_entry',
      description: 'Update properties of an existing Notion page/entry. Use query_notion_database first to find the page ID. Accepts plain key-value pairs — the server maps them to the correct Notion property format automatically.',
      input_schema: {
        type: 'object' as const,
        properties: {
          pageId:     { type: 'string', description: 'Notion page ID of the entry to update' },
          databaseId: { type: 'string', description: 'Database ID (needed to look up the schema for type mapping)' },
          data: {
            type: 'object',
            description: 'Key-value pairs of properties to update. E.g. { "Status": "In progress", "Due": "2026-04-10" }',
          },
        },
        required: ['pageId', 'databaseId', 'data'],
      },
    },
    execute: async (input, { notion }) => {
      const { pageId, databaseId, data } = input as { pageId: string; databaseId: string; data: Record<string, any> }
      const props = await getCachedSchema(notion, databaseId)
      const properties: Record<string, any> = {}

      for (const [key, value] of Object.entries(data)) {
        const prop = props.find((p) => p.name === key)
        if (!prop) continue
        switch (prop.type) {
          case 'title':        properties[key] = { title:        [{ text: { content: String(value) } }] }; break
          case 'rich_text':    properties[key] = { rich_text:    [{ text: { content: String(value) } }] }; break
          case 'number':       properties[key] = { number:       Number(value) };                           break
          case 'checkbox':     properties[key] = { checkbox:     Boolean(value) };                          break
          case 'date':         properties[key] = { date:         { start: String(value) } };                break
          case 'select':       properties[key] = { select:       { name: String(value) } };                 break
          case 'status':       properties[key] = { status:       { name: String(value) } };                 break
          case 'multi_select': properties[key] = { multi_select: (Array.isArray(value) ? value : [value]).map((v: any) => ({ name: String(v) })) }; break
          case 'url':          properties[key] = { url:          String(value) };                           break
        }
      }

      await notion.pages.update({ page_id: pageId, properties })
      broadcast({ type: 'notion_invalidate', databaseId })
      return `Updated entry ${pageId}`
    },
  },

  {
    definition: {
      name:        'list_notion_databases',
      description: 'List all Notion databases accessible to this integration.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async (_input, { notion }) => {
      const response = await notion.search({ filter: { value: 'database', property: 'object' } })
      return JSON.stringify((response.results as any[]).map((db: any) => ({
        id:    db.id,
        title: db.title?.[0]?.plain_text ?? 'Untitled',
      })))
    },
  },

  {
    definition: {
      name:        'get_notion_database',
      description: 'Get the schema (properties and their types) of a specific Notion database.',
      input_schema: {
        type: 'object' as const,
        properties: {
          databaseId: { type: 'string' },
        },
        required: ['databaseId'],
      },
    },
    execute: async (input, { notion }) => {
      const props = await getCachedSchema(notion, input.databaseId)
      return JSON.stringify({ id: input.databaseId, properties: props })
    },
  },

  {
    definition: {
      name:        'create_notion_database',
      description: 'Create a new Notion database with a custom schema. Returns the database ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:      { type: 'string', description: 'Database name' },
          properties: {
            type: 'object',
            description: 'Notion property definitions. Always include a "Name" title property. Example: { "Name": { "title": {} }, "Date": { "date": {} }, "Amount": { "number": {} }, "Status": { "select": { "options": [{ "name": "Todo", "color": "red" }, { "name": "Done", "color": "green" }] } } }',
          },
        },
        required: ['title', 'properties'],
      },
    },
    execute: async (input) => {
      const port   = Number(process.env.PORT) || 3001
      const result = await fetch(`http://localhost:${port}/api/notion/databases`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: input.title, properties: input.properties }),
      }).then((r) => r.json()) as { id?: string; error?: string }
      if (result.error) return `Failed to create database: ${result.error}`
      return `Created database "${input.title}" (id: ${result.id})`
    },
  },

  {
    definition: {
      name:        'delete_notion_page',
      description: 'Archive (delete) a Notion page/entry by page ID. Use query_notion_database first to find the page ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          pageId:     { type: 'string', description: 'The Notion page ID to archive' },
          databaseId: { type: 'string', description: 'Optional: the parent database ID, used to invalidate the cache after deletion' },
        },
        required: ['pageId'],
      },
    },
    execute: async (input) => {
      const { pageId, databaseId } = input as { pageId: string; databaseId?: string }
      const port = Number(process.env.PORT) || 3001
      await fetch(`http://localhost:${port}/api/pages/${pageId}`, { method: 'DELETE' })
      if (databaseId) broadcast({ type: 'notion_invalidate', databaseId })
      return `Deleted page ${pageId}`
    },
  },

  {
    definition: {
      name:        'delete_notion_database',
      description: 'Archive (delete) an entire Notion database by database ID. This removes the database and all its entries. Use with caution.',
      input_schema: {
        type: 'object' as const,
        properties: {
          databaseId: { type: 'string', description: 'The Notion database ID to archive' },
        },
        required: ['databaseId'],
      },
    },
    execute: async (input) => {
      const { databaseId } = input as { databaseId: string }
      const port = Number(process.env.PORT) || 3001
      await fetch(`http://localhost:${port}/api/databases/${databaseId}`, { method: 'DELETE' })
      broadcast({ type: 'notion_invalidate' })
      return `Deleted database ${databaseId}`
    },
  },

  {
    definition: {
      name:        'add_notion_entry',
      description: 'Add an entry to any Notion database using plain key-value pairs. The server automatically maps values to the correct Notion property format based on the database schema.',
      input_schema: {
        type: 'object' as const,
        properties: {
          databaseId: { type: 'string' },
          data: {
            type: 'object',
            description: 'Plain key-value pairs matching the database property names. E.g. { "Name": "Bench Press", "Date": "2026-03-30", "Sets": 3, "Reps": 10, "Weight": 135 }',
          },
        },
        required: ['databaseId', 'data'],
      },
    },
    execute: async (input) => {
      const port   = Number(process.env.PORT) || 3001
      const result = await fetch(`http://localhost:${port}/api/databases/${input.databaseId}/smart-entry`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: input.data }),
      }).then((r) => r.json()) as { id?: string; error?: string }
      if (result.error) return `Failed to add entry: ${result.error}`
      broadcast({ type: 'notion_invalidate', databaseId: input.databaseId })
      return `Added entry to database`
    },
  },

  {
    definition: {
      name:        'read_notion_items',
      description: 'Fetch and read out items from a Notion database — tasks, grocery list, habits, etc. Returns a spoken-friendly list of the open/pending items. Filter to only incomplete items unless the user asks for all.',
      input_schema: {
        type: 'object' as const,
        properties: {
          databaseId:   { type: 'string', description: 'Notion database ID' },
          statusFilter: { type: 'string', description: 'Optional: only return items with this status, e.g. "Not started" or "In progress". Omit to get all non-done items.' },
          limit:        { type: 'number', description: 'Max items to return (default 10)' },
        },
        required: ['databaseId'],
      },
    },
    execute: async (input, { notion }) => {
      const { databaseId, statusFilter, limit = 10 } = input as { databaseId: string; statusFilter?: string; limit?: number }
      try {
        const props        = await getCachedSchema(notion, databaseId)
        const titleProp    = props.find((p) => p.type === 'title')
        const statusProp   = props.find((p) => p.type === 'status' || p.type === 'select')
        const checkboxProp = props.find((p) => p.type === 'checkbox')

        let filter: any = undefined
        if (statusFilter && statusProp) {
          filter = { property: statusProp.name, [statusProp.type]: { equals: statusFilter } }
        } else if (statusProp) {
          const doneOptions = ['Done', 'Completed', 'Complete', 'Closed', 'Archived']
          const doneOption  = (statusProp.options ?? []).find((o: string) => doneOptions.includes(o))
          if (doneOption) {
            filter = { property: statusProp.name, [statusProp.type]: { does_not_equal: doneOption } }
          }
        } else if (checkboxProp) {
          filter = { property: checkboxProp.name, checkbox: { equals: false } }
        }

        const response = await notion.databases.query({ database_id: databaseId, filter, page_size: limit })
        const titleKey = titleProp?.name ?? 'Name'
        const items = (response.results as any[]).map((page: any) => {
          const titleArr = page.properties?.[titleKey]?.title as any[]
          return titleArr?.map((t: any) => t.plain_text).join('') ?? '(untitled)'
        }).filter(Boolean)

        if (!items.length) return 'No items found.'
        return items.map((t, i) => `${i + 1}. ${t}`).join('. ')
      } catch (e: any) {
        return `Failed to read items: ${e.message}`
      }
    },
  },

  {
    definition: {
      name:        'quick_list_add',
      description: 'Add an item to a named list (shopping list, grocery list, to-do, etc.) by list name. Looks up the Notion database from memory automatically — no need to know the database ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          listName: { type: 'string', description: 'Name of the list, e.g. "shopping list", "groceries", "tasks". Matched case-insensitively against known databases in memory.' },
          item:     { type: 'string', description: 'The item to add.' },
        },
        required: ['listName', 'item'],
      },
    },
    execute: async (input, { notion }) => {
      const { listName, item } = input as { listName: string; item: string }
      const mem   = loadMemory()
      const entry = Object.entries(mem.databases).find(([k]) =>
        k.toLowerCase().includes(listName.toLowerCase()) ||
        listName.toLowerCase().includes(k.toLowerCase())
      )
      let databaseId: string
      let dbLabel: string

      if (!entry) {
        const port   = Number(process.env.PORT) || 3001
        const title  = listName.charAt(0).toUpperCase() + listName.slice(1)
        const result = await fetch(`http://localhost:${port}/api/notion/databases`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            title,
            properties: {
              Name: { title: {} },
              Done: { checkbox: {} },
            },
          }),
        }).then((r) => r.json()) as { id?: string; error?: string }
        if (result.error || !result.id) return `Could not create "${listName}" list: ${result.error ?? 'unknown error'}`
        databaseId = result.id
        dbLabel    = title
        mem.databases[dbLabel] = databaseId
        saveMemory(mem)
      } else {
        ;[dbLabel, databaseId] = entry
      }

      await notion.pages.create({
        parent:     { database_id: databaseId },
        properties: { Name: { title: [{ text: { content: item } }] } },
      })
      broadcast({ type: 'notion_invalidate', databaseId })
      return entry ? `Added "${item}" to ${dbLabel}` : `Created "${dbLabel}" list and added "${item}"`
    },
  },

  {
    definition: {
      name:        'set_notion_workspace_page',
      description: 'Set the Notion parent page where new databases will be created. Ask the user for a Notion page URL or ID if not already configured.',
      input_schema: {
        type: 'object' as const,
        properties: {
          pageId: { type: 'string', description: 'Notion page ID (32-char hex or full URL)' },
        },
        required: ['pageId'],
      },
    },
    execute: async (input) => {
      const raw    = String(input.pageId).trim()
      const match  = raw.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
      const pageId = match ? match[1].replace(/-/g, '') : raw
      const port   = Number(process.env.PORT) || 3001
      await fetch(`http://localhost:${port}/api/notion/workspace-page`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pageId }),
      })
      return `Workspace page set to ${pageId}`
    },
  },
]
