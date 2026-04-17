import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Memory mock ───────────────────────────────────────────────────────────────
const { mockLoadMemory, mockSaveMemory } = vi.hoisted(() => ({
  mockLoadMemory: vi.fn(),
  mockSaveMemory: vi.fn(),
}))

vi.mock('../memory.js', () => ({
  loadMemory:     mockLoadMemory,
  saveMemory:     mockSaveMemory,
  memoryToPrompt: vi.fn().mockReturnValue(''),
}))

// ── Briefing mock ─────────────────────────────────────────────────────────────
const { mockCompileBriefing } = vi.hoisted(() => ({
  mockCompileBriefing: vi.fn(),
}))

vi.mock('../briefing.js', () => ({
  compileBriefing: (...args: any[]) => mockCompileBriefing(...args),
}))

// ── Global fetch mock (for manage_agents internal HTTP calls) ─────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { systemTools } from './system.js'

const fakeCtx = { notion: {} as any, gcal: null, userId: 'uid' }

function getTool(name: string) {
  const t = systemTools.find((t) => t.definition.name === name)
  if (!t) throw new Error(`Tool ${name} not found`)
  return t
}

describe('system tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PORT = '3001'
  })

  // ── manage_agents ─────────────────────────────────────────────────────────

  describe('manage_agents', () => {
    it('list action fetches agent list and formats output', async () => {
      mockFetch.mockResolvedValue({
        ok:   true,
        json: vi.fn().mockResolvedValue([
          { id: 'agent-1', name: 'Weather Agent', icon: '🌤', enabled: true,  lastRun: null },
          { id: 'agent-2', name: 'News Agent',    icon: '📰', enabled: false, lastRun: '2026-04-17T08:00:00Z' },
        ]),
      })

      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'list' }, fakeCtx)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/agents')
      expect(result).toContain('Weather Agent')
      expect(result).toContain('agent-1')
      expect(result).toContain('enabled')
      expect(result).toContain('News Agent')
      expect(result).toContain('disabled')
    })

    it('create action posts new agent and returns confirmation', async () => {
      mockFetch.mockResolvedValue({
        ok:   true,
        json: vi.fn().mockResolvedValue({ id: 'new-agent', name: 'My Agent' }),
      })

      const tool   = getTool('manage_agents')
      const result = await tool.execute({
        action:      'create',
        name:        'My Agent',
        description: 'Check news every hour',
        intervalMs:  3_600_000,
      }, fakeCtx)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/agents',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result).toContain('My Agent')
      expect(result).toContain('new-agent')
    })

    it('create action returns error when name/description missing', async () => {
      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'create' }, fakeCtx)
      expect(result).toMatch(/name and description are required/)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('create action returns error message on HTTP failure', async () => {
      mockFetch.mockResolvedValue({
        ok:   false,
        json: vi.fn().mockResolvedValue({ error: 'Already exists' }),
      })

      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'create', name: 'X', description: 'Y' }, fakeCtx)
      expect(result).toMatch(/Failed to create agent/)
    })

    it('delete action calls DELETE endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'delete', agentId: 'agent-1' }, fakeCtx)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/agents/agent-1',
        expect.objectContaining({ method: 'DELETE' }),
      )
      expect(result).toContain('Deleted agent agent-1')
    })

    it('delete action returns error when agentId missing', async () => {
      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'delete' }, fakeCtx)
      expect(result).toMatch(/agentId required/)
    })

    it('delete action returns error on HTTP failure', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'delete', agentId: 'bad-id' }, fakeCtx)
      expect(result).toMatch(/Could not delete/)
    })

    it('run action posts to /run endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'run', agentId: 'agent-1' }, fakeCtx)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/agents/agent-1/run',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result).toContain('Ran agent agent-1')
    })

    it('enable action patches agent enabled:true', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'enable', agentId: 'agent-1' }, fakeCtx)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/agents/agent-1',
        expect.objectContaining({
          method: 'PATCH',
          body:   JSON.stringify({ enabled: true }),
        }),
      )
      expect(result).toContain('agent-1')
    })

    it('disable action patches agent enabled:false', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const tool   = getTool('manage_agents')
      await tool.execute({ action: 'disable', agentId: 'agent-2' }, fakeCtx)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.enabled).toBe(false)
    })

    it('returns agentId required when agentId missing for run', async () => {
      const tool   = getTool('manage_agents')
      const result = await tool.execute({ action: 'run' }, fakeCtx)
      expect(result).toMatch(/agentId required/)
    })
  })

  // ── update_memory ─────────────────────────────────────────────────────────

  describe('update_memory', () => {
    const baseMemory = () => ({
      name:        '',
      location:    '',
      preferences: [] as string[],
      facts:       [] as string[],
      databases:   {} as Record<string, string>,
    })

    it('stores user name', async () => {
      const mem = baseMemory()
      mockLoadMemory.mockReturnValue(mem)

      const tool   = getTool('update_memory')
      const result = await tool.execute({ field: 'name', value: 'Dylan' }, fakeCtx)

      expect(result).toContain('Dylan')
      expect(mockSaveMemory).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dylan' }))
    })

    it('stores location', async () => {
      const mem = baseMemory()
      mockLoadMemory.mockReturnValue(mem)

      const tool = getTool('update_memory')
      await tool.execute({ field: 'location', value: 'Jersey City' }, fakeCtx)

      expect(mockSaveMemory).toHaveBeenCalledWith(expect.objectContaining({ location: 'Jersey City' }))
    })

    it('adds preference without duplicating', async () => {
      const mem = { ...baseMemory(), preferences: ['dark mode'] }
      mockLoadMemory.mockReturnValue(mem)

      const tool = getTool('update_memory')
      await tool.execute({ field: 'preference', value: 'morning workouts' }, fakeCtx)

      const saved = mockSaveMemory.mock.calls[0][0]
      expect(saved.preferences).toContain('morning workouts')
      expect(saved.preferences).toContain('dark mode')
      expect(saved.preferences).toHaveLength(2)

      // Calling again with the same value should not duplicate
      mockLoadMemory.mockReturnValue(saved)
      await tool.execute({ field: 'preference', value: 'morning workouts' }, fakeCtx)
      const saved2 = mockSaveMemory.mock.calls[1][0]
      expect(saved2.preferences.filter((p: string) => p === 'morning workouts')).toHaveLength(1)
    })

    it('adds a fact without duplicating', async () => {
      const mem = baseMemory()
      mockLoadMemory.mockReturnValue(mem)

      const tool = getTool('update_memory')
      await tool.execute({ field: 'fact', value: 'User is a developer' }, fakeCtx)

      const saved = mockSaveMemory.mock.calls[0][0]
      expect(saved.facts).toContain('User is a developer')
    })

    it('stores database with databaseKey', async () => {
      const mem = baseMemory()
      mockLoadMemory.mockReturnValue(mem)

      const tool = getTool('update_memory')
      await tool.execute({ field: 'database', value: 'db-uuid', databaseKey: 'Tasks' }, fakeCtx)

      const saved = mockSaveMemory.mock.calls[0][0]
      expect(saved.databases['Tasks']).toBe('db-uuid')
    })

    it('stores database using value as key when databaseKey missing', async () => {
      const mem = baseMemory()
      mockLoadMemory.mockReturnValue(mem)

      const tool = getTool('update_memory')
      await tool.execute({ field: 'database', value: 'db-uuid' }, fakeCtx)

      const saved = mockSaveMemory.mock.calls[0][0]
      expect(saved.databases['db-uuid']).toBe('db-uuid')
    })
  })

  // ── brief_me ──────────────────────────────────────────────────────────────

  describe('brief_me', () => {
    it('calls compileBriefing and returns result', async () => {
      mockCompileBriefing.mockResolvedValue('Good morning! Today looks busy.')

      const tool   = getTool('brief_me')
      const result = await tool.execute({}, fakeCtx)

      expect(mockCompileBriefing).toHaveBeenCalledWith(fakeCtx.notion)
      expect(result).toBe('Good morning! Today looks busy.')
    })

    it('propagates errors from compileBriefing', async () => {
      mockCompileBriefing.mockRejectedValue(new Error('API key missing'))

      const tool = getTool('brief_me')
      await expect(tool.execute({}, fakeCtx)).rejects.toThrow('API key missing')
    })
  })
})
