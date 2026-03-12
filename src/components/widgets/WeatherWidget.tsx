import { Cloud, CloudLightning, CloudRain, CloudSnow, Droplets, Sun, Wind } from 'lucide-react'
import { useWeather } from '../../hooks/useWeather'
import type { WidgetProps } from './registry'

type IconType = typeof Sun

interface WeatherInfo {
  label:    string
  Icon:     IconType
  gradient: string
}

function getWeatherInfo(code: number): WeatherInfo {
  if (code === 0)   return { label: 'Clear',         Icon: Sun,            gradient: 'from-sky-400 to-blue-600'    }
  if (code <= 3)    return { label: 'Partly Cloudy', Icon: Cloud,          gradient: 'from-sky-300 to-slate-400'   }
  if (code <= 48)   return { label: 'Foggy',         Icon: Cloud,          gradient: 'from-slate-400 to-slate-500' }
  if (code <= 67)   return { label: 'Rainy',         Icon: CloudRain,      gradient: 'from-slate-500 to-slate-600' }
  if (code <= 77)   return { label: 'Snowy',         Icon: CloudSnow,      gradient: 'from-slate-300 to-blue-300'  }
  if (code <= 82)   return { label: 'Showers',       Icon: CloudRain,      gradient: 'from-slate-500 to-blue-700'  }
  return                   { label: 'Stormy',        Icon: CloudLightning,  gradient: 'from-slate-700 to-slate-900' }
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-sky-400 to-blue-600">
      <p className="text-white/60 text-sm">Loading weather…</p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-400 to-slate-600 px-6">
      <p className="text-white/70 text-sm text-center">{message}</p>
    </div>
  )
}

export function WeatherWidget(_props: WidgetProps) {
  const { data, isLoading, isError, geoError } = useWeather()

  if (isLoading)           return <LoadingState />
  if (geoError)            return <ErrorState message="Location access denied" />
  if (isError || !data)    return <ErrorState message="Weather unavailable" />

  const { label, Icon, gradient } = getWeatherInfo(data.weatherCode)

  return (
    <div className={`flex flex-col justify-between h-full w-full bg-gradient-to-br ${gradient} p-5 select-none`}>
      {/* Top row: city + condition icon */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold text-base leading-none">{data.city}</p>
          <p className="text-white/70 text-xs mt-1">{label}</p>
        </div>
        <Icon size={28} className="text-white/90" />
      </div>

      {/* Temperature */}
      <div className="flex items-end gap-1">
        <span className="text-white font-thin leading-none" style={{ fontSize: 80 }}>
          {data.temperature}
        </span>
        <span className="text-white/70 text-3xl mb-2">°F</span>
      </div>

      {/* Bottom row: H/L + humidity + wind */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-white/80 text-xs font-medium">
          <span>H: {data.tempMax}°</span>
          <span>L: {data.tempMin}°</span>
        </div>
        <div className="flex gap-3 text-white/60 text-xs">
          <span className="flex items-center gap-1">
            <Droplets size={11} />{data.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <Wind size={11} />{data.windSpeed} mph
          </span>
        </div>
      </div>
    </div>
  )
}
