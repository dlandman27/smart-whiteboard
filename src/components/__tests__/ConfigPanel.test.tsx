import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@whiteboard/ui-kit', () => ({
  Panel:          ({ children }: any) => <div data-testid="panel">{children}</div>,
  PanelHeader:    ({ title, onClose }: any) => (
    <div data-testid="panel-header">
      <span>{title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  Input:          ({ label, value, onChange, type, placeholder }: any) => (
    <div>
      <label>{label}</label>
      <input type={type ?? 'text'} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  ),
  Button:         ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Text:           ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

vi.mock('../../hooks/useGCal', () => ({
  useGCalStatus:  vi.fn(),
  startGCalAuth:  vi.fn(),
  disconnectGCal: vi.fn(),
}))

vi.mock('../../hooks/useSpotify', () => ({
  useSpotifyStatus: vi.fn(),
  startSpotifyAuth: vi.fn(),
}))

vi.mock('../../store/spotify', () => ({
  useSpotifyCredentials: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { ConfigPanel } from '../ConfigPanel'
import { useGCalStatus } from '../../hooks/useGCal'
import { useSpotifyStatus } from '../../hooks/useSpotify'
import { useSpotifyCredentials } from '../../store/spotify'

describe('ConfigPanel', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useGCalStatus).mockReturnValue({ data: undefined, isLoading: false } as any)
    vi.mocked(useSpotifyStatus).mockReturnValue({ data: undefined, isLoading: false } as any)
    vi.mocked(useSpotifyCredentials).mockImplementation((selector?: any) => {
      const state = {
        clientId:     '',
        clientSecret: '',
        redirectUri:  'http://localhost:3001/api/spotify/callback',
        set:          vi.fn(),
      }
      return selector ? selector(state) : state
    })

    mockFetch.mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ time: '08:00' }),
    })
  })

  it('renders without crashing', () => {
    render(<ConfigPanel onClose={onClose} />)
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('renders Settings title', () => {
    render(<ConfigPanel onClose={onClose} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders Briefing and Connections tabs', () => {
    render(<ConfigPanel onClose={onClose} />)
    expect(screen.getByText('Briefing')).toBeInTheDocument()
    expect(screen.getByText('Connections')).toBeInTheDocument()
  })

  it('shows briefing section by default', () => {
    render(<ConfigPanel onClose={onClose} />)
    expect(screen.getByText('Preview briefing now')).toBeInTheDocument()
  })

  it('switches to connections tab when clicked', () => {
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    expect(screen.getByText('Spotify')).toBeInTheDocument()
  })

  it('shows "Not connected" status when GCal is not connected and not configured', () => {
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: false, configured: false } } as any)
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    // Both GCal and Spotify may show "Not set up"
    const badges = screen.getAllByText('Not set up')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('shows "Not connected" when GCal configured but not connected', () => {
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: false, configured: true } } as any)
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    expect(screen.getByText('Not connected')).toBeInTheDocument()
  })

  it('shows "Connected" when GCal is connected', () => {
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: true, configured: true } } as any)
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows "Disconnect" button when GCal is connected', () => {
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: true, configured: true } } as any)
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    // The ConnectionRow for GCal shows "Disconnect" when connected
    const disconnectBtns = screen.getAllByText('Disconnect')
    expect(disconnectBtns.length).toBeGreaterThan(0)
  })

  it('shows "Connect" button when GCal is not connected', () => {
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: false, configured: true } } as any)
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    const connectBtns = screen.getAllByText('Connect')
    expect(connectBtns.length).toBeGreaterThan(0)
  })

  it('shows "Not set up" for Spotify when credentials are empty', () => {
    vi.mocked(useSpotifyStatus).mockReturnValue({ data: undefined } as any)
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    // Spotify has no clientId => configured=false => "Not set up"
    const badges = screen.getAllByText('Not set up')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('shows "Connected" for Spotify when connected', () => {
    vi.mocked(useSpotifyStatus).mockReturnValue({ data: { connected: true } } as any)
    vi.mocked(useSpotifyCredentials).mockImplementation((selector?: any) => {
      const state = {
        clientId:    'cid',
        clientSecret:'secret',
        redirectUri: 'http://localhost:3001/api/spotify/callback',
        set:         vi.fn(),
      }
      return selector ? selector(state) : state
    })
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Connections'))
    const connectedBadges = screen.getAllByText('Connected')
    expect(connectedBadges.length).toBeGreaterThan(0)
  })

  it('calls onClose when close button is clicked', () => {
    render(<ConfigPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('briefing section has a time input', () => {
    render(<ConfigPanel onClose={onClose} />)
    const timeInput = document.querySelector('input[type="time"]')
    expect(timeInput).toBeInTheDocument()
  })

  it('briefing section has a Save button', () => {
    render(<ConfigPanel onClose={onClose} />)
    expect(screen.getByText('Save')).toBeInTheDocument()
  })
})
