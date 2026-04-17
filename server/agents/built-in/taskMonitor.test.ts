import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../services/memory.js', () => ({
  loadMemory: vi.fn(() => ({
    name:        'Walli',
    location:    'NY',
    preferences: [],
    facts:       [],
    databases:   {},
  })),
}))

import { loadMemory } from '../../services/memory.js'
import { taskMonitorAgent } from './taskMonitor.js'
import type { AgentContext } from '../types.js'

// Monotonically increasing counter — ensures each test gets a fresh page ID
// that hasn't been added to the module-level alertedToday Set yet.
let pageCounter = 0

function makeCtx(overrides?: Partial<AgentContext>): AgentContext {
  return {
    broadcast:     vi.fn(),
    speak:         vi.fn(),
    notify:        vi.fn().mockResolvedValue(undefined),
    notion:        {
      databases: {
        query: vi.fn().mockResolvedValue({ results: [] }),
      },
    } as any,
    anthropic:     {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ text: 'You have 2 overdue tasks.' }],
        }),
      },
    } as any,
    gcal:          null,
    boards:        [],
    activeBoardId: 'board-1',
    ...overrides,
  }
}

function makeOverduePage(overrides: any = {}) {
  return {
    id:         `page-${++pageCounter}`,
    properties: {
      Name: { type: 'title', title: [{ plain_text: 'Finish report' }] },
      due:  { date: { start: '2024-01-01' } },
    },
    ...overrides,
  }
}

describe('taskMonitorAgent metadata', () => {
  it('has correct id, name, icon, intervalMs', () => {
    expect(taskMonitorAgent.id).toBe('task-monitor')
    expect(taskMonitorAgent.name).toBe('Task Monitor')
    expect(taskMonitorAgent.icon).toBe('✅')
    expect(taskMonitorAgent.intervalMs).toBe(15 * 60_000)
    expect(taskMonitorAgent.enabled).toBe(true)
  })
})

describe('taskMonitorAgent.run()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns early when no task database IDs are found', async () => {
    vi.mocked(loadMemory).mockReturnValue({
      name: '', location: '', preferences: [], facts: [], databases: {},
    })
    const ctx = makeCtx({ boards: [] })
    await taskMonitorAgent.run(ctx)
    expect(ctx.notion.databases.query).not.toHaveBeenCalled()
  })

  it('queries databases from memory when they contain "task" in key', async () => {
    vi.mocked(loadMemory).mockReturnValue({
      name: '', location: '', preferences: [], facts: [],
      databases: { 'task-list': 'db-123', notes: 'db-456' },
    })
    const ctx = makeCtx()
    await taskMonitorAgent.run(ctx)
    expect(ctx.notion.databases.query).toHaveBeenCalledWith(
      expect.objectContaining({ database_id: 'db-123' })
    )
    expect(ctx.notion.databases.query).not.toHaveBeenCalledWith(
      expect.objectContaining({ database_id: 'db-456' })
    )
  })

  it('picks up task databases from widget settings on the active board', async () => {
    vi.mocked(loadMemory).mockReturnValue({
      name: '', location: '', preferences: [], facts: [], databases: {},
    })
    const ctx = makeCtx({
      boards: [{
        id: 'board-1',
        name: 'Main',
        widgets: [{
          id: 'w-1',
          type: '@whiteboard/notion-view',
          settings: { databaseId: 'db-from-widget', template: 'todo-list' },
        }],
      }],
    })
    await taskMonitorAgent.run(ctx)
    expect(ctx.notion.databases.query).toHaveBeenCalledWith(
      expect.objectContaining({ database_id: 'db-from-widget' })
    )
  })

  it('calls ctx.speak and ctx.broadcast when overdue tasks exist', async () => {
    vi.mocked(loadMemory).mockReturnValue({
      name: '', location: '', preferences: [], facts: [], databases: { tasks: 'db-1' },
    })
    const ctx = makeCtx({
      notion: {
        databases: { query: vi.fn().mockResolvedValue({ results: [makeOverduePage()] }) },
      } as any,
    })
    await taskMonitorAgent.run(ctx)
    expect(ctx.speak).toHaveBeenCalled()
    expect(ctx.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'agent_notification' })
    )
    expect(ctx.notify).toHaveBeenCalled()
  })

  it('does not call ctx.speak when there are no overdue tasks', async () => {
    vi.mocked(loadMemory).mockReturnValue({
      name: '', location: '', preferences: [], facts: [], databases: { tasks: 'db-1' },
    })
    const ctx = makeCtx({
      notion: { databases: { query: vi.fn().mockResolvedValue({ results: [] }) } } as any,
    })
    await taskMonitorAgent.run(ctx)
    expect(ctx.speak).not.toHaveBeenCalled()
  })

  it('silently skips databases that throw query errors', async () => {
    vi.mocked(loadMemory).mockReturnValue({
      name: '', location: '', preferences: [], facts: [], databases: { tasks: 'db-bad' },
    })
    const ctx = makeCtx({
      notion: { databases: { query: vi.fn().mockRejectedValue(new Error('Not found')) } } as any,
    })
    await expect(taskMonitorAgent.run(ctx)).resolves.toBeUndefined()
    expect(ctx.speak).not.toHaveBeenCalled()
  })

  it('flashes the task widget when an overdue task is found', async () => {
    vi.mocked(loadMemory).mockReturnValue({
      name: '', location: '', preferences: [], facts: [], databases: { tasks: 'db-1' },
    })
    const page = makeOverduePage()
    const ctx = makeCtx({
      boards: [{
        id: 'board-1',
        name: 'Main',
        widgets: [{
          id: 'task-widget',
          type: '@whiteboard/notion-view',
          settings: { databaseId: 'db-1', template: 'todo-list' },
        }],
      }],
      notion: { databases: { query: vi.fn().mockResolvedValue({ results: [page] }) } } as any,
    })
    await taskMonitorAgent.run(ctx)
    expect(ctx.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'flash_widget', id: 'task-widget' })
    )
  })
})
