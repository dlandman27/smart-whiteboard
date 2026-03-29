import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface Coords { lat: number; lon: number; city?: string }

export interface WeatherData {
  temperature:         number
  apparentTemperature: number
  weatherCode:         number
  humidity:            number
  windSpeed:           number
  tempMax:             number
  tempMin:             number
  city:                string
  unit:                'fahrenheit' | 'celsius'
  windUnit:            'mph' | 'kmh' | 'ms'
}

export interface WeatherConfig {
  unit:          'fahrenheit' | 'celsius'
  windUnit:      'mph' | 'kmh' | 'ms'
  locationQuery: string   // city name; empty = use geolocation
}

const WIND_UNIT_PARAM: Record<WeatherConfig['windUnit'], string> = {
  mph: 'mph',
  kmh: 'kmh',
  ms:  'ms',
}

const WIND_UNIT_LABEL: Record<WeatherConfig['windUnit'], string> = {
  mph: 'mph',
  kmh: 'km/h',
  ms:  'm/s',
}

async function geocodeCity(query: string): Promise<Coords> {
  const res  = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  )
  const data = await res.json()
  const r    = data.results?.[0]
  if (!r) throw new Error(`City not found: ${query}`)
  return { lat: r.latitude, lon: r.longitude, city: r.name }
}

async function fetchWeather(lat: number, lon: number, cfg: WeatherConfig, cityOverride?: string): Promise<WeatherData> {
  const [weatherRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=${cfg.unit}&wind_speed_unit=${WIND_UNIT_PARAM[cfg.windUnit]}` +
      `&timezone=auto&forecast_days=1`
    ),
    cityOverride
      ? Promise.resolve(null)
      : fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).catch(() => null),
  ])

  if (!weatherRes.ok) throw new Error('Weather fetch failed')
  const weather = await weatherRes.json()

  let city = cityOverride ?? 'Your Location'
  if (!cityOverride && geoRes) {
    const geo = await geoRes.json().catch(() => ({}))
    city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || 'Your Location'
  }

  return {
    temperature:         Math.round(weather.current.temperature_2m),
    apparentTemperature: Math.round(weather.current.apparent_temperature),
    weatherCode:         weather.current.weather_code,
    humidity:            weather.current.relative_humidity_2m,
    windSpeed:           Math.round(weather.current.wind_speed_10m),
    tempMax:             Math.round(weather.daily.temperature_2m_max[0]),
    tempMin:             Math.round(weather.daily.temperature_2m_min[0]),
    city,
    unit:     cfg.unit,
    windUnit: cfg.windUnit,
  }
}

export function useWeather(cfg: WeatherConfig) {
  const [browserCoords, setBrowserCoords] = useState<Coords | null>(null)
  const [geoError,      setGeoError]      = useState<string | null>(null)
  const [geoLoading,    setGeoLoading]    = useState(!cfg.locationQuery)

  // Browser geolocation — only when no manual location set
  useEffect(() => {
    if (cfg.locationQuery) { setGeoLoading(false); return }
    if (!navigator.geolocation) { setGeoError('Geolocation not supported'); setGeoLoading(false); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBrowserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setGeoLoading(false) },
      (err)  => { setGeoError(err.message); setGeoLoading(false) },
    )
  }, [cfg.locationQuery])

  // Geocode manual location
  const geocodeQuery = useQuery({
    queryKey:  ['geocode', cfg.locationQuery],
    queryFn:   () => geocodeCity(cfg.locationQuery),
    enabled:   !!cfg.locationQuery,
    staleTime: Infinity,
  })

  const coords    = cfg.locationQuery ? geocodeQuery.data : browserCoords
  const cityHint  = cfg.locationQuery ? geocodeQuery.data?.city : undefined

  const weatherQuery = useQuery({
    queryKey:        ['weather', coords?.lat, coords?.lon, cfg.unit, cfg.windUnit],
    queryFn:         () => fetchWeather(coords!.lat, coords!.lon, cfg, cityHint),
    enabled:         !!coords,
    staleTime:       30 * 60_000,
    refetchInterval: 30 * 60_000,
  })

  const isLoading = cfg.locationQuery
    ? (geocodeQuery.isLoading || weatherQuery.isLoading)
    : (geoLoading || weatherQuery.isLoading)

  const locationError = cfg.locationQuery && geocodeQuery.isError
    ? `City not found: "${cfg.locationQuery}"`
    : null

  return {
    data:          weatherQuery.data,
    isLoading,
    isError:       weatherQuery.isError && !isLoading,
    geoError:      cfg.locationQuery ? null : geoError,
    locationError,
    windUnitLabel: WIND_UNIT_LABEL[cfg.windUnit],
  }
}
