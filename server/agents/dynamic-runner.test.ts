import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock DB ────────────────────────────────────────────────────────────────────

const mockPrepare = vi.fn()
const mockAll     = vi.fn()
const mockGet     = vi.fn()
const mockRun     = vi.fn()

const mockStmt = { all: mockAll, get: mockGet, run: mockRun }
mockPrepare.mockReturnValue(mockStmt)

vi.mock('../services/db.js', () => ({
  default: { prepare: (...args: any[]) => mockPrepare(...args) },
}))

import {
  readUserAgents,
  addUserAgent,
  removeUserAgent,
  updateUserAgent,
  buildDynamicAgent,
  loadDynamicAgents,
  type UserAgentDef,
} from './dynamic-runner.js'
import type { AgentContext } from './types.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRow(overrides = {}): any {
  return {
    id:          'agent-1',
    name:        'My Agent',
    description: 'Do stuff',
    interval_ms: 3_600_000,
    enabled:     1,
    icon:        '🤖',
    sprite_type: null,
    created_at:  '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeDef(overrides: Partial<UserAgentDef> = {}): UserAgentDef {
  return {
    id:          'agent-1',
    name:        'My Agent',
    description: 'Do stuff',
    intervalMs:  3_600_000,
    enabled:     true,
    icon:        '🤖',
    createdAt:   '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeCtx(overrides?: Partial<AgentContext>): AgentContext {
  return {
    broadcast:     vi.fn(),
    speak:         vi.fn(),
    notify:        vi.fn().mockResolvedValue(undefined),
    notion:        {} as any,
    anthropic:     {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ text: '{"speak":"Hello","skip":false}' }],
        }),
      },
    } as any,
    gcal:          null,
    boards:        [{ id: 'board-1', name: 'Main', widgets: [] }],
    activeBoardId: 'board-1',
    ...overrides,
  }
}

describe('readUserAgents()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrepare.mockReturnValue(mockStmt)
  })

  it('returns mapped UserAgentDef array', () => {
    mockAll.mockReturnValue([makeRow(), makeRow({ id: 'agent-2', name: 'Agent Two' })])
    const agents = readUserAgents()
    expect(agents).toHaveLength(2)
    expect(agents[0].id).toBe('agent-1')
    expect(agents[0].enabled).toBe(true) // 1 → true
    expect(agents[1].id).toBe('agent-2')
  })

  it('maps sprite_type null to undefined', () => {
    mockAll.mockReturnValue([makeRow({ sprite_type: null })])
    const agents = readUserAgents()
    expect(agents[0].spriteType).toBeUndefined()
  })

  it('maps sprite_type string to spriteType field', () => {
    mockAll.mockReturnValue([makeRow({ sprite_type: 'cat' })])
    const agents = readUserAgents()
    expect(agents[0].spriteType).toBe('cat')
  })
})

describe('addUserAgent()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrepare.mockReturnValue(mockStmt)
  })

  it('inserts and returns a full UserAgentDef', () => {
    mockGet.mockReturnValueOnce(null) // not exists check
    const def = addUserAgent(makeDef())
    expect(def.id).toBe('agent-1')
    expect(def.createdAt).toBeTruthy()
    expect(mockRun).toHaveBeenCalled()
  })

  it('throws if agent with same id already exists', () => {
    mockGet.mockReturnValueOnce({ id: 'agent-1' }) // already exists
    expect(() => addUserAgent(makeDef())).toThrow('already exists')
  })
})

describe('removeUserAgent()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrepare.mockReturnValue(mockStmt)
  })

  it('runs DELETE for the given id', () => {
    removeUserAgent('agent-1')
    expect(mockRun).toHaveBeenCalledWith('agent-1')
  })
})

describe('updateUserAgent()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrepare.mockReturnValue(mockStmt)
  })

  it('updates and returns the updated def', () => {
    mockGet.mockReturnValueOnce(makeRow()) // SELECT *
    const updated = updateUserAgent('agent-1', { name: 'Updated Name' })
    expect(updated.name).toBe('Updated Name')
    expect(mockRun).toHaveBeenCalled()
  })

  it('throws if agent does not exist', () => {
    mockGet.mockReturnValueOnce(undefined)
    expect(() => updateUserAgent('ghost', {})).toThrow('not found')
  })
})

describe('buildDynamicAgent()', () => {
  it('returns an Agent with correct metadata', () => {
    const def = makeDef()
    const agent = buildDynamicAgent(def)
    expect(agent.id).toBe('agent-1')
    expect(agent.name).toBe('My Agent')
    expect(agent.description).toBe('Do stuff')
    expect(agent.icon).toBe('🤖')
    expect(agent.intervalMs).toBe(3_600_000)
    expect(agent.enabled).toBe(true)
    expect(typeof agent.run).toBe('function')
  })

  it('run() calls ctx.anthropic.messages.create with agent description', async () => {
    const ctx = makeCtx()
    const agent = buildDynamicAgent(makeDef({ description: 'Check the weather' }))
    await agent.run(ctx)
    expect(ctx.anthropic.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [expect.objectContaining({ role: 'user' })],
      })
    )
    const call = (ctx.anthropic.messages.create as any).mock.calls[0][0]
    expect(call.system).toContain('Check the weather')
  })

  it('run() calls ctx.speak when response has speak field', async () => {
    const ctx = makeCtx({
      anthropic: {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ text: '{"speak":"Good morning!"}' }],
          }),
        },
      } as any,
    })
    const agent = buildDynamicAgent(makeDef())
    await agent.run(ctx)
    expect(ctx.speak).toHaveBeenCalledWith('Good morning!')
  })

  it('run() calls ctx.notify when response has notify field', async () => {
    const ctx = makeCtx({
      anthropic: {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ text: '{"notify":{"title":"Alert","body":"Something happened","priority":"high"}}' }],
          }),
        },
      } as any,
    })
    const agent = buildDynamicAgent(makeDef())
    await agent.run(ctx)
    expect(ctx.notify).toHaveBeenCalledWith(
      'Alert',
      'Something happened',
      expect.objectContaining({ priority: 'high' })
    )
  })

  it('run() calls ctx.broadcast when response has broadcast field', async () => {
    const ctx = makeCtx({
      anthropic: {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ text: '{"broadcast":{"type":"flash_widget","id":"w-1"}}' }],
          }),
        },
      } as any,
    })
    const agent = buildDynamicAgent(makeDef())
    await agent.run(ctx)
    expect(ctx.broadcast).toHaveBeenCalledWith({ type: 'flash_widget', id: 'w-1' })
  })

  it('run() is a no-op when skip is true', async () => {
    const ctx = makeCtx({
      anthropic: {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ text: '{"skip":true}' }],
          }),
        },
      } as any,
    })
    const agent = buildDynamicAgent(makeDef())
    await agent.run(ctx)
    expect(ctx.speak).not.toHaveBeenCalled()
    expect(ctx.notify).not.toHaveBeenCalled()
    expect(ctx.broadcast).not.toHaveBeenCalled()
  })

  it('run() handles non-JSON response gracefully', async () => {
    const ctx = makeCtx({
      anthropic: {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ text: 'Sorry, I cannot help with that.' }],
          }),
        },
      } as any,
    })
    const agent = buildDynamicAgent(makeDef())
    await expect(agent.run(ctx)).resolves.toBeUndefined()
    expect(ctx.speak).not.toHaveBeenCalled()
  })

  it('run() includes board summary in the user message', async () => {
    const ctx = makeCtx({
      boards: [{ id: 'board-1', name: 'My Board', widgets: [{ id: 'w-1', type: 'clock', settings: {} }] }],
      activeBoardId: 'board-1',
    })
    const agent = buildDynamicAgent(makeDef())
    await agent.run(ctx)
    const call = (ctx.anthropic.messages.create as any).mock.calls[0][0]
    expect(call.messages[0].content).toContain('My Board')
  })
})

describe('loadDynamicAgents()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrepare.mockReturnValue(mockStmt)
  })

  it('returns Agent instances from all stored user agent definitions', () => {
    mockAll.mockReturnValue([makeRow(), makeRow({ id: 'agent-2', name: 'Agent Two' })])
    const agents = loadDynamicAgents()
    expect(agents).toHaveLength(2)
    expect(agents[0].id).toBe('agent-1')
    expect(agents[1].id).toBe('agent-2')
    expect(typeof agents[0].run).toBe('function')
  })

  it('returns empty array when no user agents exist', () => {
    mockAll.mockReturnValue([])
    const agents = loadDynamicAgents()
    expect(agents).toEqual([])
  })
})
