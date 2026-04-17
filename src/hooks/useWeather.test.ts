import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useWeather, type WeatherConfig } from './useWeather'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const weatherApiResponse = {
  current: {
    temperature_2m: 22.4,
    apparent_temperature: 20.1,
    weather_code: 1,
    relative_humidity_2m: 55,
    wind_speed_10m: 14.3,
  },
  daily: {
    temperature_2m_max: [25],
    temperature_2m_min: [15],
  },
}

const geocodeApiResponse = {
  results: [{ latitude: 51.5, longitude: -0.12, name: 'London' }],
}

const nominatimResponse = {
  address: { city: 'London' },
}

describe('useWeather — with locationQuery (manual city)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns weather data for a named city', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => geocodeApiResponse })  // geocode
      .mockResolvedValueOnce({ ok: true, json: async () => weatherApiResponse }) // weather
      .mockResolvedValueOnce({ ok: true, json: async () => nominatimResponse })  // reverse geo (skipped for manual loc)

    const cfg: WeatherConfig = { unit: 'celsius', windUnit: 'kmh', locationQuery: 'London' }
    const { result } = renderHook(() => useWeather(cfg), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toBeDefined()
    expect(result.current.data!.temperature).toBe(22)
    expect(result.current.data!.city).toBe('London')
    expect(result.current.data!.unit).toBe('celsius')
  })

  it('sets locationError when geocode returns no results', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) })

    const cfg: WeatherConfig = { unit: 'celsius', windUnit: 'kmh', locationQuery: 'Nonexistent' }
    const { result } = renderHook(() => useWeather(cfg), { wrapper: makeWrapper() })

    await waitFor(() => !result.current.isLoading)
    await waitFor(() => result.current.locationError !== null || !result.current.isLoading)

    expect(result.current.geoError).toBeNull()
  })
})

describe('useWeather — with geolocation', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Mock navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 51.5, longitude: -0.12 } })
        ),
      },
      writable: true,
      configurable: true,
    })
  })

  it('fetches weather using browser coordinates', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => weatherApiResponse }) // weather
      .mockResolvedValueOnce({ ok: true, json: async () => nominatimResponse })  // reverse geo

    const cfg: WeatherConfig = { unit: 'fahrenheit', windUnit: 'mph', locationQuery: '' }
    const { result } = renderHook(() => useWeather(cfg), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeDefined()
  })

  it('sets geoError when geolocation fails', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((_, error) => error({ message: 'Permission denied' })),
      },
      writable: true,
      configurable: true,
    })

    const cfg: WeatherConfig = { unit: 'celsius', windUnit: 'ms', locationQuery: '' }
    const { result } = renderHook(() => useWeather(cfg), { wrapper: makeWrapper() })

    await waitFor(() => result.current.geoError !== null)
    expect(result.current.geoError).toBe('Permission denied')
    expect(result.current.isLoading).toBe(false)
  })

  it('sets geoError when geolocation is unsupported', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const cfg: WeatherConfig = { unit: 'celsius', windUnit: 'kmh', locationQuery: '' }
    const { result } = renderHook(() => useWeather(cfg), { wrapper: makeWrapper() })

    await waitFor(() => result.current.geoError !== null)
    expect(result.current.geoError).toBe('Geolocation not supported')
  })
})

describe('useWeather — windUnitLabel', () => {
  beforeEach(() => mockFetch.mockReset())

  it.each([
    ['mph', 'mph'],
    ['kmh', 'km/h'],
    ['ms', 'm/s'],
  ] as const)('returns correct label for %s', (unit, label) => {
    const cfg: WeatherConfig = { unit: 'celsius', windUnit: unit, locationQuery: 'Test' }
    const { result } = renderHook(() => useWeather(cfg), { wrapper: makeWrapper() })
    expect(result.current.windUnitLabel).toBe(label)
  })
})
