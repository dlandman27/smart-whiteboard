import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the sounds.config module to control which sounds are loaded
vi.mock('./sounds.config', () => ({
  default: {
    panelOpen:     { file: '/assets/sounds/whoof.wav',      volume: 0.4,  playbackRate: 1.5, offsetMs: 600 },
    swipe:         { file: '/assets/sounds/swipe.wav',      volume: 0.15 },
    alert:         { file: '/assets/sounds/alert.wav',      volume: 0.5 },
    click:         { file: '/assets/sounds/click.wav',      volume: 0.4 },
    widgetRemoved: { file: '/assets/sounds/drop.wav',       volume: 0.2, durationMs: 80 },
    widgetDrop:    { file: '/assets/sounds/drop-element.wav', volume: 0.35 },
    widgetPickup:  { file: null, volume: 0 }, // null = disabled
    widgetAdded:   { file: '/assets/sounds/land.wav',       volume: 0.5 },
  },
}))

// Mock Audio constructor
const mockPlay = vi.fn().mockResolvedValue(undefined)
const MockAudio = vi.fn().mockImplementation(() => ({
  play: mockPlay,
  volume: 0,
}))
global.Audio = MockAudio as any

// Mock AudioContext — must be a proper class/constructor
const mockOscillatorStart   = vi.fn()
const mockOscillatorStop    = vi.fn()
const mockOscillatorConnect = vi.fn()
const mockGainConnect       = vi.fn()

const mockCreateOscillator = vi.fn(function () {
  return {
    type: 'sine',
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: mockOscillatorConnect,
    start: mockOscillatorStart,
    stop: mockOscillatorStop,
  }
})
const mockCreateGain = vi.fn(function () {
  return {
    gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: mockGainConnect,
    disconnect: vi.fn(),
  }
})
const mockCreateBiquadFilter = vi.fn(function () {
  return {
    type: 'bandpass',
    frequency: { value: 0 },
    Q: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
})
const mockCreateBuffer = vi.fn(function () {
  return {
    getChannelData: vi.fn(() => new Float32Array(100)),
  }
})
const mockCreateBufferSource = vi.fn(function () {
  return {
    buffer: null,
    playbackRate: { value: 1 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
})
const mockCreateConstantSource = vi.fn(function () {
  return {
    offset: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
})

function MockAudioContext(this: any) {
  this.currentTime = 0
  this.sampleRate  = 44100
  this.destination = {}
  this.createOscillator    = mockCreateOscillator
  this.createGain          = mockCreateGain
  this.createBiquadFilter  = mockCreateBiquadFilter
  this.createBuffer        = mockCreateBuffer
  this.createBufferSource  = mockCreateBufferSource
  this.createConstantSource = mockCreateConstantSource
}

global.AudioContext = MockAudioContext as any

import {
  soundPanelOpen,
  soundSwipe,
  soundAlert,
  soundClick,
  soundWidgetRemoved,
  soundWidgetDrop,
  soundWidgetPickup,
  soundWidgetAdded,
  soundWakeWord,
  soundProcessingStart,
  soundSuccess,
  soundError,
} from './sounds'

describe('file-based sounds (Audio constructor path)', () => {
  beforeEach(() => {
    MockAudio.mockClear()
    mockPlay.mockClear()
    // Make fetch return a dummy arrayBuffer for Web Audio path
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    })
    ;(global.AudioContext as any).mockClear?.()
  })

  it('soundPanelOpen does not throw', () => {
    expect(() => soundPanelOpen()).not.toThrow()
  })

  it('soundSwipe creates an Audio element and calls play', async () => {
    soundSwipe()
    // allow promises to resolve
    await new Promise((r) => setTimeout(r, 0))
    expect(MockAudio).toHaveBeenCalledWith('/assets/sounds/swipe.wav')
  })

  it('soundAlert does not throw', () => {
    expect(() => soundAlert()).not.toThrow()
  })

  it('soundClick does not throw', () => {
    expect(() => soundClick()).not.toThrow()
  })

  it('soundWidgetRemoved does not throw (has durationMs, uses Web Audio path)', () => {
    expect(() => soundWidgetRemoved()).not.toThrow()
  })

  it('soundWidgetDrop does not throw', () => {
    expect(() => soundWidgetDrop()).not.toThrow()
  })

  it('soundWidgetPickup does not throw when file is null (no-op)', () => {
    expect(() => soundWidgetPickup()).not.toThrow()
    // null file means no Audio or fetch call
    expect(MockAudio).not.toHaveBeenCalled()
  })

  it('soundWidgetAdded does not throw', () => {
    expect(() => soundWidgetAdded()).not.toThrow()
  })
})

describe('synthesised sounds (Web Audio API)', () => {
  beforeEach(() => {
    mockOscillatorStart.mockClear()
    mockOscillatorStop.mockClear()
    mockCreateOscillator.mockClear()
    mockCreateGain.mockClear()
  })

  it('soundWakeWord does not throw', () => {
    expect(() => soundWakeWord()).not.toThrow()
  })

  it('soundWakeWord creates an oscillator and a gain node', () => {
    soundWakeWord()
    expect(mockCreateOscillator).toHaveBeenCalled()
    expect(mockCreateGain).toHaveBeenCalled()
  })

  it('soundProcessingStart does not throw and returns a stop function', () => {
    let stop: (() => void) | undefined
    expect(() => { stop = soundProcessingStart() }).not.toThrow()
    expect(typeof stop).toBe('function')
  })

  it('soundProcessingStart stop function does not throw when called', () => {
    const stop = soundProcessingStart()
    expect(() => stop()).not.toThrow()
  })

  it('soundProcessingStart stop is idempotent (safe to call twice)', () => {
    const stop = soundProcessingStart()
    expect(() => { stop(); stop() }).not.toThrow()
  })

  it('soundSuccess does not throw', () => {
    expect(() => soundSuccess()).not.toThrow()
  })

  it('soundSuccess creates multiple oscillators for the arpeggio', () => {
    soundSuccess()
    expect(mockCreateOscillator.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('soundError does not throw', () => {
    expect(() => soundError()).not.toThrow()
  })

  it('soundError creates sawtooth oscillators', () => {
    soundError()
    expect(mockCreateOscillator).toHaveBeenCalled()
  })
})
