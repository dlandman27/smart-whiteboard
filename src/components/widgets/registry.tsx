import { type LucideIcon, Clock, Sun } from 'lucide-react'
import { ClockWidget } from './ClockWidget'
import { ClockSettings } from './ClockSettings'
import { WeatherWidget } from './WeatherWidget'

export interface WidgetProps {
  widgetId: string
}

export interface StaticWidgetDef {
  type:               string
  label:              string
  Icon:               LucideIcon
  iconBg:             string   // Tailwind bg class for picker icon container
  iconClass:          string   // Tailwind text class for picker icon
  keywords:           string[]
  defaultSize:        { width: number; height: number }
  component:          React.ComponentType<WidgetProps>
  settingsComponent?: React.ComponentType<WidgetProps>
}

// ── Register new static widgets here — nowhere else needed ────────────────────

export const STATIC_WIDGETS: StaticWidgetDef[] = [
  {
    type:               'clock',
    label:              'Clock',
    Icon:               Clock,
    iconBg:             'bg-stone-100',
    iconClass:          'text-stone-500',
    keywords:           ['clock', 'time', 'date'],
    defaultSize:        { width: 320, height: 200 },
    component:          ClockWidget,
    settingsComponent:  ClockSettings,
  },
  {
    type:        'weather',
    label:       'Weather',
    Icon:        Sun,
    iconBg:      'bg-amber-50',
    iconClass:   'text-amber-500',
    keywords:    ['weather', 'temperature', 'forecast', 'rain', 'sun'],
    defaultSize: { width: 300, height: 220 },
    component:   WeatherWidget,
  },
]

export function getStaticWidgetDef(type: string): StaticWidgetDef | undefined {
  return STATIC_WIDGETS.find((d) => d.type === type)
}
