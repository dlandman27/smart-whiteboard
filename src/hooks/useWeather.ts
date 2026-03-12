import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface Coords { lat: number; lon: number }

export interface WeatherData {
  temperature:         number
  apparentTemperature: number
  weatherCode:         number
  humidity:            number
  windSpeed:           number
  tempMax:             number
  tempMin:             number
  city:                string
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const [weatherRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`
    ),
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`),
  ])

  if (!weatherRes.ok) throw new Error('Weather fetch failed')

  const weather = await weatherRes.json()
  const geo     = await geoRes.json().catch(() => ({}))

  const city =
    geo.address?.city    ||
    geo.address?.town    ||
    geo.address?.village ||
    geo.address?.county  ||
    'Your Location'

  return {
    temperature:         Math.round(weather.current.temperature_2m),
    apparentTemperature: Math.round(weather.current.apparent_temperature),
    weatherCode:         weather.current.weather_code,
    humidity:            weather.current.relative_humidity_2m,
    windSpeed:           Math.round(weather.current.wind_speed_10m),
    tempMax:             Math.round(weather.daily.temperature_2m_max[0]),
    tempMin:             Math.round(weather.daily.temperature_2m_min[0]),
    city,
  }
}

export function useWeather() {
  const [coords,     setCoords]     = useState<Coords | null>(null)
  const [geoError,   setGeoError]   = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported')
      setGeoLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGeoLoading(false)
      },
      (err) => {
        setGeoError(err.message)
        setGeoLoading(false)
      },
    )
  }, [])

  const query = useQuery({
    queryKey:       ['weather', coords?.lat, coords?.lon],
    queryFn:        () => fetchWeather(coords!.lat, coords!.lon),
    enabled:        !!coords,
    staleTime:      30 * 60_000,
    refetchInterval: 30 * 60_000,
  })

  return {
    ...query,
    isLoading: geoLoading || query.isLoading,
    geoError,
  }
}
