import type { PluginPreference } from '@whiteboard/sdk'
import type { WidgetConstraints } from '@whiteboard/ui-kit'
import { WIDGET_SHAPES } from '@whiteboard/ui-kit'
import type { WidgetTypeDef, WidgetVariantDef } from './types'

import { ClockWidget, AnalogClockWidget, DigitalClockWidget } from './ClockWidget'
import { ClockSettings, VariantClockSettings } from './ClockSettings'
import { WeatherWidget } from './WeatherWidget'
import { WeatherSettings } from './WeatherSettings'
import { CountdownWidget } from './CountdownWidget'
import { CountdownSettings } from './CountdownSettings'
import { QuoteWidget } from './QuoteWidget'
import { QuoteSettings } from './QuoteSettings'
import { HtmlWidget } from './HtmlWidget'
import {
  NFLWidget, NBAWidget, NHLWidget, MLBWidget,
  NFLScoresWidget, NBAScoresWidget, NHLScoresWidget, MLBScoresWidget,
  NFLStandingsWidget, NBAStandingsWidget, NHLStandingsWidget, MLBStandingsWidget,
  EPLWidget, EPLScoresWidget, EPLStandingsWidget,
  LaLigaWidget, LaLigaScoresWidget, LaLigaStandingsWidget,
  UCLWidget, UCLScoresWidget, UCLStandingsWidget,
  BundesligaWidget, BundesligaScoresWidget, BundesligaStandingsWidget,
  SerieAWidget, SerieAScoresWidget, SerieAStandingsWidget,
  Ligue1Widget, Ligue1ScoresWidget, Ligue1StandingsWidget,
  MLSWidget, MLSScoresWidget, MLSStandingsWidget,
} from './SportsWidget'
import {
  NFLSettings, NBASettings, NHLSettings, MLBSettings,
  EPLSettings, LaLigaSettings, UCLSettings, BundesligaSettings,
  SerieASettings, Ligue1Settings, MLSSettings,
} from './SportsSettings'
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
import { WalliAgentWidget, WalliAgentSettings } from './WalliAgentWidget'
import { SplitWidget } from './SplitWidget'
import { SplitSettings } from './SplitSettings'
import { GooglePhotosWidget } from './GooglePhotosWidget'
import { GooglePhotosSettings } from './GooglePhotosSettings'
import { RSSWidget } from './RSSWidget'
import { RSSSettings } from './RSSSettings'
import { StockTickerWidget } from './StockTickerWidget'
import { StockTickerSettings } from './StockTickerSettings'
import { TodoistWidget } from './TodoistWidget'
import { TodoistSettings } from './TodoistSettings'
import { ICalWidget } from './ICalWidget'
import { ICalSettings } from './ICalSettings'

export type { WidgetProps } from '@whiteboard/sdk'
export type { WidgetTypeDef, WidgetVariantDef } from './types'

// ── Legacy flat interface (kept for backwards compatibility) ──────────────────

export interface StaticWidgetDef {
  type:               string
  label:              string
  Icon:               string
  iconColor:          string
  keywords:           string[]
  defaultSize:        { width: number; height: number }
  scalable?:          boolean
  constraints?:       WidgetConstraints
  preferences?:       PluginPreference[]
  component:          React.ComponentType<{ widgetId: string }>
  settingsComponent?: React.ComponentType<{ widgetId: string }>
}

// ── Built-in widget types (grouped with variants) ────────────────────────────

const BUILTIN_WIDGET_TYPES: WidgetTypeDef[] = [
  {
    typeId:      '@whiteboard/clock',
    label:       'Clock',
    Icon:        'Clock',
    iconColor:   '#78716c',
    keywords:    ['clock', 'time', 'date', 'analog', 'digital'],
    description: 'Display the current time and date',
    variants: [
      {
        variantId:         'digital',
        label:             'Digital',
        description:       'Clean digital time display',
        shape:             WIDGET_SHAPES['small-wide'],
        component:         DigitalClockWidget,
        settingsComponent: VariantClockSettings,
      },
      {
        variantId:         'analog',
        label:             'Analog',
        description:       'Classic analog clock face',
        shape:             WIDGET_SHAPES['small-square'],
        component:         AnalogClockWidget,
        settingsComponent: VariantClockSettings,
      },
      {
        variantId:         'default',
        label:             'Clock (Classic)',
        description:       'Configurable clock with all options',
        shape:             WIDGET_SHAPES['small-wide'],
        constraints:       { minWidth: 200, minHeight: 160, maxWidth: 600, maxHeight: 480 },
        component:         ClockWidget,
        settingsComponent: ClockSettings,
      },
    ],
  },
  {
    typeId:      '@whiteboard/countdown',
    label:       'Countdown',
    Icon:        'Timer',
    iconColor:   '#8b5cf6',
    keywords:    ['countdown', 'timer', 'deadline', 'birthday', 'vacation', 'event'],
    description: 'Count down to an important date',
    variants: [{
      variantId:         'default',
      label:             'Countdown',
      description:       'Count down to an important date',
      shape:             WIDGET_SHAPES['small-wide'],
      scalable:          false,
      constraints:       { minWidth: 200, minHeight: 160, maxWidth: 700, maxHeight: 400 },
      component:         CountdownWidget,
      settingsComponent: CountdownSettings,
    }],
  },
  {
    typeId:      '@whiteboard/quote',
    label:       'Quote of the Day',
    Icon:        'Quotes',
    iconColor:   '#e11d48',
    keywords:    ['quote', 'inspiration', 'motivation', 'daily', 'wisdom'],
    description: 'Daily inspirational quotes',
    variants: [{
      variantId:         'default',
      label:             'Quote of the Day',
      description:       'Daily inspirational quotes',
      shape:             WIDGET_SHAPES['small-wide'],
      component:         QuoteWidget,
      settingsComponent: QuoteSettings,
    }],
  },
  {
    typeId:      '@whiteboard/weather',
    label:       'Weather',
    Icon:        'Sun',
    iconColor:   '#f59e0b',
    keywords:    ['weather', 'temperature', 'forecast', 'rain', 'sun'],
    description: 'Current weather and forecast',
    variants: [{
      variantId:         'default',
      label:             'Weather',
      description:       'Current weather and forecast',
      shape:             WIDGET_SHAPES['small-wide'],
      constraints:       { minWidth: 220, minHeight: 180, maxWidth: 480, maxHeight: 360 },
      component:         WeatherWidget,
      settingsComponent: WeatherSettings,
    }],
  },
  {
    typeId:      '@whiteboard/nfl',
    label:       'NFL Scores',
    Icon:        'Football',
    iconColor:   '#ea580c',
    keywords:    ['nfl', 'football', 'scores', 'sports'],
    description: 'Live NFL scores and standings',
    variants: [
      {
        variantId:         'scores',
        label:             'Scores',
        description:       'Live game scores',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NFLScoresWidget,
        settingsComponent: NFLSettings,
      },
      {
        variantId:         'standings',
        label:             'Standings',
        description:       'League standings and rankings',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NFLStandingsWidget,
        settingsComponent: NFLSettings,
      },
      {
        variantId:         'default',
        label:             'Combined',
        description:       'Scores and standings with tab switcher',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NFLWidget,
        settingsComponent: NFLSettings,
      },
    ],
  },
  {
    typeId:      '@whiteboard/nba',
    label:       'NBA Scores',
    Icon:        'Basketball',
    iconColor:   '#2563eb',
    keywords:    ['nba', 'basketball', 'scores', 'sports'],
    description: 'Live NBA scores and standings',
    variants: [
      {
        variantId:         'scores',
        label:             'Scores',
        description:       'Live game scores',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NBAScoresWidget,
        settingsComponent: NBASettings,
      },
      {
        variantId:         'standings',
        label:             'Standings',
        description:       'League standings and rankings',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NBAStandingsWidget,
        settingsComponent: NBASettings,
      },
      {
        variantId:         'default',
        label:             'Combined',
        description:       'Scores and standings with tab switcher',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NBAWidget,
        settingsComponent: NBASettings,
      },
    ],
  },
  {
    typeId:      '@whiteboard/nhl',
    label:       'NHL',
    Icon:        'Hockey',
    iconColor:   '#334155',
    keywords:    ['nhl', 'hockey', 'scores', 'standings', 'sports'],
    description: 'NHL scores and standings',
    variants: [
      {
        variantId:         'scores',
        label:             'Scores',
        description:       'Live game scores',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NHLScoresWidget,
        settingsComponent: NHLSettings,
      },
      {
        variantId:         'standings',
        label:             'Standings',
        description:       'League standings and rankings',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NHLStandingsWidget,
        settingsComponent: NHLSettings,
      },
      {
        variantId:         'default',
        label:             'Combined',
        description:       'Scores and standings with tab switcher',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         NHLWidget,
        settingsComponent: NHLSettings,
      },
    ],
  },
  {
    typeId:      '@whiteboard/mlb',
    label:       'MLB',
    Icon:        'Baseball',
    iconColor:   '#dc2626',
    keywords:    ['mlb', 'baseball', 'scores', 'standings', 'sports'],
    description: 'MLB scores and standings',
    variants: [
      {
        variantId:         'scores',
        label:             'Scores',
        description:       'Live game scores',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         MLBScoresWidget,
        settingsComponent: MLBSettings,
      },
      {
        variantId:         'standings',
        label:             'Standings',
        description:       'League standings and rankings',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         MLBStandingsWidget,
        settingsComponent: MLBSettings,
      },
      {
        variantId:         'default',
        label:             'Combined',
        description:       'Scores and standings with tab switcher',
        shape:             WIDGET_SHAPES['tall-rect'],
        constraints:       { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 },
        component:         MLBWidget,
        settingsComponent: MLBSettings,
      },
    ],
  },
  {
    typeId:      '@whiteboard/epl',
    label:       'Premier League',
    Icon:        'SoccerBall',
    iconColor:   '#37003c',
    keywords:    ['premier league', 'epl', 'soccer', 'football', 'england', 'scores', 'sports'],
    description: 'English Premier League scores and standings',
    variants: [
      { variantId: 'scores', label: 'Scores', description: 'Live match scores', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: EPLScoresWidget, settingsComponent: EPLSettings },
      { variantId: 'standings', label: 'Standings', description: 'League table', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: EPLStandingsWidget, settingsComponent: EPLSettings },
      { variantId: 'default', label: 'Combined', description: 'Scores and standings with tab switcher', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: EPLWidget, settingsComponent: EPLSettings },
    ],
  },
  {
    typeId:      '@whiteboard/laliga',
    label:       'La Liga',
    Icon:        'SoccerBall',
    iconColor:   '#ee8707',
    keywords:    ['la liga', 'soccer', 'football', 'spain', 'scores', 'sports'],
    description: 'Spanish La Liga scores and standings',
    variants: [
      { variantId: 'scores', label: 'Scores', description: 'Live match scores', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: LaLigaScoresWidget, settingsComponent: LaLigaSettings },
      { variantId: 'standings', label: 'Standings', description: 'League table', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: LaLigaStandingsWidget, settingsComponent: LaLigaSettings },
      { variantId: 'default', label: 'Combined', description: 'Scores and standings with tab switcher', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: LaLigaWidget, settingsComponent: LaLigaSettings },
    ],
  },
  {
    typeId:      '@whiteboard/ucl',
    label:       'Champions League',
    Icon:        'SoccerBall',
    iconColor:   '#0e1e5b',
    keywords:    ['champions league', 'ucl', 'uefa', 'soccer', 'football', 'europe', 'scores', 'sports'],
    description: 'UEFA Champions League scores and standings',
    variants: [
      { variantId: 'scores', label: 'Scores', description: 'Live match scores', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: UCLScoresWidget, settingsComponent: UCLSettings },
      { variantId: 'standings', label: 'Standings', description: 'Group standings', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: UCLStandingsWidget, settingsComponent: UCLSettings },
      { variantId: 'default', label: 'Combined', description: 'Scores and standings with tab switcher', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: UCLWidget, settingsComponent: UCLSettings },
    ],
  },
  {
    typeId:      '@whiteboard/bundesliga',
    label:       'Bundesliga',
    Icon:        'SoccerBall',
    iconColor:   '#d20515',
    keywords:    ['bundesliga', 'soccer', 'football', 'germany', 'scores', 'sports'],
    description: 'German Bundesliga scores and standings',
    variants: [
      { variantId: 'scores', label: 'Scores', description: 'Live match scores', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: BundesligaScoresWidget, settingsComponent: BundesligaSettings },
      { variantId: 'standings', label: 'Standings', description: 'League table', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: BundesligaStandingsWidget, settingsComponent: BundesligaSettings },
      { variantId: 'default', label: 'Combined', description: 'Scores and standings with tab switcher', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: BundesligaWidget, settingsComponent: BundesligaSettings },
    ],
  },
  {
    typeId:      '@whiteboard/seriea',
    label:       'Serie A',
    Icon:        'SoccerBall',
    iconColor:   '#024494',
    keywords:    ['serie a', 'soccer', 'football', 'italy', 'scores', 'sports'],
    description: 'Italian Serie A scores and standings',
    variants: [
      { variantId: 'scores', label: 'Scores', description: 'Live match scores', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: SerieAScoresWidget, settingsComponent: SerieASettings },
      { variantId: 'standings', label: 'Standings', description: 'League table', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: SerieAStandingsWidget, settingsComponent: SerieASettings },
      { variantId: 'default', label: 'Combined', description: 'Scores and standings with tab switcher', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: SerieAWidget, settingsComponent: SerieASettings },
    ],
  },
  {
    typeId:      '@whiteboard/ligue1',
    label:       'Ligue 1',
    Icon:        'SoccerBall',
    iconColor:   '#091c3e',
    keywords:    ['ligue 1', 'soccer', 'football', 'france', 'scores', 'sports'],
    description: 'French Ligue 1 scores and standings',
    variants: [
      { variantId: 'scores', label: 'Scores', description: 'Live match scores', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: Ligue1ScoresWidget, settingsComponent: Ligue1Settings },
      { variantId: 'standings', label: 'Standings', description: 'League table', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: Ligue1StandingsWidget, settingsComponent: Ligue1Settings },
      { variantId: 'default', label: 'Combined', description: 'Scores and standings with tab switcher', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: Ligue1Widget, settingsComponent: Ligue1Settings },
    ],
  },
  {
    typeId:      '@whiteboard/mls',
    label:       'MLS',
    Icon:        'SoccerBall',
    iconColor:   '#cf0032',
    keywords:    ['mls', 'soccer', 'football', 'usa', 'scores', 'sports'],
    description: 'Major League Soccer scores and standings',
    variants: [
      { variantId: 'scores', label: 'Scores', description: 'Live match scores', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: MLSScoresWidget, settingsComponent: MLSSettings },
      { variantId: 'standings', label: 'Standings', description: 'League table', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: MLSStandingsWidget, settingsComponent: MLSSettings },
      { variantId: 'default', label: 'Combined', description: 'Scores and standings with tab switcher', shape: WIDGET_SHAPES['tall-rect'], constraints: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 700 }, component: MLSWidget, settingsComponent: MLSSettings },
    ],
  },
  {
    typeId:      '@whiteboard/note',
    label:       'Note',
    Icon:        'Note',
    iconColor:   '#eab308',
    keywords:    ['note', 'text', 'memo', 'sticky', 'write'],
    description: 'Quick notes and text',
    variants: [{
      variantId:   'default',
      label:       'Note',
      description: 'Quick notes and text',
      shape:       WIDGET_SHAPES['small-wide'],
      constraints: { minWidth: 160, minHeight: 120, maxWidth: 800, maxHeight: 800 },
      component:   NoteWidget,
    }],
  },
  {
    typeId:      '@whiteboard/pomodoro',
    label:       'Pomodoro Timer',
    Icon:        'ClockCounterClockwise',
    iconColor:   '#dc2626',
    keywords:    ['pomodoro', 'timer', 'focus', 'productivity', 'work', 'break'],
    description: 'Focus timer with work and break intervals',
    variants: [{
      variantId:         'default',
      label:             'Pomodoro Timer',
      description:       'Focus timer with work and break intervals',
      shape:             WIDGET_SHAPES['tall-rect'],
      scalable:          false,
      constraints:       { minWidth: 240, minHeight: 260, maxWidth: 700, maxHeight: 560 },
      component:         PomodoroWidget,
      settingsComponent: PomodoroSettings,
    }],
  },
  {
    typeId:      '@whiteboard/html',
    label:       'Custom (HTML)',
    Icon:        'Code',
    iconColor:   '#64748b',
    keywords:    ['html', 'custom', 'code', 'embed', 'dynamic'],
    description: 'Embed custom HTML content',
    variants: [{
      variantId:   'default',
      label:       'Custom (HTML)',
      description: 'Embed custom HTML content',
      shape:       WIDGET_SHAPES['medium-square'],
      component:   HtmlWidget,
    }],
  },
  {
    typeId:      '@whiteboard/youtube',
    label:       'YouTube',
    Icon:        'YoutubeLogo',
    iconColor:   '#dc2626',
    keywords:    ['youtube', 'video', 'watch', 'stream', 'music', 'embed'],
    description: 'Embed a YouTube video',
    variants: [{
      variantId:         'default',
      label:             'YouTube',
      description:       'Embed a YouTube video',
      shape:             WIDGET_SHAPES['large-wide'],
      component:         YouTubeWidget,
      settingsComponent: YouTubeSettings,
    }],
  },
  {
    typeId:      '@whiteboard/notion-view',
    label:       'Notion View',
    Icon:        'Database',
    iconColor:   '#7c3aed',
    keywords:    ['notion', 'database', 'tracker', 'table', 'kanban', 'chart', 'habit', 'timeline', 'stats'],
    description: 'Display a Notion database view',
    variants: [{
      variantId:         'default',
      label:             'Notion View',
      description:       'Display a Notion database view',
      shape:             WIDGET_SHAPES['medium-square'],
      component:         NotionViewWidget,
      settingsComponent: NotionViewSettingsPanel,
    }],
  },
  {
    typeId:      '@whiteboard/url',
    label:       'Website',
    Icon:        'Globe',
    iconColor:   '#0284c7',
    keywords:    ['url', 'website', 'iframe', 'embed', 'browser', 'web', 'link'],
    description: 'Embed any website',
    variants: [{
      variantId:         'default',
      label:             'Website',
      description:       'Embed any website',
      shape:             WIDGET_SHAPES['extra-wide'],
      component:         UrlWidget,
      settingsComponent: UrlSettings,
    }],
  },
  {
    typeId:      '@whiteboard/routines',
    label:       'Routines',
    Icon:        'CheckSquare',
    iconColor:   '#059669',
    keywords:    ['routines', 'habits', 'morning', 'evening', 'checklist', 'daily'],
    description: 'Track daily habits and routines',
    variants: [{
      variantId:         'default',
      label:             'Routines',
      description:       'Track daily habits and routines',
      shape:             WIDGET_SHAPES['tall-rect'],
      component:         RoutinesWidget,
      settingsComponent: RoutinesSettings,
    }],
  },
  {
    typeId:      '@whiteboard/spotify',
    label:       'Spotify',
    Icon:        'MusicNote',
    iconColor:   '#16a34a',
    keywords:    ['spotify', 'music', 'now playing', 'player', 'audio'],
    description: 'Now playing and music controls',
    variants: [{
      variantId:         'default',
      label:             'Spotify',
      description:       'Now playing and music controls',
      shape:             WIDGET_SHAPES['tall-rect'],
      component:         SpotifyWidget,
      settingsComponent: SpotifySettings,
    }],
  },
  {
    typeId:      '@whiteboard/timers',
    label:       'Timers & Reminders',
    Icon:        'Bell',
    iconColor:   '#ea580c',
    keywords:    ['timer', 'alarm', 'reminder', 'countdown', 'alert'],
    description: 'Set timers and reminders',
    variants: [{
      variantId:   'default',
      label:       'Timers & Reminders',
      description: 'Set timers and reminders',
      shape:       WIDGET_SHAPES['tall-rect'],
      constraints: { minWidth: 240, minHeight: 240, maxWidth: 600, maxHeight: 700 },
      component:   TimersWidget,
    }],
  },
  {
    typeId:      '@whiteboard/worldcup',
    label:       'World Cup 2026',
    Icon:        'SoccerBall',
    iconColor:   '#ca8a04',
    keywords:    ['world cup', 'fifa', 'soccer', 'football', 'scores', 'espn', '2026'],
    description: 'FIFA World Cup 2026 scores',
    variants: [{
      variantId:   'default',
      label:       'World Cup 2026',
      description: 'FIFA World Cup 2026 scores',
      shape:       WIDGET_SHAPES['tall-rect'],
      component:   WorldcupWidget,
    }],
  },
  {
    typeId:      '@whiteboard/calendar',
    label:       'Calendar',
    Icon:        'CalendarDots',
    iconColor:   '#2563eb',
    keywords:    ['calendar', 'events', 'google', 'schedule'],
    description: 'View your calendar events',
    variants: [{
      variantId:   'default',
      label:       'Calendar',
      description: 'View your calendar events',
      shape:       WIDGET_SHAPES['medium-wide'],
      component:   CalendarWidget,
    }],
  },
  {
    typeId:      '@whiteboard/database',
    label:       'Database',
    Icon:        'Database',
    iconColor:   '#ea580c',
    keywords:    ['notion', 'database', 'table', 'data'],
    description: 'Display a database table',
    variants: [{
      variantId:   'default',
      label:       'Database',
      description: 'Display a database table',
      shape:       WIDGET_SHAPES['large-wide'],
      component:   DatabaseWidget,
    }],
  },
  {
    typeId:      '@whiteboard/walli-agent',
    label:       'Agent Widget',
    Icon:        'Robot',
    iconColor:   '#7c3aed',
    keywords:    ['walli', 'agent', 'apollo', 'miles', 'harvey', 'health', 'tasks', 'habits'],
    description: 'AI agent assistant',
    variants: [{
      variantId:         'default',
      label:             'Agent Widget',
      description:       'AI agent assistant',
      shape:             WIDGET_SHAPES['small-wide'],
      constraints:       { minWidth: 220, minHeight: 200, maxWidth: 600, maxHeight: 600 },
      component:         WalliAgentWidget,
      settingsComponent: WalliAgentSettings,
    }],
  },
  {
    typeId:      '@whiteboard/google-photos',
    label:       'Google Photos',
    Icon:        'Image',
    iconColor:   '#4285F4',
    keywords:    ['photos', 'images', 'slideshow', 'google', 'album', 'pictures', 'gallery'],
    description: 'Display a rotating slideshow of your Google Photos',
    variants: [{
      variantId:         'default',
      label:             'Slideshow',
      description:       'Rotating photo slideshow from Google Photos',
      shape:             WIDGET_SHAPES['large-wide'],
      scalable:          true,
      constraints:       { minWidth: 280, minHeight: 200, maxWidth: 1400, maxHeight: 900 },
      component:         GooglePhotosWidget,
      settingsComponent: GooglePhotosSettings,
    }],
  },
  {
    typeId:      '@whiteboard/rss',
    label:       'News Feed',
    Icon:        'Newspaper',
    iconColor:   '#F97316',
    keywords:    ['news', 'rss', 'feed', 'headlines', 'articles', 'blog'],
    description: 'Display headlines from any RSS or Atom feed',
    variants: [{
      variantId:         'default',
      label:             'Headlines',
      description:       'Scrolling news headlines from RSS feeds',
      shape:             WIDGET_SHAPES['tall-rect'],
      scalable:          true,
      constraints:       { minWidth: 240, minHeight: 260, maxWidth: 600, maxHeight: 800 },
      component:         RSSWidget,
      settingsComponent: RSSSettings,
    }],
  },
  {
    typeId:      '@whiteboard/ical',
    label:       'Calendar Feed',
    Icon:        'CalendarBlank',
    iconColor:   '#0078d4',
    keywords:    ['ical', 'calendar', 'outlook', 'apple', 'ics', 'feed', 'events', 'schedule'],
    description: 'Display events from any iCal/ICS calendar feed',
    variants: [{
      variantId:         'default',
      label:             'Agenda',
      description:       'Upcoming events from an iCal feed',
      shape:             WIDGET_SHAPES['tall-rect'],
      scalable:          true,
      constraints:       { minWidth: 240, minHeight: 260, maxWidth: 500, maxHeight: 800 },
      component:         ICalWidget,
      settingsComponent: ICalSettings,
    }],
  },
  {
    typeId:      '@whiteboard/stocks',
    label:       'Stock Ticker',
    Icon:        'TrendUp',
    iconColor:   '#16a34a',
    keywords:    ['stocks', 'market', 'finance', 'ticker', 'shares', 'crypto', 'investment'],
    description: 'Track stock prices and market data',
    variants: [{
      variantId:         'default',
      label:             'Stock Ticker',
      description:       'Track stock prices and market data',
      shape:             WIDGET_SHAPES['tall-rect'],
      scalable:          true,
      constraints:       { minWidth: 240, minHeight: 260, maxWidth: 500, maxHeight: 700 },
      component:         StockTickerWidget,
      settingsComponent: StockTickerSettings,
    }],
  },
  {
    typeId:      '@whiteboard/split',
    label:       'Split Container',
    Icon:        'SquareSplitHorizontal',
    iconColor:   '#6366f1',
    keywords:    ['split', 'container', 'layout', 'two', 'dual', 'pane', 'side by side'],
    description: 'Split a widget into two panes',
    variants: [{
      variantId:         'default',
      label:             'Split Container',
      description:       'Two resizable panes, each holding a widget',
      shape:             WIDGET_SHAPES['large-wide'],
      constraints:       { minWidth: 320, minHeight: 200, maxWidth: 1400, maxHeight: 900 },
      component:         SplitWidget,
      settingsComponent: SplitSettings,
    }],
  },
  {
    typeId:      '@whiteboard/todoist',
    label:       'Todoist',
    Icon:        'CheckCircle',
    iconColor:   '#e44332',
    keywords:    ['todoist', 'tasks', 'todo', 'checklist', 'productivity'],
    description: 'View and manage your Todoist tasks',
    variants: [{
      variantId:         'default',
      label:             'Todoist',
      description:       'View and manage your Todoist tasks',
      shape:             WIDGET_SHAPES['tall-rect'],
      scalable:          true,
      constraints:       { minWidth: 240, minHeight: 280, maxWidth: 500, maxHeight: 700 },
      component:         TodoistWidget,
      settingsComponent: TodoistSettings,
    }],
  },
]

// ── Plugin registry ───────────────────────────────────────────────────────────

let PLUGIN_TYPES: WidgetTypeDef[] = []

export function registerPluginWidgets(defs: StaticWidgetDef[]): void {
  PLUGIN_TYPES = defs.map((d) => ({
    typeId:      d.type,
    label:       d.label,
    Icon:        d.Icon,
    iconColor:   d.iconColor,
    keywords:    d.keywords,
    description: d.label,
    variants: [{
      variantId:         'default',
      label:             d.label,
      description:       d.label,
      shape:             { id: 'custom', width: d.defaultSize.width, height: d.defaultSize.height, label: 'Custom' },
      scalable:          d.scalable,
      constraints:       d.constraints,
      preferences:       d.preferences,
      component:         d.component,
      settingsComponent: d.settingsComponent,
    }],
  }))
}

// ── New API (type + variant) ─────────────────────────────────────────────────

export function getAllWidgetTypes(): WidgetTypeDef[] {
  return [...BUILTIN_WIDGET_TYPES, ...PLUGIN_TYPES].sort((a, b) => a.label.localeCompare(b.label))
}

export function getWidgetType(typeId: string): WidgetTypeDef | undefined {
  return BUILTIN_WIDGET_TYPES.find((t) => t.typeId === typeId)
    ?? PLUGIN_TYPES.find((t) => t.typeId === typeId)
}

export function getWidgetVariant(typeId: string, variantId: string): WidgetVariantDef | undefined {
  const typeDef = getWidgetType(typeId)
  return typeDef?.variants.find((v) => v.variantId === variantId)
}

// ── Backwards-compatible adapters ────────────────────────────────────────────

function typeToStaticDef(t: WidgetTypeDef): StaticWidgetDef {
  const v = t.variants[0]
  return {
    type:               t.typeId,
    label:              t.label,
    Icon:               t.Icon,
    iconColor:          t.iconColor,
    keywords:           t.keywords,
    defaultSize:        { width: v.shape.width, height: v.shape.height },
    scalable:           v.scalable,
    constraints:        v.constraints,
    preferences:        v.preferences,
    component:          v.component,
    settingsComponent:  v.settingsComponent,
  }
}

export function getAllWidgetDefs(): StaticWidgetDef[] {
  return getAllWidgetTypes().map(typeToStaticDef)
}

export function getStaticWidgetDef(type: string): StaticWidgetDef | undefined {
  const t = getWidgetType(type)
  return t ? typeToStaticDef(t) : undefined
}
