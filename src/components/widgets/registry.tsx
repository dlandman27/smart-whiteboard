import { type LucideIcon, Clock, Sun, Scale, CheckSquare, Timer, Quote, ListChecks } from 'lucide-react'
import { ClockWidget } from './ClockWidget'
import { ClockSettings } from './ClockSettings'
import { WeatherWidget } from './WeatherWidget'
import { WeightWidget } from './WeightWidget'
import { WeightSettings } from './WeightSettings'
import { TasksWidget } from './TasksWidget'
import { CountdownWidget } from './CountdownWidget'
import { CountdownSettings } from './CountdownSettings'
import { QuoteWidget } from './QuoteWidget'
import { QuoteSettings } from './QuoteSettings'
import { RoutinesWidget } from './RoutinesWidget'
import { RoutinesSettings } from './RoutinesSettings'
import { TasksSettings } from './TasksSettings'
import type { PluginPreference } from '@whiteboard/sdk'

export type { WidgetProps } from '@whiteboard/sdk'

export interface StaticWidgetDef {
  type:               string
  label:              string
  Icon:               LucideIcon
  iconBg:             string
  iconClass:          string
  keywords:           string[]
  defaultSize:        { width: number; height: number }
  scalable?:          boolean
  preferences?:       PluginPreference[]
  component:          React.ComponentType<{ widgetId: string }>
  settingsComponent?: React.ComponentType<{ widgetId: string }>
}

// ── Built-in widgets (hardcoded, always available) ────────────────────────────

const BUILTIN_WIDGETS: StaticWidgetDef[] = [
  {
    type:               '@whiteboard/clock',
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
    type:              '@whiteboard/weight',
    label:             'Weight Progress',
    Icon:              Scale,
    iconBg:            'bg-green-50',
    iconClass:         'text-green-500',
    keywords:          ['weight', 'fitness', 'health', 'progress', 'goal'],
    defaultSize:       { width: 340, height: 200 },
    component:         WeightWidget,
    settingsComponent: WeightSettings,
  },
  {
    type:              '@whiteboard/tasks',
    label:             'Tasks',
    Icon:              CheckSquare,
    iconBg:            'bg-blue-50',
    iconClass:         'text-blue-500',
    keywords:          ['tasks', 'todo', 'checklist', 'list'],
    defaultSize:       { width: 320, height: 400 },
    component:         TasksWidget,
    settingsComponent: TasksSettings,
  },
  {
    type:              '@whiteboard/countdown',
    label:             'Countdown',
    Icon:              Timer,
    iconBg:            'bg-violet-50',
    iconClass:         'text-violet-500',
    keywords:          ['countdown', 'timer', 'deadline', 'birthday', 'vacation', 'event'],
    defaultSize:       { width: 300, height: 240 },
    component:         CountdownWidget,
    settingsComponent: CountdownSettings,
  },
  {
    type:              '@whiteboard/quote',
    label:             'Quote of the Day',
    Icon:              Quote,
    iconBg:            'bg-rose-50',
    iconClass:         'text-rose-400',
    keywords:          ['quote', 'inspiration', 'motivation', 'daily', 'wisdom'],
    defaultSize:       { width: 360, height: 260 },
    component:         QuoteWidget,
    settingsComponent: QuoteSettings,
  },
  {
    type:              '@whiteboard/routines',
    label:             'Routines',
    Icon:              ListChecks,
    iconBg:            'bg-emerald-50',
    iconClass:         'text-emerald-500',
    keywords:          ['routines', 'habits', 'daily', 'checklist', 'morning', 'evening'],
    defaultSize:       { width: 320, height: 480 },
    scalable:          false,
    component:         RoutinesWidget,
    settingsComponent: RoutinesSettings,
  },
  {
    type:        '@whiteboard/weather',
    label:       'Weather',
    Icon:        Sun,
    iconBg:      'bg-amber-50',
    iconClass:   'text-amber-500',
    keywords:    ['weather', 'temperature', 'forecast', 'rain', 'sun'],
    defaultSize: { width: 300, height: 220 },
    component:   WeatherWidget,
  },
]

// ── Plugin registry ───────────────────────────────────────────────────────────

let PLUGIN_WIDGETS: StaticWidgetDef[] = []

export function registerPluginWidgets(defs: StaticWidgetDef[]): void {
  PLUGIN_WIDGETS = defs
}

export function getAllWidgetDefs(): StaticWidgetDef[] {
  return [...BUILTIN_WIDGETS, ...PLUGIN_WIDGETS]
}

export function getStaticWidgetDef(type: string): StaticWidgetDef | undefined {
  return BUILTIN_WIDGETS.find((d) => d.type === type)
    ?? PLUGIN_WIDGETS.find((d) => d.type === type)
}
