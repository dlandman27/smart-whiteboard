import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Icon, Text } from '@whiteboard/ui-kit'
import { Center } from '@whiteboard/ui-kit'
import { fontFamily } from '@whiteboard/ui-kit'
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
  const [settings] = useWidgetSettings<WeatherWidgetSettings>(widgetId, DEFAULT_WEATHER_SETTINGS)
  const { data, isLoading, isError, geoError, locationError, windUnitLabel } = useWeather({
    unit:          settings.unit,
    windUnit:      settings.windUnit,
    locationQuery: settings.locationQuery,
  })

  // Responsive container sizing
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(300)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── States ──────────────────────────────────────────────────────────────────
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
  const sym    = unitSymbol(settings.unit)
  const tempDiff = data.temperature - data.apparentTemperature

  // Responsive sizes
  const tempSize    = Math.max(40, Math.round(containerW * 0.30))
  const unitSize    = Math.max(16, Math.round(containerW * 0.09))
  const citySize    = Math.max(13, Math.round(containerW * 0.055))
  const labelSize   = Math.max(11, Math.round(containerW * 0.043))
  const detailSize  = Math.max(10, Math.round(containerW * 0.040))
  const iconSize    = Math.max(20, Math.round(containerW * 0.10))

  return (
    <div
      ref={containerRef}
      style={{
        width:         '100%',
        height:        '100%',
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'space-between',
        padding:       '14px 16px 12px',
        boxSizing:     'border-box',
        userSelect:    'none',
      }}
    >
      {/* Top: city + icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize:   citySize,
            fontWeight: 600,
            fontFamily: fontFamily.base,
            color:      'var(--wt-text)',
            lineHeight: 1.2,
          }}>
            {data.city}
          </div>
          <div style={{
            fontSize:   labelSize,
            fontWeight: 400,
            fontFamily: fontFamily.base,
            color:      'var(--wt-text-muted)',
            lineHeight: 1.3,
            marginTop:  3,
          }}>
            {label}
          </div>
        </div>
        <Icon icon={icon} size={iconSize} style={{ color, flexShrink: 0 }} weight="duotone" />
      </div>

      {/* Middle: temperature */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{
          fontSize:           tempSize,
          lineHeight:         1,
          fontFamily:         fontFamily.base,
          fontWeight:         '300',
          fontVariantNumeric: 'tabular-nums',
          color:              'var(--wt-text)',
          letterSpacing:      '-0.03em',
        }}>
          {data.temperature}
        </span>
        <span style={{
          fontSize:   unitSize,
          fontFamily: fontFamily.base,
          fontWeight: '400',
          color:      'var(--wt-text-muted)',
          marginBottom: Math.round(unitSize * 0.2),
        }}>
          {sym}
        </span>
      </div>

      {/* Feels like */}
      {settings.showFeelsLike && (
        <div style={{
          fontSize:   detailSize,
          fontFamily: fontFamily.base,
          fontWeight: 400,
          color:      'var(--wt-text-muted)',
          marginTop:  -4,
        }}>
          Feels like {data.apparentTemperature}{sym}
          {Math.abs(tempDiff) >= 3 && (
            <span style={{ marginLeft: 4, opacity: 0.6 }}>
              ({tempDiff > 0 ? 'warmer' : 'colder'})
            </span>
          )}
        </div>
      )}

      {/* Bottom: H/L + details */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: detailSize, fontFamily: fontFamily.base, fontWeight: 500, color: 'var(--wt-text-muted)' }}>
            H: {data.tempMax}{sym}
          </span>
          <span style={{ fontSize: detailSize, fontFamily: fontFamily.base, fontWeight: 500, color: 'var(--wt-text-muted)' }}>
            L: {data.tempMin}{sym}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {settings.showHumidity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon icon="Drop" size={Math.max(10, detailSize - 1)} style={{ color: 'var(--wt-text-muted)' }} />
              <span style={{ fontSize: detailSize, fontFamily: fontFamily.base, color: 'var(--wt-text-muted)' }}>
                {data.humidity}%
              </span>
            </div>
          )}
          {settings.showWind && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon icon="Wind" size={Math.max(10, detailSize - 1)} style={{ color: 'var(--wt-text-muted)' }} />
              <span style={{ fontSize: detailSize, fontFamily: fontFamily.base, color: 'var(--wt-text-muted)' }}>
                {data.windSpeed} {windUnitLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
