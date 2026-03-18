import { Cloud, CloudLightning, CloudRain, CloudSnow, Droplets, Sun, Wind } from 'lucide-react'
import { Icon, Text } from '../../ui/web'
import { FlexCol, FlexRow, Center } from '../../ui/layouts'
import { useWeather } from '../../hooks/useWeather'
import type { WidgetProps } from './registry'

type IconType = typeof Sun

interface WeatherInfo {
  label:       string
  WeatherIcon: IconType
  gradient:    string
}

function getWeatherInfo(code: number): WeatherInfo {
  if (code === 0)   return { label: 'Clear',         WeatherIcon: Sun,            gradient: 'from-sky-400 to-blue-600'    }
  if (code <= 3)    return { label: 'Partly Cloudy', WeatherIcon: Cloud,          gradient: 'from-sky-300 to-slate-400'   }
  if (code <= 48)   return { label: 'Foggy',         WeatherIcon: Cloud,          gradient: 'from-slate-400 to-slate-500' }
  if (code <= 67)   return { label: 'Rainy',         WeatherIcon: CloudRain,      gradient: 'from-slate-500 to-slate-600' }
  if (code <= 77)   return { label: 'Snowy',         WeatherIcon: CloudSnow,      gradient: 'from-slate-300 to-blue-300'  }
  if (code <= 82)   return { label: 'Showers',       WeatherIcon: CloudRain,      gradient: 'from-slate-500 to-blue-700'  }
  return                   { label: 'Stormy',        WeatherIcon: CloudLightning,  gradient: 'from-slate-700 to-slate-900' }
}

function LoadingState() {
  return (
    <Center fullHeight className="bg-gradient-to-br from-sky-400 to-blue-600">
      <Text variant="body" size="small" style={{ color: 'rgba(255,255,255,0.6)' }}>Loading weather…</Text>
    </Center>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <Center fullHeight className="bg-gradient-to-br from-slate-400 to-slate-600 px-6">
      <Text variant="body" size="small" align="center" style={{ color: 'rgba(255,255,255,0.7)' }}>{message}</Text>
    </Center>
  )
}

export function WeatherWidget(_props: WidgetProps) {
  const { data, isLoading, isError, geoError } = useWeather()

  if (isLoading)           return <LoadingState />
  if (geoError)            return <ErrorState message="Location access denied" />
  if (isError || !data)    return <ErrorState message="Weather unavailable" />

  const { label, WeatherIcon, gradient } = getWeatherInfo(data.weatherCode)

  return (
    <FlexCol justify="between" fullHeight fullWidth noSelect className={`bg-gradient-to-br ${gradient} p-5`}>
      {/* Top row: city + condition icon */}
      <FlexRow justify="between" align="start">
        <FlexCol>
          <Text variant="title" size="small" style={{ color: 'white', fontWeight: '600', lineHeight: '1' }}>
            {data.city}
          </Text>
          <Text variant="caption" size="large" style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>
            {label}
          </Text>
        </FlexCol>
        <Icon icon={WeatherIcon} size={28} className="text-white/90" />
      </FlexRow>

      {/* Temperature */}
      <FlexRow align="end" gap="xs">
        <Text
          as="span"
          variant="display"
          size="large"
          style={{ color: 'white', fontWeight: '100', lineHeight: '1', fontSize: '80px' }}
        >
          {data.temperature}
        </Text>
        <Text as="span" variant="heading" size="large" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
          °F
        </Text>
      </FlexRow>

      {/* Bottom row: H/L + humidity + wind */}
      <FlexRow justify="between" align="center">
        <FlexRow className="gap-3">
          <Text as="span" variant="caption" size="large" style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
            H: {data.tempMax}°
          </Text>
          <Text as="span" variant="caption" size="large" style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
            L: {data.tempMin}°
          </Text>
        </FlexRow>
        <FlexRow className="gap-3">
          <FlexRow align="center" gap="xs">
            <Icon icon={Droplets} size={11} className="text-white/60" />
            <Text as="span" variant="caption" size="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {data.humidity}%
            </Text>
          </FlexRow>
          <FlexRow align="center" gap="xs">
            <Icon icon={Wind} size={11} className="text-white/60" />
            <Text as="span" variant="caption" size="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {data.windSpeed} mph
            </Text>
          </FlexRow>
        </FlexRow>
      </FlexRow>
    </FlexCol>
  )
}
