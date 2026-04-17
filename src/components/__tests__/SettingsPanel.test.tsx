import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@whiteboard/ui-kit', () => ({
  Panel: ({ children, width, onClose }: any) => <div data-testid="panel">{children}</div>,
  PanelHeader: ({ title, onClose }: any) => (
    <div>
      <span>{title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  Slider: ({ label, value, min, max, onChange }: any) => (
    <div>
      <label>{label}</label>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  ),
  Text: ({ children, variant, size, style }: any) => <span style={style}>{children}</span>,
}))

vi.mock('../ThemePicker', () => ({
  ThemePicker: () => <div data-testid="theme-picker">ThemePicker</div>,
}))

vi.mock('../BackgroundPicker', () => ({
  BackgroundPicker: () => <div data-testid="background-picker">BackgroundPicker</div>,
}))

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn(),
}))

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn(),
}))

vi.mock('../../hooks/useLayout', () => ({
  useLayout: vi.fn(() => ({ slotGap: 16, slotPad: 16, slotMap: {} })),
  computeSlotRect: vi.fn(),
  TOOLBAR_RESERVED: 56,
}))

vi.mock('../../layouts/presets', () => ({
  LAYOUT_PRESETS: [
    { id: 'freeform', name: 'Freeform', slots: [] },
    { id: 'dashboard', name: 'Dashboard', slots: [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }] },
  ],
  getLayoutPreset: vi.fn((id: string) => ({ id, name: id, slots: [] })),
  DEFAULT_LAYOUT_ID: 'freeform',
}))

vi.mock('../layout/LayoutThumbnail', () => ({
  LayoutThumbnail: ({ layout }: any) => <div data-testid={`thumb-${layout.id}`}>{layout.name}</div>,
}))

vi.mock('../PetBar', () => ({
  SPRITES: { cat: { idle: [[]], walk: [[]] }, dog: { idle: [[]], walk: [[]] } },
  PX: 2,
  PixelSprite: ({ sprite, frameIdx, flip }: any) => <div data-testid="pixel-sprite" />,
}))

import { SettingsPanel } from '../SettingsPanel'
import { useWhiteboardStore } from '../../store/whiteboard'
import { useThemeStore } from '../../store/theme'

const mockUseWB = vi.mocked(useWhiteboardStore)
const mockUseTheme = vi.mocked(useThemeStore)

const defaultWBState = {
  boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'freeform', slotGap: 16, slotPad: 16 }],
  activeBoardId: 'b1',
  setLayout: vi.fn(),
  setLayoutSpacing: vi.fn(),
}

const defaultThemeState = {
  petsEnabled: false,
  setPetsEnabled: vi.fn(),
}

describe('SettingsPanel', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWB.mockImplementation((selector?: any) =>
      selector ? selector(defaultWBState) : defaultWBState
    )
    mockUseTheme.mockImplementation((selector?: any) =>
      selector ? selector(defaultThemeState) : defaultThemeState
    )
  })

  it('renders without crashing', () => {
    render(<SettingsPanel onClose={onClose} />)
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('renders "Customize" title', () => {
    render(<SettingsPanel onClose={onClose} />)
    expect(screen.getByText('Customize')).toBeInTheDocument()
  })

  it('renders all tabs', () => {
    render(<SettingsPanel onClose={onClose} />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Layout')).toBeInTheDocument()
    expect(screen.getByText('Pets')).toBeInTheDocument()
  })

  it('shows theme picker by default', () => {
    render(<SettingsPanel onClose={onClose} />)
    expect(screen.getByTestId('theme-picker')).toBeInTheDocument()
  })

  it('switches to background tab', () => {
    render(<SettingsPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Background'))
    expect(screen.getByTestId('background-picker')).toBeInTheDocument()
  })

  it('switches to layout tab', () => {
    render(<SettingsPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Layout'))
    expect(screen.getByTestId('thumb-freeform')).toBeInTheDocument()
  })

  it('switches to pets tab', () => {
    render(<SettingsPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Pets'))
    expect(screen.getByText('Agent Pets')).toBeInTheDocument()
  })

  it('opens with defaultTab="background"', () => {
    render(<SettingsPanel onClose={onClose} defaultTab="background" />)
    expect(screen.getByTestId('background-picker')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<SettingsPanel onClose={onClose} />)
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalled()
  })
})
