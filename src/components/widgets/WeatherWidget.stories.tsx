import type { Meta, StoryObj } from '@storybook/react'
import { WeatherWidget } from './WeatherWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

/**
 * Mock the useWeather hook by intercepting fetch calls to the weather API.
 * The WeatherWidget uses a custom hook that calls /api/... endpoints via fetch.
 * We mock fetch globally in each story's play function or via a decorator.
 */

const MOCK_WEATHER = {
  temperature: 72,
  apparentTemperature: 69,
  tempMax: 78,
  tempMin: 61,
  humidity: 45,
  windSpeed: 8.5,
  weatherCode: 1,
  city: 'San Francisco',
}

const MOCK_RAINY = {
  temperature: 55,
  apparentTemperature: 48,
  tempMax: 58,
  tempMin: 50,
  humidity: 88,
  windSpeed: 15.2,
  weatherCode: 63,
  city: 'Seattle',
}

// Override fetch for weather stories
function mockFetch(data: Record<string, unknown>) {
  const origFetch = window.fetch
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (url.includes('/api/weather') || url.includes('api.open-meteo.com')) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/api/geocode') || url.includes('geocoding-api')) {
      return new Response(
        JSON.stringify({ results: [{ latitude: 37.77, longitude: -122.42, name: data.city ?? 'San Francisco' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return origFetch(input, init)
  }
}

const meta: Meta<typeof WeatherWidget> = {
  title: 'Widgets/Weather',
  component: WeatherWidget,
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      mockFetch(MOCK_WEATHER)
      return <Story />
    },
    widgetDecorator,
  ],
  parameters: {
    widgetSize: { width: 320, height: 280 },
    widgetSettings: {
      unit: 'fahrenheit',
      windUnit: 'mph',
      locationQuery: 'San Francisco',
      showFeelsLike: true,
      showHumidity: true,
      showWind: true,
    },
  },
}
export default meta

type Story = StoryObj<typeof WeatherWidget>

export const Default: Story = {
  render: () => <WeatherWidget widgetId={STORY_WIDGET_ID} />,
}

export const Celsius: Story = {
  render: () => <WeatherWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      unit: 'celsius',
      windUnit: 'kmh',
      locationQuery: 'London',
      showFeelsLike: true,
      showHumidity: true,
      showWind: true,
    },
  },
  decorators: [
    (Story) => {
      mockFetch({ ...MOCK_WEATHER, city: 'London', temperature: 22, apparentTemperature: 20, tempMax: 25, tempMin: 15 })
      return <Story />
    },
  ],
}

export const Rainy: Story = {
  render: () => <WeatherWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      unit: 'fahrenheit',
      windUnit: 'mph',
      locationQuery: 'Seattle',
      showFeelsLike: true,
      showHumidity: true,
      showWind: true,
    },
  },
  decorators: [
    (Story) => {
      mockFetch(MOCK_RAINY)
      return <Story />
    },
  ],
}

export const Minimal: Story = {
  name: 'Minimal (no extras)',
  render: () => <WeatherWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      unit: 'fahrenheit',
      windUnit: 'mph',
      locationQuery: 'San Francisco',
      showFeelsLike: false,
      showHumidity: false,
      showWind: false,
    },
  },
}
