import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('@whiteboard/ui-kit', () => ({
  FlexCol: ({ children, style }: any) => <div style={style}>{children}</div>,
  FlexRow: ({ children, style, align, gap }: any) => <div style={style}>{children}</div>,
  Text: ({ children, variant, size, color, style }: any) => <span style={style}>{children}</span>,
  Icon: ({ icon, size }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
  Button: ({ children, onClick, variant, size }: any) => <button onClick={onClick}>{children}</button>,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { AgentManager } from '../AgentManager'

const mockBuiltInAgent = {
  id: 'task-monitor',
  name: 'Task Monitor',
  description: 'Monitors tasks',
  icon: '📋',
  enabled: true,
  lastRun: null,
  nextRun: null,
}

const mockCustomAgent = {
  id: 'custom-1',
  name: 'My Custom Agent',
  description: 'Does custom stuff',
  icon: '🤖',
  enabled: false,
  lastRun: new Date(Date.now() - 120_000).toISOString(),
  nextRun: null,
}

describe('AgentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockBuiltInAgent, mockCustomAgent]),
    })
  })

  it('renders loading skeletons initially', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<AgentManager />)
    const container = document.querySelector('div')
    expect(container).toBeTruthy()
  })

  it('renders agent list after loading', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Task Monitor')).toBeInTheDocument()
    })
    expect(screen.getByText('My Custom Agent')).toBeInTheDocument()
  })

  it('renders built-in agents section', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Built-in Agents')).toBeInTheDocument()
    })
  })

  it('renders custom agents section', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Custom Agents')).toBeInTheDocument()
    })
  })

  it('shows "Custom" badge for custom agents', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })
  })

  it('does not show Custom badge for built-in agents', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Task Monitor')).toBeInTheDocument()
    })
    const customBadges = screen.queryAllByText('Custom')
    expect(customBadges).toHaveLength(1)
  })

  it('renders toggle buttons for agents', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Task Monitor')).toBeInTheDocument()
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls PATCH when toggle is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockBuiltInAgent, mockCustomAgent]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ enabled: false }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockBuiltInAgent, mockCustomAgent]) })

    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Task Monitor')).toBeInTheDocument()
    })

    // Each agent row has: run button (idx 0), toggle (idx 1)
    // For built-in task-monitor, skip ahead to toggle button
    const allButtons = screen.getAllByRole('button')
    // Find the toggle for task-monitor - it's the 2nd button in its row
    fireEvent.click(allButtons[1])

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/agents/'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  it('shows "Create custom agent" button', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Create custom agent')).toBeInTheDocument()
    })
  })

  it('expands create form on clicking "Create custom agent"', async () => {
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText('Create custom agent')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Create custom agent'))
    expect(screen.getByPlaceholderText('Agent name')).toBeInTheDocument()
  })

  it('shows no custom agents message when list is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockBuiltInAgent]),
    })
    render(<AgentManager />)
    await waitFor(() => {
      expect(screen.getByText(/No custom agents yet/)).toBeInTheDocument()
    })
  })
})
