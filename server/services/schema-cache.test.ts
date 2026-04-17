import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCachedSchema, invalidateSchema } from './schema-cache.js'

// schema-cache has no external dependencies (pure in-memory Map + Notion client arg)
// so we just need a mock Notion client.

function makeNotion(properties: Record<string, any> = {}) {
  return {
    databases: {
      retrieve: vi.fn().mockResolvedValue({ properties }),
    },
  } as any
}

// The module keeps a module-level Map, so we need to clear it between tests.
// We do that by invalidating every key we create, or by using unique IDs.

beforeEach(() => {
  vi.clearAllMocks()
  // Invalidate any db IDs used in previous tests to keep tests isolated
  invalidateSchema('db-1')
  invalidateSchema('db-2')
  invalidateSchema('db-ttl')
  invalidateSchema('db-select')
  invalidateSchema('db-multi')
  invalidateSchema('db-status')
  invalidateSchema('db-title')
})

// ──────────────────────────────────────────────────────────────────────────────
describe('getCachedSchema', () => {
  it('fetches from Notion on cache miss and returns mapped props', async () => {
    const notion = makeNotion({
      Name:   { type: 'title',  title: {} },
      Status: { type: 'status', status: { options: [{ name: 'Todo' }, { name: 'Done' }] } },
    })

    const props = await getCachedSchema(notion, 'db-1')

    expect(notion.databases.retrieve).toHaveBeenCalledTimes(1)
    expect(notion.databases.retrieve).toHaveBeenCalledWith({ database_id: 'db-1' })

    // Should return two props
    expect(props).toHaveLength(2)

    const status = props.find((p: any) => p.name === 'Status')
    expect(status?.type).toBe('status')
    expect(status?.options).toEqual(['Todo', 'Done'])
  })

  it('returns cached value on second call without hitting Notion again', async () => {
    const notion = makeNotion({
      Name: { type: 'title', title: {} },
    })

    await getCachedSchema(notion, 'db-2')
    await getCachedSchema(notion, 'db-2')

    expect(notion.databases.retrieve).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after invalidation', async () => {
    const notion = makeNotion({
      Name: { type: 'title', title: {} },
    })

    await getCachedSchema(notion, 'db-1')
    invalidateSchema('db-1')
    await getCachedSchema(notion, 'db-1')

    expect(notion.databases.retrieve).toHaveBeenCalledTimes(2)
  })

  it('re-fetches after TTL expires', async () => {
    vi.useFakeTimers()

    const notion = makeNotion({
      Name: { type: 'title', title: {} },
    })

    await getCachedSchema(notion, 'db-ttl')
    expect(notion.databases.retrieve).toHaveBeenCalledTimes(1)

    // Advance past the 5-minute TTL
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)

    await getCachedSchema(notion, 'db-ttl')
    expect(notion.databases.retrieve).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('maps select options correctly', async () => {
    const notion = makeNotion({
      Priority: { type: 'select', select: { options: [{ name: 'High' }, { name: 'Low' }] } },
    })

    const props = await getCachedSchema(notion, 'db-select')
    const priority = props.find((p: any) => p.name === 'Priority')
    expect(priority?.options).toEqual(['High', 'Low'])
  })

  it('maps multi_select options correctly', async () => {
    const notion = makeNotion({
      Tags: { type: 'multi_select', multi_select: { options: [{ name: 'Bug' }, { name: 'Feature' }] } },
    })

    const props = await getCachedSchema(notion, 'db-multi')
    const tags = props.find((p: any) => p.name === 'Tags')
    expect(tags?.options).toEqual(['Bug', 'Feature'])
  })

  it('does not include options key for non-option property types', async () => {
    const notion = makeNotion({
      Title: { type: 'title', title: {} },
    })

    const props = await getCachedSchema(notion, 'db-title')
    const title = props.find((p: any) => p.name === 'Title')
    expect(title).not.toHaveProperty('options')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
describe('invalidateSchema', () => {
  it('removes a database from the cache so the next call re-fetches', async () => {
    const notion = makeNotion({ Name: { type: 'title', title: {} } })

    await getCachedSchema(notion, 'db-1')
    invalidateSchema('db-1')
    await getCachedSchema(notion, 'db-1')

    expect(notion.databases.retrieve).toHaveBeenCalledTimes(2)
  })

  it('is a no-op when the key is not in the cache', () => {
    expect(() => invalidateSchema('non-existent-db')).not.toThrow()
  })
})
