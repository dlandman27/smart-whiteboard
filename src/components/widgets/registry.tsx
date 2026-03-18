import { type LucideIcon, Clock, Sun, StickyNote, Scale, CheckSquare, Timer, Quote } from 'lucide-react'
import { ClockWidget } from './ClockWidget'
import { ClockSettings } from './ClockSettings'
import { WeatherWidget } from './WeatherWidget'
import { NoteWidget } from './NoteWidget'
import { NoteSettings } from './NoteSettings'
import { WeightWidget } from './WeightWidget'
import { WeightSettings } from './WeightSettings'
import { TasksWidget } from './TasksWidget'
import { CountdownWidget } from './CountdownWidget'
import { CountdownSettings } from './CountdownSettings'
import { QuoteWidget } from './QuoteWidget'
import { QuoteSettings } from './QuoteSettings'
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
    type:              'weight',
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
    type:        'tasks',
    label:       'Tasks',
    Icon:        CheckSquare,
    iconBg:      'bg-blue-50',
    iconClass:   'text-blue-500',
    keywords:    ['tasks', 'todo', 'checklist', 'list'],
    defaultSize: { width: 320, height: 400 },
    component:   TasksWidget,
  },
  {
    type:              'countdown',
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
    type:              'quote',
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
    type:        'weather',
    label:       'Weather',
    Icon:        Sun,
    iconBg:      'bg-amber-50',
    iconClass:   'text-amber-500',
    keywords:    ['weather', 'temperature', 'forecast', 'rain', 'sun'],
    defaultSize: { width: 300, height: 220 },
    component:   WeatherWidget,
  },
  {
    type:              'note',
    label:             'Note',
    Icon:              StickyNote,
    iconBg:            'bg-yellow-50',
    iconClass:         'text-yellow-500',
    keywords:          ['note', 'sticky', 'text', 'write', 'memo', 'post-it'],
    defaultSize:       { width: 280, height: 300 },
    scalable:          false,
    component:         NoteWidget,
    settingsComponent: NoteSettings,
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
