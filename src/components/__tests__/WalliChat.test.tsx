import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock dependencies before importing the component
vi.mock('../../store/chat', () => ({
  useChatStore: vi.fn((selector) =>
    selector({
      messages: [],
      isOpen: false,
      toggle: vi.fn(),
      addMessage: vi.fn(),
      close: vi.fn(),
    })
  ),
}))

vi.mock('../Logo', () => ({
  Logo: ({ size }: { size: number }) => <div data-testid="logo" style={{ width: size, height: size }} />,
}))

import { WalliChatButton } from '../WalliChat'
import { useChatStore } from '../../store/chat'

describe('WalliChatButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the chat button', () => {
    render(<WalliChatButton />)
    const btn = screen.getByTitle('Open Walli chat')
    expect(btn).toBeInTheDocument()
  })

  it('shows "Close chat" title when chat is open', () => {
    vi.mocked(useChatStore).mockImplementation((selector: any) =>
      selector({
        messages: [],
        isOpen: true,
        toggle: vi.fn(),
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )
    render(<WalliChatButton />)
    expect(screen.getByTitle('Close chat')).toBeInTheDocument()
  })

  it('renders the Logo component', () => {
    vi.mocked(useChatStore).mockImplementation((selector: any) =>
      selector({
        messages: [],
        isOpen: false,
        toggle: vi.fn(),
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )
    render(<WalliChatButton />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('calls toggle when button is pointer-downed', () => {
    const mockToggle = vi.fn()
    vi.mocked(useChatStore).mockImplementation((selector: any) =>
      selector({
        messages: [],
        isOpen: false,
        toggle: mockToggle,
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )
    render(<WalliChatButton />)
    const btn = screen.getByTitle('Open Walli chat')
    fireEvent.pointerDown(btn)
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('shows notification dot when there are messages and chat is closed', () => {
    vi.mocked(useChatStore).mockImplementation((selector: any) =>
      selector({
        messages: [{ id: '1', role: 'walli', text: 'hi', ts: Date.now() }],
        isOpen: false,
        toggle: vi.fn(),
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )
    const { container } = render(<WalliChatButton />)
    // The dot is a div with borderRadius 50%
    const dots = container.querySelectorAll('[style*="border-radius: 50%"]')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('does not show notification dot when chat is open even with messages', () => {
    vi.mocked(useChatStore).mockImplementation((selector: any) =>
      selector({
        messages: [{ id: '1', role: 'walli', text: 'hi', ts: Date.now() }],
        isOpen: true,
        toggle: vi.fn(),
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )
    const { container } = render(<WalliChatButton />)
    const dots = container.querySelectorAll('[style*="border-radius: 50%"]')
    expect(dots.length).toBe(0)
  })

  it('button has reduced opacity when chat is closed', () => {
    vi.mocked(useChatStore).mockImplementation((selector: any) =>
      selector({
        messages: [],
        isOpen: false,
        toggle: vi.fn(),
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )
    render(<WalliChatButton />)
    const btn = screen.getByTitle('Open Walli chat')
    expect(btn.style.opacity).toBe('0.4')
  })

  it('button has full opacity when chat is open', () => {
    vi.mocked(useChatStore).mockImplementation((selector: any) =>
      selector({
        messages: [],
        isOpen: true,
        toggle: vi.fn(),
        addMessage: vi.fn(),
        close: vi.fn(),
      })
    )
    render(<WalliChatButton />)
    const btn = screen.getByTitle('Close chat')
    expect(btn.style.opacity).toBe('1')
  })
})
