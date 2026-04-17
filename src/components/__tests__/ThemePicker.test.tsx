import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn((selector) =>
    selector({
      activeThemeId: 'slate',
      setTheme: vi.fn(),
    })
  ),
}))

vi.mock('../../themes/presets', () => ({
  THEMES: [
    {
      id: 'slate',
      name: 'Slate',
      dark: false,
      previewColors: ['#f1f5f9', '#e2e8f0', '#3b82f6', '#0f172a'],
    },
    {
      id: 'cream',
      name: 'Cream',
      dark: false,
      previewColors: ['#faf8f5', '#e0d8cc', '#8b5cf6', '#1a1a1a'],
    },
    {
      id: 'dark-slate',
      name: 'Dark Slate',
      dark: true,
      previewColors: ['#0f172a', '#1e293b', '#3b82f6', '#f8fafc'],
    },
    {
      id: 'midnight',
      name: 'Midnight',
      dark: true,
      previewColors: ['#070c14', '#0d2035', '#8b5cf6', '#e2e8f0'],
    },
  ],
}))

import { ThemePicker } from '../ThemePicker'

describe('ThemePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<ThemePicker />)
    expect(document.body.firstChild).toBeTruthy()
  })

  it('renders light/dark toggle buttons', () => {
    render(<ThemePicker />)
    expect(screen.getByText('light')).toBeInTheDocument()
    expect(screen.getByText('dark')).toBeInTheDocument()
  })

  it('shows light themes by default when active theme is light', () => {
    render(<ThemePicker />)
    expect(screen.getByText('Slate')).toBeInTheDocument()
    expect(screen.getByText('Cream')).toBeInTheDocument()
    // Dark themes should not be visible in light mode
    expect(screen.queryByText('Dark Slate')).not.toBeInTheDocument()
  })

  it('shows dark themes when dark mode is selected', () => {
    render(<ThemePicker />)
    fireEvent.click(screen.getByText('dark'))
    expect(screen.getByText('Dark Slate')).toBeInTheDocument()
    expect(screen.getByText('Midnight')).toBeInTheDocument()
    expect(screen.queryByText('Slate')).not.toBeInTheDocument()
  })

  it('calls setTheme when a theme is clicked', () => {
    const setTheme = vi.fn()
    const { useThemeStore } = require('../../store/theme')
    useThemeStore.mockImplementation((selector: any) =>
      selector({ activeThemeId: 'slate', setTheme })
    )

    render(<ThemePicker />)
    fireEvent.click(screen.getByTitle('Cream'))
    expect(setTheme).toHaveBeenCalledWith('cream')
  })

  it('renders theme names', () => {
    render(<ThemePicker />)
    expect(screen.getByText('Slate')).toBeInTheDocument()
  })

  it('switches back to light mode', () => {
    render(<ThemePicker />)
    fireEvent.click(screen.getByText('dark'))
    fireEvent.click(screen.getByText('light'))
    expect(screen.getByText('Slate')).toBeInTheDocument()
    expect(screen.queryByText('Dark Slate')).not.toBeInTheDocument()
  })
})
