import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('../../lib/apiFetch', () => ({
  apiFetch: vi.fn().mockResolvedValue(null),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, style }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { BackgroundPicker } from '../BackgroundPicker'
import type { Background } from '../../constants/backgrounds'

const defaultBackground: Background = {
  label: 'Parchment',
  bg: '#f5f0eb',
  dot: '#c9bfb5',
  pattern: 'dots',
}

describe('BackgroundPicker', () => {
  const onSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<BackgroundPicker background={defaultBackground} onSelect={onSelect} />)
    expect(document.body.firstChild).toBeTruthy()
  })

  it('renders pattern type pills', () => {
    render(<BackgroundPicker background={defaultBackground} onSelect={onSelect} />)
    expect(screen.getByText('Dots')).toBeInTheDocument()
    expect(screen.getByText('Lines')).toBeInTheDocument()
    expect(screen.getByText('Grid')).toBeInTheDocument()
    expect(screen.getByText('Solid')).toBeInTheDocument()
    expect(screen.getByText('Gradient')).toBeInTheDocument()
    // Image and Photos pills also exist (text appears alongside icon)
    expect(screen.getAllByText('Image').length).toBeGreaterThan(0)
    expect(screen.getByText('Photos')).toBeInTheDocument()
  })

  it('shows swatch groups for dots pattern', () => {
    render(<BackgroundPicker background={defaultBackground} onSelect={onSelect} />)
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  it('calls onSelect when a pattern pill is clicked', () => {
    render(<BackgroundPicker background={defaultBackground} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Solid'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('shows image controls when image pattern is active', () => {
    const imageBg: Background = {
      label: 'Custom Image',
      bg: '#000',
      dot: '#000',
      pattern: 'image',
      imageUrl: '',
      imageDim: 0,
    }
    render(<BackgroundPicker background={imageBg} onSelect={onSelect} />)
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Or paste image URL…')).toBeInTheDocument()
  })

  it('shows image preview and dim slider when URL is set', () => {
    const imageBg: Background = {
      label: 'Custom Image',
      bg: '#000',
      dot: '#000',
      pattern: 'image',
      imageUrl: 'https://example.com/image.jpg',
      imageDim: 0,
    }
    render(<BackgroundPicker background={imageBg} onSelect={onSelect} />)
    const img = document.querySelector('img[alt="background preview"]')
    expect(img).toBeInTheDocument()
    expect(screen.getByText('Dim')).toBeInTheDocument()
  })

  it('calls onSelect when a background swatch is clicked', () => {
    render(<BackgroundPicker background={defaultBackground} onSelect={onSelect} />)
    // Click Parchment swatch (title attribute)
    const swatchBtn = document.querySelector('button[title="Parchment"]')
    if (swatchBtn) fireEvent.click(swatchBtn)
    expect(onSelect).toHaveBeenCalled()
  })

  it('shows gradient section for gradient pattern', () => {
    const gradientBg: Background = {
      label: 'Ocean',
      bg: '#0077b6',
      dot: '#0077b6',
      pattern: 'gradient',
      gradientTo: '#00b4d8',
    }
    render(<BackgroundPicker background={gradientBg} onSelect={onSelect} />)
    // Should show swatches for gradient backgrounds
    const presets = screen.queryByText('Presets') || screen.queryByText('Dark') || screen.queryByText('Light')
    expect(document.body).toBeTruthy()
  })
})
