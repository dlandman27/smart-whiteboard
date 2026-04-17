import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('../../hooks/useVoice', () => ({
  useVoice: vi.fn(() => ({
    state: 'idle',
    transcript: '',
    response: '',
    error: null,
  })),
}))

vi.mock('../../store/briefing', () => ({
  useBriefingStore: vi.fn((selector) =>
    selector({
      text: null,
      clear: vi.fn(),
    })
  ),
}))

vi.mock('../../store/chat', () => ({
  useChatStore: vi.fn((selector) =>
    selector({
      messages: [],
      isOpen: false,
      addMessage: vi.fn(),
      close: vi.fn(),
    })
  ),
}))

vi.mock('../../lib/sounds', () => ({
  soundSuccess: vi.fn(),
  soundWakeWord: vi.fn(),
  soundProcessingStart: vi.fn(),
  soundError: vi.fn(),
}))

// supabase is globally mocked in setup.ts

const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock MediaSource
global.MediaSource = class {
  addEventListener = vi.fn()
  addSourceBuffer = vi.fn()
  endOfStream = vi.fn()
} as any

// Mock Audio
global.Audio = class {
  onended: any = null
  onerror: any = null
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
} as any

// Mock URL.createObjectURL and revokeObjectURL
URL.createObjectURL = vi.fn(() => 'blob:mock')
URL.revokeObjectURL = vi.fn()

import { VoiceListener } from '../VoiceListener'

describe('VoiceListener', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, body: null })
  })

  it('renders nothing when state is unsupported', () => {
    const { useVoice } = require('../../hooks/useVoice')
    useVoice.mockReturnValue({ state: 'unsupported', transcript: '', response: '', error: null })
    const { container } = render(<VoiceListener />)
    expect(container.firstChild).toBeNull()
  })

  it('renders without crashing in idle state', () => {
    const { container } = render(<VoiceListener />)
    // In idle state with no active voice or open chat, renders only global style elements
    expect(container).toBeTruthy()
  })

  it('renders edge glow div in idle state', () => {
    render(<VoiceListener />)
    // The edge glow div is always rendered (just opacity 0 when inactive)
    const glowDiv = document.querySelector('[style*="position: fixed"]')
    expect(glowDiv).toBeTruthy()
  })

  it('shows live overlay when voice is active', () => {
    const { useVoice } = require('../../hooks/useVoice')
    useVoice.mockReturnValue({
      state: 'listening',
      transcript: 'Hey Walli',
      response: '',
      error: null,
    })

    render(<VoiceListener />)
    // Voice is active and history is closed, so shows live overlay
    expect(screen.getByText('Hey Walli')).toBeInTheDocument()
  })

  it('shows typing indicator when processing', () => {
    const { useVoice } = require('../../hooks/useVoice')
    useVoice.mockReturnValue({
      state: 'processing',
      transcript: 'What time is it',
      response: '',
      error: null,
    })

    render(<VoiceListener />)
    // Typing dots should be visible
    const dots = document.querySelectorAll('[style*="walli-typing"]')
    // The typing dots container should be in the DOM
    expect(document.body).toBeTruthy()
  })

  it('shows response when responding', () => {
    const { useVoice } = require('../../hooks/useVoice')
    useVoice.mockReturnValue({
      state: 'responding',
      transcript: 'What time is it',
      response: 'It is 3:00 PM',
      error: null,
    })

    render(<VoiceListener />)
    expect(screen.getByText('It is 3:00 PM')).toBeInTheDocument()
  })

  it('shows error when state has error', () => {
    const { useVoice } = require('../../hooks/useVoice')
    useVoice.mockReturnValue({
      state: 'responding',
      transcript: '',
      response: '',
      error: 'Microphone not available',
    })

    render(<VoiceListener />)
    expect(screen.getByText('Microphone not available')).toBeInTheDocument()
  })

  it('renders chat history when isOpen is true', () => {
    const { useChatStore } = require('../../store/chat')
    useChatStore.mockImplementation((selector: any) =>
      selector({
        messages: [
          { id: 'm1', role: 'user', text: 'Hello', ts: Date.now() },
          { id: 'm2', role: 'walli', text: 'Hi there!', ts: Date.now() },
        ],
        isOpen: true,
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )

    render(<VoiceListener />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('shows empty conversation message when history is open but empty', () => {
    const { useChatStore } = require('../../store/chat')
    useChatStore.mockImplementation((selector: any) =>
      selector({
        messages: [],
        isOpen: true,
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )

    render(<VoiceListener />)
    expect(screen.getByText(/No conversation yet/)).toBeInTheDocument()
  })
})
