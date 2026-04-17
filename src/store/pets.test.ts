import { describe, it, expect, beforeEach } from 'vitest'
import { usePetsStore } from './pets'

const store = () => usePetsStore.getState()

beforeEach(() => {
  usePetsStore.setState(usePetsStore.getInitialState(), true)
})

describe('usePetsStore — initial state', () => {
  it('starts with an empty pets record', () => {
    expect(store().pets).toEqual({})
  })
})

describe('setPet', () => {
  it('creates a new pet entry', () => {
    store().setPet('agent-1', 'active', 'Hello!')
    expect(store().pets['agent-1']).toEqual({
      agentId: 'agent-1',
      mood: 'active',
      message: 'Hello!',
    })
  })

  it('uses null as the message when message is omitted on a new pet', () => {
    store().setPet('agent-2', 'idle')
    expect(store().pets['agent-2'].message).toBeNull()
  })

  it('preserves the existing message when message is omitted on update', () => {
    store().setPet('agent-3', 'speaking', 'Keep me')
    store().setPet('agent-3', 'idle')
    expect(store().pets['agent-3'].message).toBe('Keep me')
  })

  it('overwrites mood and message when both are provided', () => {
    store().setPet('agent-4', 'idle', 'Old')
    store().setPet('agent-4', 'active', 'New')
    expect(store().pets['agent-4'].mood).toBe('active')
    expect(store().pets['agent-4'].message).toBe('New')
  })

  it('manages multiple pets independently', () => {
    store().setPet('a1', 'idle', 'Hi from a1')
    store().setPet('a2', 'speaking', 'Hi from a2')
    expect(store().pets['a1'].mood).toBe('idle')
    expect(store().pets['a2'].mood).toBe('speaking')
  })

  it('can set all three mood values', () => {
    store().setPet('x', 'idle')
    expect(store().pets['x'].mood).toBe('idle')
    store().setPet('x', 'active')
    expect(store().pets['x'].mood).toBe('active')
    store().setPet('x', 'speaking')
    expect(store().pets['x'].mood).toBe('speaking')
  })
})

describe('clearMessage', () => {
  it('sets mood to idle and message to null', () => {
    store().setPet('agent-5', 'speaking', 'Say something')
    store().clearMessage('agent-5')
    expect(store().pets['agent-5'].mood).toBe('idle')
    expect(store().pets['agent-5'].message).toBeNull()
  })

  it('preserves other fields when clearing message', () => {
    store().setPet('agent-6', 'active', 'Text')
    store().clearMessage('agent-6')
    expect(store().pets['agent-6'].agentId).toBe('agent-6')
  })

  it('does not affect sibling pet entries', () => {
    store().setPet('a', 'speaking', 'I talk')
    store().setPet('b', 'active', 'Me too')
    store().clearMessage('a')
    expect(store().pets['b'].mood).toBe('active')
    expect(store().pets['b'].message).toBe('Me too')
  })
})
