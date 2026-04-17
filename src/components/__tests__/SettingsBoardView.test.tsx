import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsBoardView } from '../SettingsBoardView'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn().mockImplementation((selector?: (s: any) => any) => {
    const state = {
      activeThemeId: 'slate',
      background: null,
      petsEnabled: false,
      setBackground: vi.fn(),
      setTheme: vi.fn(),
      setPetsEnabled: vi.fn(),
    }
    return selector ? selector(state) : state
  }),
}))

vi.mock('../ThemePicker', () => ({
  ThemePicker: () => <div data-testid="theme-picker">ThemePicker</div>,
}))

vi.mock('../BackgroundPicker', () => ({
  BackgroundPicker: ({ onSelect }: any) => (
    <div data-testid="background-picker">BackgroundPicker</div>
  ),
}))

vi.mock('../SchedulePanel', () => ({
  SchedulePanel: () => <div data-testid="schedule-panel">SchedulePanel</div>,
}))

vi.mock('../AgentManager', () => ({
  AgentManager: () => <div data-testid="agent-manager">AgentManager</div>,
}))

vi.mock('../PetBar', () => ({
  SPRITES: {
    cat: { frames: [[[]]], size: 16, speed: 1 },
    dog: { frames: [[[]]], size: 16, speed: 1 },
  },
  PX: 2,
  PixelSprite: ({ sprite }: any) => <div data-testid="pixel-sprite" />,
}))

vi.mock('../../constants/backgrounds', () => ({
  DEFAULT_BACKGROUND: { type: 'none', value: '' },
}))

vi.mock('@whiteboard/ui-kit', () => {
  const React = require('react')
  return {
    FlexRow:    ({ children, style, align, gap, className }: any) => <div style={style} className={className}>{children}</div>,
    FlexCol:    ({ children, style, gap, className }: any) => <div style={style} className={className}>{children}</div>,
    Box:        ({ children, style }: any) => <div style={style}>{children}</div>,
    Text:       ({ children, ...p }: any) => <span {...p}>{children}</span>,
    Icon:       ({ icon, size, style }: any) => <span data-testid={`icon-${icon}`} style={style} />,
    ScrollArea: ({ children }: any) => <div>{children}</div>,
    Button:     ({ children, onClick, variant, disabled, size }: any) => (
      <button onClick={onClick} data-variant={variant} disabled={disabled}>{children}</button>
    ),
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SettingsBoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch for briefing settings
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ time: '' }),
      ok: true,
    } as any)
  })

  it('renders without crashing (smoke test)', () => {
    render(<SettingsBoardView />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows the Settings header with Gear icon', () => {
    render(<SettingsBoardView />)
    expect(screen.getByTestId('icon-Gear')).toBeInTheDocument()
    expect(screen.getByText('Customize your whiteboard')).toBeInTheDocument()
  })

  it('shows all navigation sections in the left nav', () => {
    render(<SettingsBoardView />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('shows Appearance section by default', () => {
    render(<SettingsBoardView />)
    expect(screen.getByTestId('theme-picker')).toBeInTheDocument()
    expect(screen.getByTestId('background-picker')).toBeInTheDocument()
  })

  it('switches to General section when General is clicked', async () => {
    render(<SettingsBoardView />)
    const generalBtn = screen.getAllByText('General').find(el => el.tagName === 'BUTTON' || el.closest('button'))
    const btn = generalBtn?.closest('button') ?? screen.getByRole('button', { name: /General/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByTestId('schedule-panel')).toBeInTheDocument()
    })
  })

  it('switches to Agents section when Agents is clicked', async () => {
    render(<SettingsBoardView />)
    const btn = screen.getByRole('button', { name: /Agents/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByTestId('agent-manager')).toBeInTheDocument()
    })
  })

  it('switches to Account section when Account is clicked', async () => {
    render(<SettingsBoardView />)
    const btn = screen.getByRole('button', { name: /Account/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })
  })

  it('shows the pets toggle in Agents section', async () => {
    render(<SettingsBoardView />)
    const btn = screen.getByRole('button', { name: /Agents/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText('Agent Pets')).toBeInTheDocument()
    })
  })

  it('shows pixel sprite gallery in Agents section', async () => {
    render(<SettingsBoardView />)
    const btn = screen.getByRole('button', { name: /Agents/i })
    fireEvent.click(btn)
    await waitFor(() => {
      const sprites = screen.getAllByTestId('pixel-sprite')
      expect(sprites.length).toBeGreaterThan(0)
    })
  })

  it('shows Sign out button in Account section and calls supabase signOut on click', async () => {
    // Add signOut to the supabase mock
    const { supabase } = await import('../../lib/supabase')
    const mockSignOut = vi.fn().mockResolvedValue({})
    ;(supabase.auth as any).signOut = mockSignOut
    // Mock window.location.href setter
    delete (window as any).location
    ;(window as any).location = { href: '' }
    render(<SettingsBoardView />)
    const btn = screen.getByRole('button', { name: /Account/i })
    fireEvent.click(btn)
    await waitFor(() => screen.getByText('Sign out'))
    const signOutBtn = screen.getByText('Sign out').closest('button')!
    fireEvent.click(signOutBtn)
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('highlights active nav item', () => {
    render(<SettingsBoardView />)
    // The appearance button should have the active indicator
    // We can check that the active indicator span is present
    const activeIndicators = document.querySelectorAll('[style*="var(--wt-accent)"]')
    expect(activeIndicators.length).toBeGreaterThan(0)
  })

  it('shows Morning Briefing section in General', async () => {
    render(<SettingsBoardView />)
    const btn = screen.getByRole('button', { name: /General/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText('Morning Briefing')).toBeInTheDocument()
    })
  })

  it('shows Theme and Default Background labels in Appearance section', () => {
    render(<SettingsBoardView />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Default Background')).toBeInTheDocument()
  })
})
