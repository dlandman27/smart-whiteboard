import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectorsBoardView } from '../ConnectorsBoardView'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useGCal', () => ({
  useGCalStatus:      vi.fn().mockReturnValue({ data: { connected: false } }),
  startGCalAuth:      vi.fn().mockResolvedValue('http://auth-url'),
  disconnectGCal:     vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../hooks/useTasks', () => ({
  useTasksStatus:     vi.fn().mockReturnValue({ data: { connected: false } }),
}))

vi.mock('../../hooks/useSpotify', () => ({
  useSpotifyStatus:   vi.fn().mockReturnValue({ data: { connected: false } }),
  startSpotifyAuth:   vi.fn().mockResolvedValue('http://spotify-auth'),
}))

vi.mock('../../store/spotify', () => ({
  useSpotifyCredentials: vi.fn().mockReturnValue({
    clientId: '', clientSecret: '', redirectUri: '', set: vi.fn(),
  }),
}))

vi.mock('../../hooks/useHashRouter', () => ({
  useHashFragment: vi.fn().mockReturnValue(null),
}))

vi.mock('../../lib/apiFetch', () => ({
  apiFetch: vi.fn().mockResolvedValue({ services: {
    notion: false, notionOauth: false, anthropic: false,
    elevenlabs: false, youtube: false, bing: false, googleOauth: false,
  }}),
}))

vi.mock('../ProviderIcon', () => ({
  ProviderIcon: ({ provider }: { provider: string }) => (
    <span data-testid={`provider-icon-${provider}`}>{provider}</span>
  ),
}))

vi.mock('@whiteboard/ui-kit', () => {
  const React = require('react')
  return {
    Icon:       ({ icon }: any) => <span data-testid={`icon-${icon}`} />,
    ScrollArea: ({ children, style, className }: any) => <div style={style} className={className}>{children}</div>,
    Text:       ({ children, ...p }: any) => <span {...p}>{children}</span>,
    Button:     ({ children, onClick, variant, disabled, fullWidth, size }: any) => (
      <button onClick={onClick} data-variant={variant} disabled={disabled}>{children}</button>
    ),
    Input:      ({ label, value, onChange, type, placeholder }: any) => (
      <input aria-label={label} value={value} onChange={onChange} type={type} placeholder={placeholder} />
    ),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderView() {
  return render(
    <QueryClientProvider client={makeQC()}>
      <ConnectorsBoardView />
    </QueryClientProvider>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConnectorsBoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing (smoke test)', () => {
    renderView()
    expect(screen.getByText('Connectors')).toBeInTheDocument()
  })

  it('shows the subtitle description', () => {
    renderView()
    expect(screen.getByText(/Connect apps and services/i)).toBeInTheDocument()
  })

  it('shows a search input', () => {
    renderView()
    expect(screen.getByPlaceholderText('Search connectors')).toBeInTheDocument()
  })

  it('shows category tabs', () => {
    renderView()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Media')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('shows all connector cards by default', () => {
    renderView()
    expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    expect(screen.getByText('Google Tasks')).toBeInTheDocument()
    expect(screen.getByText('Spotify')).toBeInTheDocument()
    expect(screen.getByText('Notion')).toBeInTheDocument()
    expect(screen.getByText('Walli AI')).toBeInTheDocument()
  })

  it('shows Not connected status for Google Calendar when disconnected', () => {
    renderView()
    // Multiple "Not connected" labels may appear
    const notConnected = screen.getAllByText('Not connected')
    expect(notConnected.length).toBeGreaterThan(0)
  })

  it('shows Connected status for Google Calendar when connected', async () => {
    const { useGCalStatus } = await import('../../hooks/useGCal')
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: true } } as any)
    renderView()
    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0)
  })

  it('shows Enabled row when a connector is connected', async () => {
    const { useGCalStatus } = await import('../../hooks/useGCal')
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: true } } as any)
    renderView()
    // "Enabled" appears in the enabled-row section header and in each EnabledPill
    const enabledEls = screen.getAllByText('Enabled')
    expect(enabledEls.length).toBeGreaterThan(0)
  })

  it('filters connectors by category when Tasks tab clicked', async () => {
    renderView()
    const tasksTab = screen.getByText('Tasks')
    fireEvent.click(tasksTab)
    await waitFor(() => {
      expect(screen.getByText('Google Tasks')).toBeInTheDocument()
      // Spotify should not appear in tasks category
      expect(screen.queryByText('Spotify')).not.toBeInTheDocument()
    })
  })

  it('filters connectors by search query', async () => {
    renderView()
    const searchInput = screen.getByPlaceholderText('Search connectors')
    fireEvent.change(searchInput, { target: { value: 'Spotify' } })
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument()
      expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument()
    })
  })

  it('shows no results message for unknown search term', async () => {
    renderView()
    const searchInput = screen.getByPlaceholderText('Search connectors')
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } })
    await waitFor(() => {
      expect(screen.getByText(/No connectors match/i)).toBeInTheDocument()
    })
  })

  it('clears search when X button is clicked', async () => {
    renderView()
    const searchInput = screen.getByPlaceholderText('Search connectors')
    fireEvent.change(searchInput, { target: { value: 'Spotify' } })
    // X button appears when there's a search value
    await waitFor(() => screen.getByTestId('icon-X'))
    const clearBtn = screen.getByTestId('icon-X').closest('button')!
    fireEvent.click(clearBtn)
    await waitFor(() => {
      expect((searchInput as HTMLInputElement).value).toBe('')
    })
  })

  it('shows Connect button for Google Calendar when disconnected', () => {
    renderView()
    const connectBtns = screen.getAllByText('Connect')
    expect(connectBtns.length).toBeGreaterThan(0)
  })

  it('shows Disconnect button for GCal when connected', async () => {
    const { useGCalStatus } = await import('../../hooks/useGCal')
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: true } } as any)
    renderView()
    expect(screen.getByText('Disconnect')).toBeInTheDocument()
  })

  it('shows Media category connectors when Media tab clicked', async () => {
    renderView()
    const mediaTab = screen.getByText('Media')
    fireEvent.click(mediaTab)
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument()
      expect(screen.getByText('YouTube')).toBeInTheDocument()
    })
  })
})
