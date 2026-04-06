import type { PluginPreference } from '@whiteboard/sdk'
import { ClockWidget } from './ClockWidget'
import { ClockSettings } from './ClockSettings'
import { WeatherWidget } from './WeatherWidget'
import { WeatherSettings } from './WeatherSettings'
import { CountdownWidget } from './CountdownWidget'
import { CountdownSettings } from './CountdownSettings'
import { QuoteWidget } from './QuoteWidget'
import { QuoteSettings } from './QuoteSettings'
import { HtmlWidget } from './HtmlWidget'
import { NFLWidget, NBAWidget } from './SportsWidget'
import { NFLSettings, NBASettings } from './SportsSettings'
import { NoteWidget } from './NoteWidget'
import { PomodoroWidget, PomodoroSettings } from './PomodoroWidget'

import { YouTubeWidget, YouTubeSettings } from './YouTubeWidget'
import { SpotifyWidget, SpotifySettings } from './SpotifyWidget'
import { WorldcupWidget } from './WorldcupWidget'
import { NotionViewWidget, NotionViewSettingsPanel } from './notion-view'
import { UrlWidget, UrlSettings } from './UrlWidget'
import { RoutinesWidget, RoutinesSettings } from './RoutinesWidget'
import { TimersWidget } from './TimersWidget'
import { CalendarWidget } from './CalendarWidget'
import { DatabaseWidget } from './DatabaseWidget'
import { GiphyWidget } from './GiphyWidget'
import { GiphySettings } from './GiphySettings'
import { GIPHY_CONSTRAINTS, type WidgetSizeConstraints } from '../../lib/widgetConstraints'

export type { WidgetProps } from '@whiteboard/sdk'

export interface StaticWidgetDef {
  type:               string
  label:              string
  Icon:               string
  iconBg:             string
  iconClass:          string
  keywords:           string[]
  defaultSize:        { width: number; height: number }
  /** Per-widget min/max resize constraints. Falls back to Widget.tsx global defaults when absent. */
  sizeConstraints?:   WidgetSizeConstraints
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
    type:              '@whiteboard/notion-view',
    label:             'Notion View',
    Icon:              'Database',
    iconBg:            'bg-purple-50',
    iconClass:         'text-purple-500',
    keywords:          ['notion', 'database', 'tracker', 'table', 'kanban', 'chart', 'habit', 'timeline', 'stats'],
    defaultSize:       { width: 400, height: 320 },
    component:         NotionViewWidget,
    settingsComponent: NotionViewSettingsPanel,
  },
  {
    type:              '@whiteboard/url',
    label:             'Website',
    Icon:              'Globe',
    iconBg:            'bg-sky-50',
    iconClass:         'text-sky-500',
    keywords:          ['url', 'website', 'iframe', 'embed', 'browser', 'web', 'link'],
    defaultSize:       { width: 800, height: 540 },
    component:         UrlWidget,
    settingsComponent: UrlSettings,
  },
  {
    type:              '@whiteboard/routines',
    label:             'Routines',
    Icon:              'CheckSquare',
    iconBg:            'bg-emerald-50',
    iconClass:         'text-emerald-500',
    keywords:          ['routines', 'habits', 'morning', 'evening', 'checklist', 'daily'],
    defaultSize:       { width: 300, height: 420 },
    component:         RoutinesWidget,
    settingsComponent: RoutinesSettings,
  },
  {
    type:              '@whiteboard/spotify',
    label:             'Spotify',
    Icon:              'MusicNote',
    iconBg:            'bg-green-50',
    iconClass:         'text-green-500',
    keywords:          ['spotify', 'music', 'now playing', 'player', 'audio'],
    defaultSize:       { width: 300, height: 340 },
    component:         SpotifyWidget,
    settingsComponent: SpotifySettings,
  },
  {
    type:        '@whiteboard/timers',
    label:       'Timers & Reminders',
    Icon:        'Bell',
    iconBg:      'bg-orange-50',
    iconClass:   'text-orange-500',
    keywords:    ['timer', 'alarm', 'reminder', 'countdown', 'alert'],
    defaultSize: { width: 300, height: 320 },
    component:   TimersWidget,
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
  {
    type:        '@whiteboard/calendar',
    label:       'Calendar',
    Icon:        'CalendarDots',
    iconBg:      'bg-blue-100',
    iconClass:   'text-blue-500',
    keywords:    ['calendar', 'events', 'google', 'schedule'],
    defaultSize: { width: 480, height: 360 },
    component:   CalendarWidget,
  },
  {
    type:        '@whiteboard/database',
    label:       'Database',
    Icon:        'Database',
    iconBg:      'bg-orange-100',
    iconClass:   'text-orange-500',
    keywords:    ['notion', 'database', 'table', 'data'],
    defaultSize: { width: 600, height: 400 },
    component:   DatabaseWidget,
  },
  {
    type:              '@whiteboard/giphy',
    label:             'GIF',
    Icon:              'GifIcon',
    iconBg:            'bg-pink-50',
    iconClass:         'text-pink-500',
    keywords:          ['gif', 'giphy', 'animation', 'meme', 'reaction', 'fun'],
    defaultSize:       { width: 320, height: 240 },
    sizeConstraints:   GIPHY_CONSTRAINTS,
    component:         GiphyWidget,
    settingsComponent: GiphySettings,
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
