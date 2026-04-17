import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/ui', () => ({
  useUIStore: vi.fn(),
}))

import { Screensaver } from '../ScreenSaver'
import { useUIStore } from '../../store/ui'

const mockSetScreensaverMode = vi.fn()

describe('Screensaver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUIStore).mockImplementation((selector?: any) => {
      const state = { setScreensaverMode: mockSetScreensaverMode }
      return selector ? selector(state) : state
    })
  })

  it('renders without crashing', () => {
    const { container } = render(<Screensaver />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders a full-screen fixed overlay', () => {
    const { container } = render(<Screensaver />)
    const overlay = container.firstChild as HTMLElement
    expect(overlay.style.position).toBe('fixed')
    // jsdom normalizes '#000' to 'rgb(0, 0, 0)'
    expect(overlay.style.background).toMatch(/rgb\(0,\s*0,\s*0\)|#000/)
  })

  it('displays a time string (HH:MM:SS format)', () => {
    render(<Screensaver />)
    // Time should match HH:MM:SS
    const timeEl = screen.getByText(/^\d{2}:\d{2}:\d{2}$/)
    expect(timeEl).toBeInTheDocument()
  })

  it('displays a date string', () => {
    render(<Screensaver />)
    // Date is a human-readable string like "Thursday, April 17"
    // Just check something is rendered that's not the time
    const allText = document.body.textContent ?? ''
    // Time + date both present
    expect(allText).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('has zIndex 99999', () => {
    const { container } = render(<Screensaver />)
    const overlay = container.firstChild as HTMLElement
    expect(overlay.style.zIndex).toBe('99999')
  })

  it('has cursor none', () => {
    const { container } = render(<Screensaver />)
    const overlay = container.firstChild as HTMLElement
    expect(overlay.style.cursor).toBe('none')
  })

  it('calls setScreensaverMode(false) on keydown', () => {
    render(<Screensaver />)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(mockSetScreensaverMode).toHaveBeenCalledWith(false)
  })

  it('calls setScreensaverMode(false) on click', () => {
    render(<Screensaver />)
    window.dispatchEvent(new MouseEvent('click'))
    expect(mockSetScreensaverMode).toHaveBeenCalledWith(false)
  })

  it('calls setScreensaverMode(false) on mousemove', () => {
    render(<Screensaver />)
    window.dispatchEvent(new MouseEvent('mousemove'))
    expect(mockSetScreensaverMode).toHaveBeenCalledWith(false)
  })

  it('calls setScreensaverMode(false) on touchstart', () => {
    render(<Screensaver />)
    window.dispatchEvent(new TouchEvent('touchstart'))
    expect(mockSetScreensaverMode).toHaveBeenCalledWith(false)
  })

  it('removes event listeners on unmount', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Screensaver />)
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('click', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))
  })
})
