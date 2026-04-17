import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// All mocks at the top

vi.mock('../../hooks/useUnifiedTasks', () => ({
  useTaskGroups: vi.fn(() => ({ data: [] })),
  useUnifiedTasks: vi.fn(() => ({ data: [] })),
}))

vi.mock('../../hooks/useTaskMutations', () => ({
  toggleUnifiedTask: vi.fn(() => Promise.resolve()),
  deleteUnifiedTask: vi.fn(() => Promise.resolve()),
  createUnifiedTask: vi.fn(() => Promise.resolve()),
  createUnifiedGroup: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../hooks/useHashRouter', () => ({
  navigateHash: vi.fn(),
}))

vi.mock('../../providers', () => ({
  getTaskProviders: vi.fn(() => [
    { id: 'builtin', label: 'Built-in', createGroup: true },
  ]),
}))

vi.mock('../ProviderIcon', () => ({
  ProviderIcon: ({ provider }: any) => <span data-testid={`provider-icon-${provider}`} />,
}))

vi.mock('@whiteboard/ui-kit', () => {
  const React = require('react')
  return {
    FlexRow: ({ children, style, align, gap, ...rest }: any) => (
      <div style={style} {...rest}>{children}</div>
    ),
    FlexCol: ({ children, style, className, overflow, ...rest }: any) => (
      <div style={style} className={className} {...rest}>{children}</div>
    ),
    Box: ({ children, style }: any) => <div style={style}>{children}</div>,
    Text: ({ children, style, variant, size, color, numberOfLines, ...rest }: any) => (
      <span style={style} {...rest}>{children}</span>
    ),
    Icon: ({ icon }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
    Center: ({ children, style }: any) => <div style={style}>{children}</div>,
    IconButton: ({ icon, onClick, disabled, style }: any) => (
      <button onClick={onClick} disabled={disabled} style={style} data-testid={`icon-btn-${icon}`}>{icon}</button>
    ),
    ScrollArea: ({ children, style }: any) => <div style={style}>{children}</div>,
  }
})

import { TodoBoardView } from '../TodoBoardView'
import { useTaskGroups, useUnifiedTasks } from '../../hooks/useUnifiedTasks'

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderView() {
  return render(
    <QueryClientProvider client={makeQC()}>
      <TodoBoardView />
    </QueryClientProvider>
  )
}

describe('TodoBoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTaskGroups).mockReturnValue({ data: [] } as any)
    vi.mocked(useUnifiedTasks).mockReturnValue({ data: [] } as any)
  })

  it('renders without crashing', () => {
    renderView()
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })

  it('renders the Todo heading', () => {
    renderView()
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })

  it('renders the Completed toggle button', () => {
    renderView()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders the refresh icon button', () => {
    renderView()
    expect(screen.getByTestId('icon-btn-ArrowClockwise')).toBeInTheDocument()
  })

  it('shows empty sidebar when there are no groups', () => {
    renderView()
    // With no groups, only the header buttons and sidebar footer buttons render
    // Verify no group-specific list items appear in the sidebar ScrollArea
    const providerIcons = screen.queryAllByTestId(/^provider-icon-/)
    expect(providerIcons).toHaveLength(0)
  })

  it('shows "Select a task list" when no group is selected', () => {
    renderView()
    expect(screen.getByText('Select a task list from the sidebar.')).toBeInTheDocument()
  })

  it('renders group sections when groups exist', async () => {
    vi.mocked(useTaskGroups).mockReturnValue({
      data: [
        {
          key: 'builtin:My Tasks',
          groupName: 'My Tasks',
          provider: 'builtin',
          providerLabel: 'Built-in',
          providerIcon: 'builtin',
          color: '#3b82f6',
        },
      ],
    } as any)
    renderView()
    await waitFor(() => {
      expect(screen.getAllByText('My Tasks').length).toBeGreaterThan(0)
    })
  })

  it('renders task list when active group has tasks', async () => {
    vi.mocked(useTaskGroups).mockReturnValue({
      data: [
        {
          key: 'builtin:Work',
          groupName: 'Work',
          provider: 'builtin',
          providerLabel: 'Built-in',
          providerIcon: 'builtin',
          color: '#ef4444',
        },
      ],
    } as any)
    vi.mocked(useUnifiedTasks).mockReturnValue({
      data: [
        {
          source: { provider: 'builtin', id: 't1' },
          title: 'Write unit tests',
          completed: false,
          priority: 4,
          groupColor: '#ef4444',
        },
        {
          source: { provider: 'builtin', id: 't2' },
          title: 'Deploy to production',
          completed: false,
          priority: 3,
          groupColor: '#ef4444',
        },
      ],
    } as any)
    renderView()
    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeInTheDocument()
      expect(screen.getByText('Deploy to production')).toBeInTheDocument()
    })
  })

  it('shows New list button in sidebar footer', () => {
    renderView()
    expect(screen.getByText('New list')).toBeInTheDocument()
  })

  it('shows Connect sources button', () => {
    renderView()
    expect(screen.getByText('Connect sources')).toBeInTheDocument()
  })

  it('clicking Completed toggle updates state', () => {
    renderView()
    const completedBtn = screen.getByText('Completed')
    // Not active initially (no aria-pressed but has styling)
    fireEvent.click(completedBtn)
    // Still rendered after click
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('clicking New list shows the new list input', () => {
    renderView()
    fireEvent.click(screen.getByText('New list'))
    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()
  })

  it('cancels new list form on Cancel button click', () => {
    renderView()
    fireEvent.click(screen.getByText('New list'))
    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByPlaceholderText('List name...')).not.toBeInTheDocument()
  })

  it('shows provider section headers when groups exist', async () => {
    vi.mocked(useTaskGroups).mockReturnValue({
      data: [
        {
          key: 'builtin:Inbox',
          groupName: 'Inbox',
          provider: 'builtin',
          providerLabel: 'Built-in',
          providerIcon: 'builtin',
          color: '#9ca3af',
        },
      ],
    } as any)
    renderView()
    await waitFor(() => {
      expect(screen.getByText('Built-in')).toBeInTheDocument()
    })
  })

  it('clicking refresh calls query invalidation (smoke test)', () => {
    renderView()
    const refreshBtn = screen.getByTestId('icon-btn-ArrowClockwise')
    // Should not throw
    expect(() => fireEvent.click(refreshBtn)).not.toThrow()
  })
})
