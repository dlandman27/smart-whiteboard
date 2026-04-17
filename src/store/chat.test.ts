import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from './chat'

// Mock analytics since chat.ts imports it
vi.mock('../lib/analytics', () => ({
  analytics: {
    identify: vi.fn(),
    track: vi.fn(),
    reset: vi.fn(),
  },
}))

import { analytics } from '../lib/analytics'

// Helper to always get a fresh store state
const store = () => useChatStore.getState()

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChatStore.setState({ messages: [], isOpen: false })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty messages array', () => {
      expect(store().messages).toEqual([])
    })

    it('starts with isOpen = false', () => {
      expect(store().isOpen).toBe(false)
    })
  })

  describe('addMessage', () => {
    it('adds a user message to the store', () => {
      store().addMessage('user', 'Hello world')
      const msgs = store().messages
      expect(msgs).toHaveLength(1)
      expect(msgs[0].role).toBe('user')
      expect(msgs[0].text).toBe('Hello world')
    })

    it('adds a walli message to the store', () => {
      store().addMessage('walli', 'Hi there!')
      const msgs = store().messages
      expect(msgs).toHaveLength(1)
      expect(msgs[0].role).toBe('walli')
      expect(msgs[0].text).toBe('Hi there!')
    })

    it('assigns a unique id to each message', () => {
      store().addMessage('user', 'First')
      store().addMessage('walli', 'Second')
      const msgs = store().messages
      expect(msgs[0].id).toBeTruthy()
      expect(msgs[1].id).toBeTruthy()
      expect(msgs[0].id).not.toBe(msgs[1].id)
    })

    it('assigns a timestamp to each message', () => {
      const before = Date.now()
      store().addMessage('user', 'Timestamped')
      const after = Date.now()
      const msg = store().messages[0]
      expect(msg.ts).toBeGreaterThanOrEqual(before)
      expect(msg.ts).toBeLessThanOrEqual(after)
    })

    it('appends messages in order', () => {
      store().addMessage('user', 'First')
      store().addMessage('walli', 'Second')
      store().addMessage('user', 'Third')
      const msgs = store().messages
      expect(msgs[0].text).toBe('First')
      expect(msgs[1].text).toBe('Second')
      expect(msgs[2].text).toBe('Third')
    })

    it('keeps only the last 100 messages (slices to 99 then appends)', () => {
      // Add 101 messages
      for (let i = 0; i < 101; i++) {
        store().addMessage('user', `Message ${i}`)
      }
      const msgs = store().messages
      // Should cap at 100 (99 slice + 1 new)
      expect(msgs.length).toBe(100)
      // The last message should be "Message 100"
      expect(msgs[99].text).toBe('Message 100')
    })

    it('retains all messages when under limit', () => {
      store().addMessage('user', 'A')
      store().addMessage('walli', 'B')
      expect(store().messages).toHaveLength(2)
    })
  })

  describe('toggle', () => {
    it('toggles isOpen from false to true', () => {
      expect(store().isOpen).toBe(false)
      store().toggle()
      expect(store().isOpen).toBe(true)
    })

    it('toggles isOpen from true to false', () => {
      useChatStore.setState({ isOpen: true })
      store().toggle()
      expect(store().isOpen).toBe(false)
    })

    it('calls analytics.track when opening chat', () => {
      expect(store().isOpen).toBe(false)
      store().toggle()
      expect(analytics.track).toHaveBeenCalledWith('walli_chat_opened')
    })

    it('does not call analytics.track when closing chat', () => {
      useChatStore.setState({ isOpen: true })
      store().toggle()
      expect(analytics.track).not.toHaveBeenCalled()
    })

    it('toggles back correctly on multiple calls', () => {
      store().toggle() // false -> true
      store().toggle() // true -> false
      store().toggle() // false -> true
      expect(store().isOpen).toBe(true)
    })
  })

  describe('close', () => {
    it('sets isOpen to false when already false', () => {
      store().close()
      expect(store().isOpen).toBe(false)
    })

    it('sets isOpen to false when open', () => {
      useChatStore.setState({ isOpen: true })
      store().close()
      expect(store().isOpen).toBe(false)
    })

    it('does not affect messages when closing', () => {
      store().addMessage('user', 'Test message')
      useChatStore.setState({ isOpen: true })
      store().close()
      expect(store().messages).toHaveLength(1)
      expect(store().messages[0].text).toBe('Test message')
    })
  })

  describe('state shape', () => {
    it('has all required actions', () => {
      const s = store()
      expect(typeof s.addMessage).toBe('function')
      expect(typeof s.toggle).toBe('function')
      expect(typeof s.close).toBe('function')
    })

    it('messages have the correct ChatMessage shape', () => {
      store().addMessage('user', 'Shape test')
      const msg = store().messages[0]
      expect(msg).toHaveProperty('id')
      expect(msg).toHaveProperty('role')
      expect(msg).toHaveProperty('text')
      expect(msg).toHaveProperty('ts')
    })
  })
})
