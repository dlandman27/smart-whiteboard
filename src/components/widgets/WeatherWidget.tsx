import { Cloud, CloudLightning, CloudRain, CloudSnow, Droplets, Sun, Wind } from 'lucide-react'
import { Icon, Text } from '../../ui/web'
import { FlexCol, FlexRow, Center } from '../../ui/layouts'
import { useWeather } from '../../hooks/useWeather'
import type { WidgetProps } from './registry'

type IconType = typeof Sun

interface WeatherInfo {
  label:       string
  WeatherIcon: IconType
}

function getWeatherInfo(code: number): WeatherInfo {
  if (code === 0)  return { label: 'Clear',         WeatherIcon: Sun            }
  if (code <= 3)   return { label: 'Partly Cloudy', WeatherIcon: Cloud          }
  if (code <= 48)  return { label: 'Foggy',         WeatherIcon: Cloud          }
  if (code <= 67)  return { label: 'Rainy',         WeatherIcon: CloudRain      }
  if (code <= 77)  return { label: 'Snowy',         WeatherIcon: CloudSnow      }
  if (code <= 82)  return { label: 'Showers',       WeatherIcon: CloudRain      }
  return                  { label: 'Stormy',        WeatherIcon: CloudLightning  }
}

export function WeatherWidget(_props: WidgetProps) {
  const { data, isLoading, isError, geoError } = useWeather()

  if (isLoading) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading weather…</Text>
      </Center>
    )
  }
  if (geoError) {
    return (
      <Center fullHeight className="px-6">
        <Text variant="body" size="small" color="muted" align="center">Location access denied</Text>
      </Center>
    )
  }
  if (isError || !data) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted">Weather unavailable</Text>
      </Center>
    )
  }

  const { label, WeatherIcon } = getWeatherInfo(data.weatherCode)

  return (
    <FlexCol fullHeight fullWidth noSelect className="px-5 py-4 gap-2">
      {/* Top row: city + condition icon */}
      <FlexRow justify="between" align="center">
        <FlexCol>
          <Text variant="title" size="small" style={{ fontWeight: '600', lineHeight: '1' }}>
            {data.city}
          </Text>
          <Text variant="caption" size="large" color="muted" style={{ marginTop: '0.2rem' }}>
            {label}
          </Text>
        </FlexCol>
        <Icon icon={WeatherIcon} size={26} style={{ color: 'var(--wt-accent)', flexShrink: 0 }} />
      </FlexRow>

      {/* Temperature */}
      <FlexRow align="end" gap="xs" style={{ flex: 1 }}>
        <Text
          as="span"
          variant="display"
          size="large"
          style={{ fontWeight: '100', lineHeight: '1', fontSize: '72px' }}
        >
          {data.temperature}
        </Text>
        <Text as="span" variant="heading" size="large" color="muted" style={{ marginBottom: '0.4rem' }}>
          °F
        </Text>
      </FlexRow>

      {/* Bottom row: H/L + humidity + wind */}
      <FlexRow justify="between" align="center">
        <FlexRow gap="sm">
          <Text as="span" variant="caption" size="large" color="muted">H: {data.tempMax}°</Text>
          <Text as="span" variant="caption" size="large" color="muted">L: {data.tempMin}°</Text>
        </FlexRow>
        <FlexRow gap="sm">
          <FlexRow align="center" gap="xs">
            <Icon icon={Droplets} size={11} style={{ color: 'var(--wt-text-muted)' }} />
            <Text as="span" variant="caption" size="small" color="muted">{data.humidity}%</Text>
          </FlexRow>
          <FlexRow align="center" gap="xs">
            <Icon icon={Wind} size={11} style={{ color: 'var(--wt-text-muted)' }} />
            <Text as="span" variant="caption" size="small" color="muted">{data.windSpeed} mph</Text>
          </FlexRow>
        </FlexRow>
      </FlexRow>
    </FlexCol>
  )
}
