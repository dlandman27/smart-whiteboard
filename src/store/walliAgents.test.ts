import { describe, it, expect, beforeEach } from 'vitest'
import { useWalliAgentsStore } from './walliAgents'
import type { AgentWidgetState } from './walliAgents'

const store = () => useWalliAgentsStore.getState()

const makeWidget = (overrides: Partial<AgentWidgetState> = {}): AgentWidgetState => ({
  widget_id: 'w-1',
  agent: 'apollo',
  data: {},
  size: 'medium',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  useWalliAgentsStore.setState(useWalliAgentsStore.getInitialState(), true)
})

describe('useWalliAgentsStore — initial state', () => {
  it('starts with an empty widgets record', () => {
    expect(store().widgets).toEqual({})
  })
})

describe('setWidget', () => {
  it('adds a new widget entry keyed by widget_id', () => {
    const w = makeWidget()
    store().setWidget(w)
    expect(store().widgets['w-1']).toEqual(w)
  })

  it('updates an existing widget entry', () => {
    store().setWidget(makeWidget({ size: 'small' }))
    store().setWidget(makeWidget({ size: 'large' }))
    expect(store().widgets['w-1'].size).toBe('large')
  })

  it('stores multiple widgets independently', () => {
    store().setWidget(makeWidget({ widget_id: 'w-1', agent: 'apollo' }))
    store().setWidget(makeWidget({ widget_id: 'w-2', agent: 'miles' }))
    expect(store().widgets['w-1'].agent).toBe('apollo')
    expect(store().widgets['w-2'].agent).toBe('miles')
  })

  it('persists data payload', () => {
    const data = { tasks: [1, 2, 3], done: false }
    store().setWidget(makeWidget({ data }))
    expect(store().widgets['w-1'].data).toEqual(data)
  })

  it('supports all agent domain values', () => {
    const agents = ['apollo', 'miles', 'harvey', 'alfred', 'walli'] as const
    agents.forEach((agent, i) => {
      store().setWidget(makeWidget({ widget_id: `w-${i}`, agent }))
      expect(store().widgets[`w-${i}`].agent).toBe(agent)
    })
  })

  it('supports all size values', () => {
    const sizes = ['small', 'medium', 'large', 'full'] as const
    sizes.forEach((size, i) => {
      store().setWidget(makeWidget({ widget_id: `w-${i}`, size }))
      expect(store().widgets[`w-${i}`].size).toBe(size)
    })
  })
})

describe('getWidget', () => {
  it('returns the widget for a known widget_id', () => {
    const w = makeWidget({ widget_id: 'w-99' })
    store().setWidget(w)
    expect(store().getWidget('w-99')).toEqual(w)
  })

  it('returns undefined for an unknown widget_id', () => {
    expect(store().getWidget('nonexistent')).toBeUndefined()
  })

  it('returns the latest value after an update', () => {
    store().setWidget(makeWidget({ widget_id: 'w-1', size: 'small' }))
    store().setWidget(makeWidget({ widget_id: 'w-1', size: 'full' }))
    expect(store().getWidget('w-1')?.size).toBe('full')
  })
})
