import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{ agentId: 'apollo', label: undefined }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

vi.mock('../../../store/walliAgents', () => ({
  useWalliAgentsStore: Object.assign(
    vi.fn((selector: any) => {
      const store = { widgets: {} }
      return selector(store)
    }),
    { getState: vi.fn().mockReturnValue({ setWidget: vi.fn(), widgets: {} }) }
  ),
}))

import { WalliAgentWidget } from '../WalliAgentWidget'
import { useWalliAgentsStore } from '../../../store/walliAgents'

describe('WalliAgentWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]))
    )
    // Reset mock to default empty state
    vi.mocked(useWalliAgentsStore).mockImplementation((selector: any) => {
      const store = { widgets: {} }
      return selector(store)
    })
  })

  it('renders without crashing', () => {
    render(<WalliAgentWidget widgetId="test-walli-1" />)
  })

  it('shows waiting state when no agent data', () => {
    render(<WalliAgentWidget widgetId="test-walli-2" />)
    expect(screen.getByText(/waiting for/i)).toBeInTheDocument()
  })

  it('shows agent label', () => {
    render(<WalliAgentWidget widgetId="test-walli-3" />)
    expect(screen.getByText('Apollo')).toBeInTheDocument()
  })

  it('shows apollo health data when agentState has data', () => {
    vi.mocked(useWalliAgentsStore).mockImplementation((selector: any) => {
      const store = {
        widgets: {
          'apollo-primary': {
            data: { steps: 7500, exercise_minutes: 25, weight: '180 lbs' },
            updated_at: new Date().toISOString(),
          },
        },
      }
      return selector(store)
    })
    render(<WalliAgentWidget widgetId="test-walli-4" />)
    expect(screen.getByText('Steps')).toBeInTheDocument()
    expect(screen.getByText(/7,500/)).toBeInTheDocument()
  })

  it('shows "Waiting for" text when agentState is absent', () => {
    vi.mocked(useWalliAgentsStore).mockImplementation((selector: any) => {
      const store = { widgets: {} }
      return selector(store)
    })
    render(<WalliAgentWidget widgetId="test-walli-5" />)
    expect(screen.getByText(/waiting for apollo/i)).toBeInTheDocument()
  })
})
