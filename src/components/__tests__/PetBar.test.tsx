import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

const mockClearMessage = vi.fn()

vi.mock('../../store/pets', () => ({
  usePetsStore: vi.fn((selector) =>
    selector({
      pets: {},
      clearMessage: mockClearMessage,
    })
  ),
}))

vi.mock('../pets/WalkingPet', () => ({
  WalkingPet: ({ agent, mood, message, inspecting, onInspect }: any) => (
    <div
      data-testid={`walking-pet-${agent.id}`}
      data-mood={mood}
      data-inspecting={inspecting}
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

const mockAgents = [
  { id: 'task-monitor', name: 'Task Monitor', icon: '📋', spriteType: 'cat', enabled: true, lastRun: null, nextRun: null },
  { id: 'calendar-agent', name: 'Calendar Agent', icon: '📅', spriteType: 'dog', enabled: true, lastRun: null, nextRun: null },
]

describe('PetBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgents),
    })
  })

  it('renders without crashing (empty initially)', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const { container } = render(<PetBar />)
    // Should render an empty fragment while fetching
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
    const { usePetsStore } = require('../../store/pets')
    usePetsStore.mockImplementation((selector: any) =>
      selector({
        pets: { 'task-monitor': { agentId: 'task-monitor', mood: 'speaking', message: 'Hello!' } },
        clearMessage: mockClearMessage,
      })
    )

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
    // Should not crash
  })
})
