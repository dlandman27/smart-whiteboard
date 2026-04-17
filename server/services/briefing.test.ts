import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock: memory ─────────────────────────────────────────────────────────────
vi.mock('./memory.js', () => ({
  loadMemory: vi.fn(),
}))

// ── Mock: gcal ────────────────────────────────────────────────────────────────
vi.mock('./gcal.js', () => ({
  getGCalClient: vi.fn(),
}))

// ── Mock: schema-cache ────────────────────────────────────────────────────────
vi.mock('./schema-cache.js', () => ({
  getCachedSchema: vi.fn(),
}))

// ── Hoisted mock for @anthropic-ai/sdk ───────────────────────────────────────
const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  return { mockCreate }
})

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    messages = { create: mockCreate }
    constructor(_opts?: any) {}
  }
  return { default: Anthropic }
})

// ── Mock: googleapis ─────────────────────────────────────────────────────────
const { mockEventsList } = vi.hoisted(() => {
  const mockEventsList = vi.fn()
  return { mockEventsList }
})

vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn(() => ({
      events: { list: mockEventsList },
    })),
    auth: { OAuth2: vi.fn() },
  },
}))

import { loadMemory } from './memory.js'
import { getGCalClient } from './gcal.js'
import { getCachedSchema } from './schema-cache.js'
import { compileBriefing } from './briefing.js'

const mockMemory      = loadMemory      as ReturnType<typeof vi.fn>
const mockGCalClient  = getGCalClient   as ReturnType<typeof vi.fn>
const mockSchemaCache = getCachedSchema as ReturnType<typeof vi.fn>

// Minimal memory fixture
const BASE_MEMORY = {
  name:        'Dylan',
  location:    'Jersey City',
  preferences: [],
  facts:       [],
  databases:   {},
}

// Minimal Notion client mock
function makeNotion(queryResult: any = { results: [] }) {
  return {
    databases: {
      retrieve: vi.fn().mockResolvedValue({ properties: {} }),
      query:    vi.fn().mockResolvedValue(queryResult),
    },
  } as any
}

beforeEach(() => {
  vi.clearAllMocks()

  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
  delete process.env.VITE_ANTHROPIC_API_KEY

  // Default memory — no databases
  mockMemory.mockReturnValue(BASE_MEMORY)

  // No GCal by default
  mockGCalClient.mockResolvedValue(null)

  // Default Anthropic response
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: 'Good morning, Dylan! Here is your briefing.' }],
  })

  // Stub fetch for weather + sports APIs
  vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
    const u = String(url)
    if (u.includes('geocoding-api.open-meteo.com')) {
      return { json: () => Promise.resolve({ results: [{ latitude: 40.71, longitude: -74.04 }] }) } as any
    }
    if (u.includes('api.open-meteo.com')) {
      return { json: () => Promise.resolve({ current: { temperature_2m: 72, weathercode: 1 } }) } as any
    }
    if (u.includes('espn.com')) {
      return { json: () => Promise.resolve({ events: [] }) } as any
    }
    return { json: () => Promise.resolve({}) } as any
  })
})

// ──────────────────────────────────────────────────────────────────────────────
describe('compileBriefing', () => {
  it('returns a string (the briefing text)', async () => {
    const notion = makeNotion()
    const result = await compileBriefing(notion)
    expect(typeof result).toBe('string')
    expect(result).toBe('Good morning, Dylan! Here is your briefing.')
  })

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.VITE_ANTHROPIC_API_KEY
    const notion = makeNotion()
    await expect(compileBriefing(notion)).rejects.toThrow('ANTHROPIC_API_KEY not set')
  })

  it('calls Anthropic messages.create with the correct model', async () => {
    const notion = makeNotion()
    await compileBriefing(notion)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
    )
  })

  it('includes the user name from memory in the Anthropic prompt', async () => {
    mockMemory.mockReturnValue({ ...BASE_MEMORY, name: 'Alice' })
    const notion = makeNotion()
    await compileBriefing(notion)

    const [callArg] = mockCreate.mock.calls[0]
    const userContent = callArg.messages[0].content as string
    expect(userContent).toContain('Alice')
  })

  it('handles empty Notion databases gracefully (skips task block)', async () => {
    mockMemory.mockReturnValue({ ...BASE_MEMORY, databases: {} })
    const notion = makeNotion()
    await expect(compileBriefing(notion)).resolves.toBeTypeOf('string')
  })

  it('includes Notion tasks in the briefing when a task database exists', async () => {
    mockMemory.mockReturnValue({
      ...BASE_MEMORY,
      databases: { tasks: 'db-id-1' },
    })

    mockSchemaCache.mockResolvedValue([
      { name: 'Name',   type: 'title' },
      { name: 'Status', type: 'status', options: ['Todo', 'In Progress', 'Done'] },
    ])

    const notion = makeNotion({
      results: [
        { properties: { Name: { title: [{ plain_text: 'Fix bug' }] } } },
        { properties: { Name: { title: [{ plain_text: 'Write tests' }] } } },
      ],
    })

    await compileBriefing(notion)

    const [callArg] = mockCreate.mock.calls[0]
    const userContent = callArg.messages[0].content as string
    expect(userContent).toContain('Fix bug')
    expect(userContent).toContain('Write tests')
  })

  it('handles a Notion API error gracefully (skips the task block)', async () => {
    mockMemory.mockReturnValue({ ...BASE_MEMORY, databases: { tasks: 'db-id-err' } })
    mockSchemaCache.mockRejectedValue(new Error('Notion API error'))

    const notion = makeNotion()
    // try/catch in briefing.ts swallows Notion errors
    await expect(compileBriefing(notion)).resolves.toBeTypeOf('string')
  })

  it('includes GCal events when a calendar client is available', async () => {
    const fakeAuthClient = {}
    mockGCalClient.mockResolvedValue(fakeAuthClient)
    mockEventsList.mockResolvedValue({
      data: {
        items: [
          { summary: 'Team standup', start: { dateTime: new Date().toISOString() } },
        ],
      },
    })

    const notion = makeNotion()
    await compileBriefing(notion)

    const [callArg] = mockCreate.mock.calls[0]
    const userContent = callArg.messages[0].content as string
    expect(userContent).toContain('Team standup')
  })

  it('includes "No calendar events today" when GCal returns an empty list', async () => {
    const fakeAuthClient = {}
    mockGCalClient.mockResolvedValue(fakeAuthClient)
    mockEventsList.mockResolvedValue({ data: { items: [] } })

    const notion = makeNotion()
    await compileBriefing(notion)

    const [callArg] = mockCreate.mock.calls[0]
    const userContent = callArg.messages[0].content as string
    expect(userContent).toContain('No calendar events today')
  })
})
