import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('../../hooks/useVoice', () => ({
  useVoice: vi.fn(),
}))

vi.mock('../../store/briefing', () => ({
  useBriefingStore: vi.fn(),
}))

vi.mock('../../store/chat', () => ({
  useChatStore: vi.fn(),
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

global.MediaSource = class {
  addEventListener = vi.fn()
  addSourceBuffer = vi.fn()
  endOfStream = vi.fn()
} as any

global.Audio = class {
  onended: any = null
  onerror: any = null
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
} as any

URL.createObjectURL = vi.fn(() => 'blob:mock')
URL.revokeObjectURL = vi.fn()

import { VoiceListener } from '../VoiceListener'
import { useVoice } from '../../hooks/useVoice'
import { useBriefingStore } from '../../store/briefing'
import { useChatStore } from '../../store/chat'

const mockUseVoice = vi.mocked(useVoice)
const mockUseBriefing = vi.mocked(useBriefingStore)
const mockUseChat = vi.mocked(useChatStore)

const defaultClearBriefing = vi.fn()
const defaultAddMessage = vi.fn()
const defaultClose = vi.fn()

describe('VoiceListener', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, body: null })

    mockUseVoice.mockReturnValue({
      state: 'idle',
      transcript: '',
      response: '',
      error: null,
    })

    mockUseBriefing.mockImplementation((selector?: any) => {
      const state = { text: null, clear: defaultClearBriefing }
      return selector ? selector(state) : state
    })

    mockUseChat.mockImplementation((selector?: any) => {
      const state = { messages: [], isOpen: false, addMessage: defaultAddMessage, close: defaultClose }
      return selector ? selector(state) : state
    })
  })

  it('renders nothing when state is unsupported', () => {
    mockUseVoice.mockReturnValue({ state: 'unsupported', transcript: '', response: '', error: null })
    const { container } = render(<VoiceListener />)
    expect(container.firstChild).toBeNull()
  })

  it('renders without crashing in idle state', () => {
    const { container } = render(<VoiceListener />)
    expect(container).toBeTruthy()
  })

  it('shows live overlay when voice is active with transcript', () => {
    mockUseVoice.mockReturnValue({ state: 'listening', transcript: 'Hey Walli', response: '', error: null })
    render(<VoiceListener />)
    expect(screen.getByText('Hey Walli')).toBeInTheDocument()
  })

  it('shows response when responding', () => {
    mockUseVoice.mockReturnValue({ state: 'responding', transcript: 'What time is it', response: 'It is 3:00 PM', error: null })
    render(<VoiceListener />)
    expect(screen.getByText('It is 3:00 PM')).toBeInTheDocument()
  })

  it('shows error when state has error', () => {
    mockUseVoice.mockReturnValue({ state: 'responding', transcript: '', response: '', error: 'Microphone not available' })
    render(<VoiceListener />)
    expect(screen.getByText('Microphone not available')).toBeInTheDocument()
  })

  it('renders chat history when isOpen is true', () => {
    mockUseChat.mockImplementation((selector?: any) => {
      const state = {
        messages: [
          { id: 'm1', role: 'user', text: 'Hello', ts: Date.now() },
          { id: 'm2', role: 'walli', text: 'Hi there!', ts: Date.now() },
        ],
        isOpen: true,
        addMessage: defaultAddMessage,
        close: defaultClose,
      }
      return selector ? selector(state) : state
    })
    render(<VoiceListener />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('shows empty conversation message when history is open but empty', () => {
    mockUseChat.mockImplementation((selector?: any) => {
      const state = { messages: [], isOpen: true, addMessage: defaultAddMessage, close: defaultClose }
      return selector ? selector(state) : state
    })
    render(<VoiceListener />)
    expect(screen.getByText(/No conversation yet/)).toBeInTheDocument()
  })
})
