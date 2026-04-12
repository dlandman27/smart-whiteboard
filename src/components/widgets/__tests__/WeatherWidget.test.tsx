import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    unit: 'fahrenheit',
    windUnit: 'mph',
    locationQuery: '',
    showFeelsLike: true,
    showHumidity: true,
    showWind: true,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

const mockUseWeather = vi.fn()
vi.mock('../../../hooks/useWeather', () => ({
  useWeather: (...args: any[]) => mockUseWeather(...args),
}))

import { WeatherWidget } from '../WeatherWidget'

describe('WeatherWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockUseWeather.mockReturnValue({ data: null, isLoading: true, isError: false, geoError: false, locationError: null, windUnitLabel: 'mph' })
    render(<WeatherWidget widgetId="test-weather-1" />)
  })

  it('shows loading state', () => {
    mockUseWeather.mockReturnValue({ data: null, isLoading: true, isError: false, geoError: false, locationError: null, windUnitLabel: 'mph' })
    render(<WeatherWidget widgetId="test-weather-2" />)
    expect(screen.getByText(/loading weather/i)).toBeInTheDocument()
  })

  it('shows error state when API fails', () => {
    mockUseWeather.mockReturnValue({ data: null, isLoading: false, isError: true, geoError: false, locationError: null, windUnitLabel: 'mph' })
    render(<WeatherWidget widgetId="test-weather-3" />)
    expect(screen.getByText(/weather unavailable/i)).toBeInTheDocument()
  })

  it('shows location error state', () => {
    mockUseWeather.mockReturnValue({ data: null, isLoading: false, isError: false, geoError: false, locationError: 'City not found', windUnitLabel: 'mph' })
    render(<WeatherWidget widgetId="test-weather-4" />)
    expect(screen.getByText(/city not found/i)).toBeInTheDocument()
  })

  it('shows geo error state', () => {
    mockUseWeather.mockReturnValue({ data: null, isLoading: false, isError: false, geoError: true, locationError: null, windUnitLabel: 'mph' })
    render(<WeatherWidget widgetId="test-weather-5" />)
    expect(screen.getByText(/location access denied/i)).toBeInTheDocument()
  })

  it('shows configured state with data', () => {
    mockUseWeather.mockReturnValue({
      data: {
        city: 'San Francisco',
        temperature: 68,
        apparentTemperature: 65,
        tempMax: 72,
        tempMin: 55,
        weatherCode: 0,
        humidity: 60,
        windSpeed: 12,
      },
      isLoading: false,
      isError: false,
      geoError: false,
      locationError: null,
      windUnitLabel: 'mph',
    })
    render(<WeatherWidget widgetId="test-weather-6" />)
    expect(screen.getByText('San Francisco')).toBeInTheDocument()
    expect(screen.getByText('68')).toBeInTheDocument()
  })
})
