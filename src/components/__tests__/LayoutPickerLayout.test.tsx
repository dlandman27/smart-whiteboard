import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mocks must be at top

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'dashboard' }],
      activeBoardId: 'b1',
      setLayout: vi.fn(),
      setLayoutSpacing: vi.fn(),
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../hooks/useLayout', () => ({
  useLayout: vi.fn(() => ({
    layout: { id: 'dashboard', name: 'Dashboard', slots: [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }] },
    slotRects: [{ id: 's1', x: 16, y: 16, width: 616, height: 768 }],
    slotMap: { s1: { id: 's1', x: 16, y: 16, width: 616, height: 768 } },
    slotGap: 12,
    slotPad: 16,
  })),
  computeSlotRect: vi.fn((slot: any, w: number, h: number) => ({
    id: slot.id,
    x: slot.x * w,
    y: slot.y * h,
    width: slot.width * w,
    height: slot.height * h,
  })),
  TOOLBAR_RESERVED: 0,
}))

vi.mock('../../layouts/presets', () => ({
  LAYOUT_PRESETS: [
    { id: 'freeform',   name: 'Freeform',   slots: [] },
    { id: 'dashboard',  name: 'Dashboard',  slots: [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }] },
    { id: 'custom',     name: 'Custom (AI)', slots: [] },
  ],
  getLayoutPreset: vi.fn((id: string) => ({
    id,
    name: id,
    slots: id === 'freeform' ? [] : [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }],
  })),
}))

vi.mock('../layout/LayoutThumbnail', () => ({
  LayoutThumbnail: ({ layout, active }: any) => (
    <div data-testid={`thumbnail-${layout.id}`} data-active={String(active)} />
  ),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Panel: ({ children, onClose }: any) => (
    <div data-testid="panel">
      <button data-testid="panel-close" onClick={onClose}>X</button>
      {children}
    </div>
  ),
  PanelHeader: ({ title, onClose }: any) => (
    <div data-testid="panel-header">
      <span>{title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  Slider: ({ label, value, onChange }: any) => (
    <div data-testid={`slider-${label}`}>
      <label>{label}</label>
      <input
        type="range"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
}))

import { LayoutPicker } from '../layout/LayoutPicker'
import { useWhiteboardStore } from '../../store/whiteboard'

describe('LayoutPicker (layout subdirectory)', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<LayoutPicker onClose={onClose} />)
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('renders the Layout title', () => {
    render(<LayoutPicker onClose={onClose} />)
    expect(screen.getByText('Layout')).toBeInTheDocument()
  })

  it('renders thumbnails for each non-custom preset', () => {
    render(<LayoutPicker onClose={onClose} />)
    // custom is filtered out, freeform and dashboard should appear
    expect(screen.getByTestId('thumbnail-freeform')).toBeInTheDocument()
    expect(screen.getByTestId('thumbnail-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('thumbnail-custom')).not.toBeInTheDocument()
  })

  it('marks the active layout thumbnail as active', () => {
    render(<LayoutPicker onClose={onClose} />)
    const activeThumbnail = screen.getByTestId('thumbnail-dashboard')
    expect(activeThumbnail.dataset.active).toBe('true')
  })

  it('marks non-active thumbnails as inactive', () => {
    render(<LayoutPicker onClose={onClose} />)
    const inactiveThumbnail = screen.getByTestId('thumbnail-freeform')
    expect(inactiveThumbnail.dataset.active).toBe('false')
  })

  it('renders layout name labels', () => {
    render(<LayoutPicker onClose={onClose} />)
    expect(screen.getByText('Freeform')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders the Widget gap and Edge padding sliders', () => {
    render(<LayoutPicker onClose={onClose} />)
    expect(screen.getByTestId('slider-Widget gap')).toBeInTheDocument()
    expect(screen.getByTestId('slider-Edge padding')).toBeInTheDocument()
  })

  it('calls onClose when selecting the currently active layout', () => {
    render(<LayoutPicker onClose={onClose} />)
    fireEvent.click(screen.getByText('Dashboard'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls setLayout and onClose when selecting a different layout', () => {
    const setLayout = vi.fn()
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'dashboard' }],
        activeBoardId: 'b1',
        setLayout,
        setLayoutSpacing: vi.fn(),
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<LayoutPicker onClose={onClose} />)
    fireEvent.click(screen.getByText('Freeform'))
    expect(setLayout).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('calls setLayoutSpacing when Widget gap slider changes', () => {
    const setLayoutSpacing = vi.fn()
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'dashboard' }],
        activeBoardId: 'b1',
        setLayout: vi.fn(),
        setLayoutSpacing,
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<LayoutPicker onClose={onClose} />)
    const gapInput = screen.getByRole('slider', { name: /widget gap/i })
    fireEvent.change(gapInput, { target: { value: '20' } })
    expect(setLayoutSpacing).toHaveBeenCalled()
  })
})
