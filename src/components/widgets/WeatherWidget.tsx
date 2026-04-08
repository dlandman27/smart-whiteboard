import { useWidgetSettings } from '@whiteboard/sdk'
import { Icon, Text, Center, FlexRow, FlexCol, fontFamily, Container, useWidgetSizeContext } from '@whiteboard/ui-kit'
import { useWeather } from '../../hooks/useWeather'
import type { WidgetProps } from './registry'

export interface WeatherWidgetSettings {
  unit:          'fahrenheit' | 'celsius'
  windUnit:      'mph' | 'kmh' | 'ms'
  locationQuery: string
  showFeelsLike: boolean
  showHumidity:  boolean
  showWind:      boolean
}

export const DEFAULT_WEATHER_SETTINGS: WeatherWidgetSettings = {
  unit:          'fahrenheit',
  windUnit:      'mph',
  locationQuery: '',
  showFeelsLike: true,
  showHumidity:  true,
  showWind:      true,
}

// ── WMO weather code mapping ───────────────────────────────────────────────────

interface WeatherInfo { label: string; icon: string; color: string }

function getWeatherInfo(code: number): WeatherInfo {
  if (code === 0)  return { label: 'Clear',          icon: 'Sun',            color: '#f59e0b' }
  if (code === 1)  return { label: 'Mainly Clear',   icon: 'SunDim',         color: '#f59e0b' }
  if (code === 2)  return { label: 'Partly Cloudy',  icon: 'CloudSun',       color: '#94a3b8' }
  if (code === 3)  return { label: 'Overcast',       icon: 'Cloud',          color: '#64748b' }
  if (code <= 48)  return { label: 'Foggy',          icon: 'CloudFog',       color: '#94a3b8' }
  if (code <= 55)  return { label: 'Drizzle',        icon: 'CloudDrizzle',   color: '#60a5fa' }
  if (code <= 57)  return { label: 'Freezing Rain',  icon: 'CloudSnow',      color: '#93c5fd' }
  if (code <= 65)  return { label: 'Rain',           icon: 'CloudRain',      color: '#3b82f6' }
  if (code <= 67)  return { label: 'Freezing Rain',  icon: 'CloudSnow',      color: '#93c5fd' }
  if (code <= 77)  return { label: 'Snow',           icon: 'CloudSnow',      color: '#93c5fd' }
  if (code <= 82)  return { label: 'Showers',        icon: 'CloudRain',      color: '#3b82f6' }
  if (code <= 86)  return { label: 'Snow Showers',   icon: 'CloudSnow',      color: '#bfdbfe' }
  return                  { label: 'Thunderstorm',   icon: 'CloudLightning', color: '#a855f7' }
}

function unitSymbol(unit: WeatherWidgetSettings['unit']) {
  return unit === 'celsius' ? '°C' : '°F'
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function WeatherWidget({ widgetId }: WidgetProps) {
  return (
    <Container className="flex flex-col justify-between p-4">
      <WeatherContent widgetId={widgetId} />
    </Container>
  )
}

function WeatherContent({ widgetId }: WidgetProps) {
  const { containerWidth: containerW } = useWidgetSizeContext()
  const [settings] = useWidgetSettings<WeatherWidgetSettings>(widgetId, DEFAULT_WEATHER_SETTINGS)
  const { data, isLoading, isError, geoError, locationError, windUnitLabel } = useWeather({
    unit:          settings.unit,
    windUnit:      settings.windUnit,
    locationQuery: settings.locationQuery,
  })

  if (isLoading) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading weather…</Text>
      </Center>
    )
  }
  if (locationError) {
    return (
      <Center fullHeight className="px-6">
        <Text variant="body" size="small" color="muted" align="center">{locationError}</Text>
      </Center>
    )
  }
  if (geoError) {
    return (
      <Center fullHeight className="px-6">
        <Text variant="body" size="small" color="muted" align="center">
          Location access denied.{'\n'}Set a city in settings.
        </Text>
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

  const { label, icon, color } = getWeatherInfo(data.weatherCode)
  const sym     = unitSymbol(settings.unit)
  const tempDiff = data.temperature - data.apparentTemperature

  // Responsive sizes derived from container width
  const tempSize   = Math.max(40, Math.round(containerW * 0.30))
  const unitSize   = Math.max(16, Math.round(containerW * 0.09))
  const citySize   = Math.max(13, Math.round(containerW * 0.055))
  const labelSize  = Math.max(11, Math.round(containerW * 0.043))
  const detailSize = Math.max(10, Math.round(containerW * 0.040))
  const iconSize   = Math.max(20, Math.round(containerW * 0.10))

  return (
    <>
      {/* Top: city name + weather icon */}
      <FlexRow justify="between" align="start">
        <FlexCol gap="none">
          <Text as="span" style={{ fontSize: citySize, fontWeight: 600, fontFamily: fontFamily.base, lineHeight: 1.2 }}>
            {data.city}
          </Text>
          <Text as="span" color="muted" style={{ fontSize: labelSize, fontFamily: fontFamily.base, lineHeight: 1.3, marginTop: 3 }}>
            {label}
          </Text>
        </FlexCol>
        <Icon icon={icon} size={iconSize} style={{ color, flexShrink: 0 }} weight="duotone" />
      </FlexRow>

      {/* Middle: temperature */}
      <FlexRow align="baseline" className="gap-0.5">
        <Text as="span" style={{ fontSize: tempSize, lineHeight: 1, fontFamily: fontFamily.base, fontWeight: '300', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
          {data.temperature}
        </Text>
        <Text as="span" color="muted" style={{ fontSize: unitSize, fontFamily: fontFamily.base, fontWeight: '400', marginBottom: Math.round(unitSize * 0.2) }}>
          {sym}
        </Text>
      </FlexRow>

      {/* Feels like */}
      {settings.showFeelsLike && (
        <Text as="span" color="muted" style={{ fontSize: detailSize, fontFamily: fontFamily.base, marginTop: -4 }}>
          Feels like {data.apparentTemperature}{sym}
          {Math.abs(tempDiff) >= 3 && (
            <Text as="span" color="muted" style={{ marginLeft: 4, opacity: 0.6 }}>
              ({tempDiff > 0 ? 'warmer' : 'colder'})
            </Text>
          )}
        </Text>
      )}

      {/* Bottom: H/L + humidity/wind */}
      <FlexRow justify="between" align="center">
        <FlexRow align="center" className="gap-2">
          <Text as="span" color="muted" style={{ fontSize: detailSize, fontFamily: fontFamily.base, fontWeight: 500 }}>H: {data.tempMax}{sym}</Text>
          <Text as="span" color="muted" style={{ fontSize: detailSize, fontFamily: fontFamily.base, fontWeight: 500 }}>L: {data.tempMin}{sym}</Text>
        </FlexRow>
        <FlexRow align="center" className="gap-2.5">
          {settings.showHumidity && (
            <FlexRow align="center" className="gap-0.5">
              <Icon icon="Drop" size={Math.max(10, detailSize - 1)} style={{ color: 'var(--wt-text-muted)' }} />
              <Text as="span" color="muted" style={{ fontSize: detailSize, fontFamily: fontFamily.base }}>{data.humidity}%</Text>
            </FlexRow>
          )}
          {settings.showWind && (
            <FlexRow align="center" className="gap-0.5">
              <Icon icon="Wind" size={Math.max(10, detailSize - 1)} style={{ color: 'var(--wt-text-muted)' }} />
              <Text as="span" color="muted" style={{ fontSize: detailSize, fontFamily: fontFamily.base }}>{data.windSpeed} {windUnitLabel}</Text>
            </FlexRow>
          )}
        </FlexRow>
      </FlexRow>
    </>
  )
}
