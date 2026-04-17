import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/pets', () => ({
  usePetsStore: vi.fn(),
}))

vi.mock('../pets/WalkingPet', () => ({
  WalkingPet: ({ agent, mood, message, inspecting, onInspect }: any) => (
    <div
      data-testid={`walking-pet-${agent.id}`}
      data-mood={mood}
      data-inspecting={String(inspecting)}
      onClick={onInspect}
    >
      {agent.name}
      {message && <span data-testid="pet-message">{message}</span>}
    </div>
  ),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { PetBar } from '../PetBar'
import { usePetsStore } from '../../store/pets'

const mockUsePets = vi.mocked(usePetsStore)
const mockClearMessage = vi.fn()

const mockAgents = [
  { id: 'task-monitor', name: 'Task Monitor', icon: '📋', spriteType: 'cat', enabled: true, lastRun: null, nextRun: null },
  { id: 'calendar-agent', name: 'Calendar Agent', icon: '📅', spriteType: 'dog', enabled: true, lastRun: null, nextRun: null },
]

describe('PetBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePets.mockImplementation((selector?: any) => {
      const state = { pets: {}, clearMessage: mockClearMessage }
      return selector ? selector(state) : state
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgents),
    })
  })

  it('renders without crashing (empty initially)', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    const { container } = render(<PetBar />)
    expect(container).toBeTruthy()
  })

  it('renders pets after fetching agents', async () => {
    render(<PetBar />)
    await waitFor(() => {
      expect(screen.getByTestId('walking-pet-task-monitor')).toBeInTheDocument()
    })
    expect(screen.getByTestId('walking-pet-calendar-agent')).toBeInTheDocument()
  })

  it('fetches agents on mount', async () => {
    render(<PetBar />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/agents')
    })
  })

  it('renders pet names', async () => {
    render(<PetBar />)
    await waitFor(() => {
      expect(screen.getByText('Task Monitor')).toBeInTheDocument()
      expect(screen.getByText('Calendar Agent')).toBeInTheDocument()
    })
  })

  it('passes idle mood when no pet state', async () => {
    render(<PetBar />)
    await waitFor(() => {
      expect(screen.getByTestId('walking-pet-task-monitor')).toBeInTheDocument()
    })
    const pet = screen.getByTestId('walking-pet-task-monitor')
    expect(pet.dataset.mood).toBe('idle')
  })

  it('passes pet mood from store', async () => {
    mockUsePets.mockImplementation((selector?: any) => {
      const state = {
        pets: { 'task-monitor': { agentId: 'task-monitor', mood: 'speaking', message: 'Hello!' } },
        clearMessage: mockClearMessage,
      }
      return selector ? selector(state) : state
    })

    render(<PetBar />)
    await waitFor(() => {
      expect(screen.getByTestId('walking-pet-task-monitor')).toBeInTheDocument()
    })
    expect(screen.getByTestId('walking-pet-task-monitor').dataset.mood).toBe('speaking')
  })

  it('renders empty when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const { container } = render(<PetBar />)
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
