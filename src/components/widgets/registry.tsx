import type { PluginPreference } from '@whiteboard/sdk'
import { ClockWidget } from './ClockWidget'
import { ClockSettings } from './ClockSettings'
import { WeatherWidget } from './WeatherWidget'
import { WeatherSettings } from './WeatherSettings'
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
import { HtmlWidget } from './HtmlWidget'
import { NFLWidget, NBAWidget } from './SportsWidget'
import { NFLSettings, NBASettings } from './SportsSettings'
import { NoteWidget } from './NoteWidget'
import { PomodoroWidget, PomodoroSettings } from './PomodoroWidget'

import { GroceryWidget, GrocerySettings } from './GroceryWidget'
import { YouTubeWidget, YouTubeSettings } from './YouTubeWidget'
import { WorldcupWidget } from './WorldcupWidget'

export type { WidgetProps } from '@whiteboard/sdk'

export interface StaticWidgetDef {
  type:               string
  label:              string
  Icon:               string
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
    Icon:              'Clock',
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
    Icon:              'Scales',
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
    Icon:              'CheckSquare',
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
    Icon:              'Timer',
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
    Icon:              'Quotes',
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
    Icon:              'ListChecks',
    iconBg:            'bg-emerald-50',
    iconClass:         'text-emerald-500',
    keywords:          ['routines', 'habits', 'daily', 'checklist', 'morning', 'evening'],
    defaultSize:       { width: 320, height: 480 },
    scalable:          false,
    component:         RoutinesWidget,
    settingsComponent: RoutinesSettings,
  },
  {
    type:              '@whiteboard/weather',
    label:             'Weather',
    Icon:              'Sun',
    iconBg:            'bg-amber-50',
    iconClass:         'text-amber-500',
    keywords:          ['weather', 'temperature', 'forecast', 'rain', 'sun'],
    defaultSize:       { width: 300, height: 220 },
    component:         WeatherWidget,
    settingsComponent: WeatherSettings,
  },
  {
    type:             '@whiteboard/nfl',
    label:            'NFL Scores',
    Icon:             'Trophy',
    iconBg:           'bg-orange-50',
    iconClass:        'text-orange-500',
    keywords:         ['nfl', 'football', 'scores', 'sports'],
    defaultSize:      { width: 340, height: 420 },
    component:        NFLWidget,
    settingsComponent: NFLSettings,
  },
  {
    type:             '@whiteboard/nba',
    label:            'NBA Scores',
    Icon:             'Trophy',
    iconBg:           'bg-blue-50',
    iconClass:        'text-blue-500',
    keywords:         ['nba', 'basketball', 'scores', 'sports'],
    defaultSize:      { width: 340, height: 420 },
    component:        NBAWidget,
    settingsComponent: NBASettings,
  },
  {
    type:        '@whiteboard/note',
    label:       'Note',
    Icon:        'Note',
    iconBg:      'bg-yellow-50',
    iconClass:   'text-yellow-500',
    keywords:    ['note', 'text', 'memo', 'sticky', 'write'],
    defaultSize: { width: 320, height: 200 },
    component:   NoteWidget,
  },
  {
    type:              '@whiteboard/pomodoro',
    label:             'Pomodoro Timer',
    Icon:              'ClockCounterClockwise',
    iconBg:            'bg-red-50',
    iconClass:         'text-red-500',
    keywords:          ['pomodoro', 'timer', 'focus', 'productivity', 'work', 'break'],
    defaultSize:       { width: 280, height: 340 },
    component:         PomodoroWidget,
    settingsComponent: PomodoroSettings,
  },
  {
    type:        '@whiteboard/html',
    label:       'Custom (HTML)',
    Icon:        'Code',
    iconBg:      'bg-slate-100',
    iconClass:   'text-slate-500',
    keywords:    ['html', 'custom', 'code', 'embed', 'dynamic'],
    defaultSize: { width: 400, height: 300 },
    component:   HtmlWidget,
  },
  {
    type:              '@whiteboard/grocery',
    label:             'Grocery List',
    Icon:              'ShoppingCart',
    iconBg:            'bg-green-50',
    iconClass:         'text-green-600',
    keywords:          ["grocery","shopping","list","food","store"],
    defaultSize:       { width: 340, height: 520 },
    component:         GroceryWidget,
    settingsComponent: GrocerySettings,
  },
  {
    type:              '@whiteboard/youtube',
    label:             'YouTube',
    Icon:              'YoutubeLogo',
    iconBg:            'bg-red-50',
    iconClass:         'text-red-500',
    keywords:          ['youtube', 'video', 'watch', 'stream', 'music', 'embed'],
    defaultSize:       { width: 560, height: 360 },
    component:         YouTubeWidget,
    settingsComponent: YouTubeSettings,
  },
  {
    type:              '@whiteboard/worldcup',
    label:             'World Cup 2026',
    Icon:              'Trophy',
    iconBg:            'bg-yellow-50',
    iconClass:         'text-yellow-500',
    keywords:          ["world cup","fifa","soccer","football","scores","espn","2026"],
    defaultSize:       { width: 380, height: 540 },
    component:         WorldcupWidget,
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
