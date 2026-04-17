import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the mock factories can reference variables safely
const { mockBoardExecute, mockNotionExecute, mockMediaExecute, mockWebExecute,
        mockSystemExecute, mockTimerExecute, mockCalendarExecute, mockTaskExecute } = vi.hoisted(() => ({
  mockBoardExecute:    vi.fn().mockResolvedValue('board result'),
  mockNotionExecute:   vi.fn().mockResolvedValue('notion result'),
  mockMediaExecute:    vi.fn().mockResolvedValue('media result'),
  mockWebExecute:      vi.fn().mockResolvedValue('web result'),
  mockSystemExecute:   vi.fn().mockResolvedValue('system result'),
  mockTimerExecute:    vi.fn().mockResolvedValue('timer result'),
  mockCalendarExecute: vi.fn().mockResolvedValue('calendar result'),
  mockTaskExecute:     vi.fn().mockResolvedValue('task result'),
}))

vi.mock('./board.js', () => ({
  boardTools: [{
    definition: { name: 'board_tool', description: 'board', input_schema: { type: 'object', properties: {} } },
    execute:    mockBoardExecute,
  }],
}))

vi.mock('./notion.js', () => ({
  notionTools: [{
    definition: { name: 'notion_tool', description: 'notion', input_schema: { type: 'object', properties: {} } },
    execute:    mockNotionExecute,
  }],
}))

vi.mock('./media.js', () => ({
  mediaTools: [{
    definition: { name: 'media_tool', description: 'media', input_schema: { type: 'object', properties: {} } },
    execute:    mockMediaExecute,
  }],
}))

vi.mock('./web.js', () => ({
  webTools: [{
    definition: { name: 'web_tool', description: 'web', input_schema: { type: 'object', properties: {} } },
    execute:    mockWebExecute,
  }],
}))

vi.mock('./system.js', () => ({
  systemTools: [{
    definition: { name: 'system_tool', description: 'system', input_schema: { type: 'object', properties: {} } },
    execute:    mockSystemExecute,
  }],
}))

vi.mock('./timers.js', () => ({
  timerTools: [{
    definition: { name: 'timer_tool', description: 'timer', input_schema: { type: 'object', properties: {} } },
    execute:    mockTimerExecute,
  }],
}))

vi.mock('./calendar.js', () => ({
  calendarTools: [{
    definition: { name: 'calendar_tool', description: 'calendar', input_schema: { type: 'object', properties: {} } },
    execute:    mockCalendarExecute,
  }],
}))

vi.mock('./tasks.js', () => ({
  taskTools: [{
    definition: { name: 'task_tool', description: 'tasks', input_schema: { type: 'object', properties: {} } },
    execute:    mockTaskExecute,
  }],
}))

import { VOICE_TOOLS, executeVoiceTool } from './registry.js'

const fakeCtx = { notion: {} as any, gcal: null, userId: 'uid' }

describe('voice-tools registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('VOICE_TOOLS exports all tool definitions', () => {
    const names = VOICE_TOOLS.map((t) => t.name)
    expect(names).toContain('task_tool')
    expect(names).toContain('board_tool')
    expect(names).toContain('notion_tool')
    expect(names).toContain('calendar_tool')
    expect(names).toContain('media_tool')
    expect(names).toContain('web_tool')
    expect(names).toContain('system_tool')
    expect(names).toContain('timer_tool')
  })

  it('VOICE_TOOLS contains Anthropic.Tool-shaped objects', () => {
    for (const tool of VOICE_TOOLS) {
      expect(tool).toHaveProperty('name')
      expect(tool).toHaveProperty('description')
      expect(tool).toHaveProperty('input_schema')
    }
  })

  it('executeVoiceTool dispatches to board tool', async () => {
    const result = await executeVoiceTool('board_tool', {}, fakeCtx)
    expect(result).toBe('board result')
    expect(mockBoardExecute).toHaveBeenCalledWith({}, fakeCtx)
  })

  it('executeVoiceTool dispatches to notion tool', async () => {
    const result = await executeVoiceTool('notion_tool', { key: 'val' }, fakeCtx)
    expect(result).toBe('notion result')
    expect(mockNotionExecute).toHaveBeenCalledWith({ key: 'val' }, fakeCtx)
  })

  it('executeVoiceTool dispatches to task tool', async () => {
    const result = await executeVoiceTool('task_tool', { title: 'Buy milk' }, fakeCtx)
    expect(result).toBe('task result')
    expect(mockTaskExecute).toHaveBeenCalledWith({ title: 'Buy milk' }, fakeCtx)
  })

  it('executeVoiceTool dispatches to calendar tool', async () => {
    const result = await executeVoiceTool('calendar_tool', {}, fakeCtx)
    expect(result).toBe('calendar result')
  })

  it('executeVoiceTool dispatches to system tool', async () => {
    const result = await executeVoiceTool('system_tool', {}, fakeCtx)
    expect(result).toBe('system result')
  })

  it('executeVoiceTool dispatches to timer tool', async () => {
    const result = await executeVoiceTool('timer_tool', {}, fakeCtx)
    expect(result).toBe('timer result')
  })

  it('executeVoiceTool returns unknown-tool message for unregistered name', async () => {
    const result = await executeVoiceTool('does_not_exist', {}, fakeCtx)
    expect(result).toMatch(/Unknown tool/)
    expect(result).toContain('does_not_exist')
  })

  it('VOICE_TOOLS has no duplicate names', () => {
    const names = VOICE_TOOLS.map((t) => t.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })
})
