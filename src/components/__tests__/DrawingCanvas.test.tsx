import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock canvas API
const mockGetContext = vi.fn(() => ({
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,'),
}))

HTMLCanvasElement.prototype.getContext = mockGetContext as any
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,')

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

import { DrawingCanvas } from '../DrawingCanvas'

describe('DrawingCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('renders a canvas element', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="marker"
        color="#000000"
        strokeWidth={2}
        eraserSize={20}
      />
    )
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('renders without crashing with pointer tool', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="pointer"
        color="#ff0000"
        strokeWidth={4}
        eraserSize={20}
      />
    )
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('renders without crashing with eraser tool', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="eraser"
        color="#000000"
        strokeWidth={2}
        eraserSize={30}
      />
    )
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('canvas has pointer-events none when tool is pointer', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="pointer"
        color="#000000"
        strokeWidth={2}
        eraserSize={20}
      />
    )
    const canvas = document.querySelector('canvas')
    expect(canvas?.style.pointerEvents).toBe('none')
  })

  it('canvas has pointer-events all when tool is marker', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="marker"
        color="#000000"
        strokeWidth={2}
        eraserSize={20}
      />
    )
    const canvas = document.querySelector('canvas')
    expect(canvas?.style.pointerEvents).toBe('all')
  })

  it('shows eraser cursor circle on mouse move when eraser is active', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="eraser"
        color="#000000"
        strokeWidth={2}
        eraserSize={30}
      />
    )
    const canvas = document.querySelector('canvas')!
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 })
    // After mouse move, should show the eraser cursor circle
    const eraserCircle = document.querySelector('.pointer-events-none.fixed.rounded-full')
    expect(eraserCircle).toBeInTheDocument()
  })

  it('does not show eraser circle for marker tool', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="marker"
        color="#000000"
        strokeWidth={2}
        eraserSize={30}
      />
    )
    const canvas = document.querySelector('canvas')!
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 })
    const eraserCircle = document.querySelector('.pointer-events-none.fixed.rounded-full')
    expect(eraserCircle).not.toBeInTheDocument()
  })

  it('calls getContext on mount', () => {
    render(
      <DrawingCanvas
        boardId="b1"
        tool="marker"
        color="#000000"
        strokeWidth={2}
        eraserSize={20}
      />
    )
    expect(mockGetContext).toHaveBeenCalledWith('2d')
  })
})
