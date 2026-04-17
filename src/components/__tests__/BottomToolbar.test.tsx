import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BottomToolbar } from '../BottomToolbar'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn().mockImplementation((selector?: (s: any) => any) => {
    const state = {
      activeBoardId: 'board-1',
      boards: [],
      widgets: {},
    }
    return selector ? selector(state) : state
  }),
}))

vi.mock('../../store/voice', () => ({
  useVoiceStore: vi.fn().mockImplementation((selector?: (s: any) => any) => {
    const state = { state: 'idle' }
    return selector ? selector(state) : state
  }),
}))

vi.mock('../../store/ui', () => ({
  useUIStore: vi.fn().mockImplementation((selector?: (s: any) => any) => {
    const state = {
      setScreensaverMode: vi.fn(),
      screensaverMode: false,
    }
    return selector ? selector(state) : state
  }),
}))

vi.mock('../../lib/sounds', () => ({
  soundPanelOpen:  vi.fn(),
  soundSwipe:      vi.fn(),
  soundClick:      vi.fn(),
}))

vi.mock('../DrawingCanvas', () => ({
  DrawingCanvas: ({ boardId, tool }: any) => (
    <canvas data-testid="drawing-canvas" data-board={boardId} data-tool={tool} />
  ),
}))

vi.mock('../DatabasePicker', () => ({
  DatabasePicker: ({ onClose, onWidgetSelected }: any) => (
    <div data-testid="database-picker">
      <button onClick={onClose}>Close picker</button>
    </div>
  ),
}))

vi.mock('../NotificationCenter', () => ({
  NotificationCenter: ({ onClose }: any) => (
    <div data-testid="notification-center">
      <button onClick={onClose}>Close notif</button>
    </div>
  ),
  NotificationCenterButton: ({ active, onClick }: any) => (
    <button data-testid="notif-btn" data-active={active} onClick={onClick}>Notifications</button>
  ),
}))

vi.mock('../Pill', () => {
  const React = require('react')
  return {
    Pill: React.forwardRef(({ children, className, style }: any, ref: any) => (
      <div ref={ref} className={className} style={style} data-testid="toolbar-pill">{children}</div>
    )),
  }
})

vi.mock('@whiteboard/ui-kit', () => {
  const React = require('react')
  return {
    Icon:       ({ icon, size }: any) => <span data-testid={`icon-${icon}`} />,
    IconButton: ({ icon, onClick, title, variant }: any) => (
      <button
        onClick={onClick}
        title={title}
        data-testid={`icon-btn-${icon}`}
        data-variant={variant}
      >
        {icon}
      </button>
    ),
  }
})

vi.mock('../../constants/drawing', () => ({
  DEFAULT_COLOR:       '#000000',
  DEFAULT_STROKE:      2,
  DEFAULT_ERASER_SIZE: 20,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  onToolChange:     vi.fn(),
  onWidgetSelected: vi.fn(),
}

function renderToolbar(props = {}) {
  return render(<BottomToolbar {...defaultProps} {...props} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BottomToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing (smoke test)', () => {
    renderToolbar()
    expect(screen.getByTestId('toolbar-pill')).toBeInTheDocument()
  })

  it('renders DrawingCanvas', () => {
    renderToolbar()
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
  })

  it('passes activeBoardId to DrawingCanvas', () => {
    renderToolbar()
    const canvas = screen.getByTestId('drawing-canvas')
    expect(canvas).toHaveAttribute('data-board', 'board-1')
  })

  it('shows Plus (add widget) button', () => {
    renderToolbar()
    expect(screen.getByTestId('icon-btn-Plus')).toBeInTheDocument()
  })

  it('shows Notification center button', () => {
    renderToolbar()
    expect(screen.getByTestId('notif-btn')).toBeInTheDocument()
  })

  it('shows Screensaver (Moon) button', () => {
    renderToolbar()
    expect(screen.getByTestId('icon-btn-Moon')).toBeInTheDocument()
  })

  it('shows hide handle (CaretDown)', () => {
    renderToolbar()
    expect(screen.getByTestId('icon-CaretDown')).toBeInTheDocument()
  })

  it('shows show handle (CaretUp)', () => {
    renderToolbar()
    expect(screen.getByTestId('icon-CaretUp')).toBeInTheDocument()
  })

  it('opens DatabasePicker when Plus button clicked', async () => {
    renderToolbar()
    const plusBtn = screen.getByTestId('icon-btn-Plus')
    fireEvent.click(plusBtn)
    await waitFor(() => {
      expect(screen.getByTestId('database-picker')).toBeInTheDocument()
    })
  })

  it('closes DatabasePicker when close is clicked inside it', async () => {
    renderToolbar()
    fireEvent.click(screen.getByTestId('icon-btn-Plus'))
    await waitFor(() => screen.getByTestId('database-picker'))
    fireEvent.click(screen.getByText('Close picker'))
    await waitFor(() => {
      expect(screen.queryByTestId('database-picker')).not.toBeInTheDocument()
    })
  })

  it('opens NotificationCenter when notification button clicked', async () => {
    renderToolbar()
    const notifBtn = screen.getByTestId('notif-btn')
    fireEvent.click(notifBtn)
    await waitFor(() => {
      expect(screen.getByTestId('notification-center')).toBeInTheDocument()
    })
  })

  it('closes NotificationCenter when close is clicked inside it', async () => {
    renderToolbar()
    fireEvent.click(screen.getByTestId('notif-btn'))
    await waitFor(() => screen.getByTestId('notification-center'))
    fireEvent.click(screen.getByText('Close notif'))
    await waitFor(() => {
      expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument()
    })
  })

  it('calls setScreensaverMode when Moon button clicked', async () => {
    const { useUIStore } = await import('../../store/ui')
    const mockSetScreensaverMode = vi.fn()
    vi.mocked(useUIStore).mockImplementation((selector?: any) => {
      const state = { setScreensaverMode: mockSetScreensaverMode, screensaverMode: false }
      return selector ? selector(state) : state
    })
    renderToolbar()
    fireEvent.click(screen.getByTestId('icon-btn-Moon'))
    expect(mockSetScreensaverMode).toHaveBeenCalledWith(true)
  })

  it('opens DatabasePicker when externalPickerOpen is true', async () => {
    const { rerender } = renderToolbar({ externalPickerOpen: false })
    rerender(
      <BottomToolbar
        {...defaultProps}
        externalPickerOpen={true}
        onExternalPickerClose={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByTestId('database-picker')).toBeInTheDocument()
    })
  })

  it('shows voice button (waveform)', () => {
    renderToolbar()
    // The voice button is rendered as a relative div with a button inside
    const voiceBtn = document.querySelector('button[title*="Voice"]')
    expect(voiceBtn).toBeInTheDocument()
  })

  it('shows voice button as active when voice state is listening', async () => {
    const { useVoiceStore } = await import('../../store/voice')
    vi.mocked(useVoiceStore).mockImplementation((selector?: any) => {
      const state = { state: 'listening' }
      return selector ? selector(state) : state
    })
    renderToolbar()
    const voiceBtn = document.querySelector('button[title*="Voice"]') as HTMLButtonElement
    expect(voiceBtn).toBeInTheDocument()
  })

  it('shows both panels closed by default', () => {
    renderToolbar()
    expect(screen.queryByTestId('database-picker')).not.toBeInTheDocument()
    expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument()
  })

  it('closes one panel when the other is opened', async () => {
    renderToolbar()
    // Open picker
    fireEvent.click(screen.getByTestId('icon-btn-Plus'))
    await waitFor(() => screen.getByTestId('database-picker'))
    // Now open notifications — picker should close
    fireEvent.click(screen.getByTestId('notif-btn'))
    await waitFor(() => {
      expect(screen.queryByTestId('database-picker')).not.toBeInTheDocument()
      expect(screen.getByTestId('notification-center')).toBeInTheDocument()
    })
  })
})
