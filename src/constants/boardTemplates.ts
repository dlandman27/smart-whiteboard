// ── Board templates for first-run template picker ───────────────────────────

export interface BoardTemplateWidget {
  type: string
  variantId: string
  settings: Record<string, unknown>
  slotId?: string
}

export interface BoardTemplate {
  id: string
  name: string
  description: string
  icon: string
  widgets: BoardTemplateWidget[]
  layoutId: string
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id:          'family-hub',
    name:        'Family Hub',
    description: 'Calendar, weather, photos, notes, and countdowns for the whole family',
    icon:        'House',
    layoutId:    'grid-3x2',
    widgets: [
      { type: '@whiteboard/calendar',      variantId: 'default', settings: {},                                                     slotId: 'r1c1' },
      { type: '@whiteboard/weather',       variantId: 'default', settings: {},                                                     slotId: 'r1c2' },
      { type: '@whiteboard/google-photos', variantId: 'default', settings: {},                                                     slotId: 'r1c3' },
      { type: '@whiteboard/note',          variantId: 'default', settings: { content: '# Family Notes\n\nAdd your notes here...' }, slotId: 'r2c1' },
      { type: '@whiteboard/countdown',     variantId: 'default', settings: { label: 'Next Vacation' },                             slotId: 'r2c2' },
      { type: '@whiteboard/quote',         variantId: 'default', settings: {},                                                     slotId: 'r2c3' },
    ],
  },
  {
    id:          'home-office',
    name:        'Home Office',
    description: 'Stay productive with calendar, clock, pomodoro, weather, news, and quotes',
    icon:        'Briefcase',
    layoutId:    'grid-3x2',
    widgets: [
      { type: '@whiteboard/calendar',  variantId: 'default', settings: {},                                                                    slotId: 'r1c1' },
      { type: '@whiteboard/clock',     variantId: 'digital', settings: {},                                                                    slotId: 'r1c2' },
      { type: '@whiteboard/pomodoro',  variantId: 'default', settings: {},                                                                    slotId: 'r1c3' },
      { type: '@whiteboard/weather',   variantId: 'default', settings: {},                                                                    slotId: 'r2c1' },
      { type: '@whiteboard/rss',       variantId: 'default', settings: { feedUrl: 'https://hnrss.org/frontpage', title: 'Hacker News' },      slotId: 'r2c2' },
      { type: '@whiteboard/quote',     variantId: 'default', settings: {},                                                                    slotId: 'r2c3' },
    ],
  },
  {
    id:          'kitchen-display',
    name:        'Kitchen Display',
    description: 'Analog clock, weather, family photos, quotes, and a dinner countdown',
    icon:        'CookingPot',
    layoutId:    'dashboard',
    widgets: [
      { type: '@whiteboard/google-photos', variantId: 'default', settings: {},                                         slotId: 'main' },
      { type: '@whiteboard/clock',         variantId: 'analog',  settings: {},                                         slotId: 'side-top' },
      { type: '@whiteboard/weather',       variantId: 'default', settings: {},                                         slotId: 'side-mid' },
      { type: '@whiteboard/countdown',     variantId: 'default', settings: { label: 'Dinner' },                        slotId: 'side-bot' },
    ],
  },
  {
    id:          'sports-fan',
    name:        'Sports Fan',
    description: 'Live scores from NFL, NBA, Premier League plus weather, news, and a clock',
    icon:        'Trophy',
    layoutId:    'grid-3x2',
    widgets: [
      { type: '@whiteboard/nfl',     variantId: 'scores',  settings: {},                                                                     slotId: 'r1c1' },
      { type: '@whiteboard/nba',     variantId: 'scores',  settings: {},                                                                     slotId: 'r1c2' },
      { type: '@whiteboard/epl',     variantId: 'scores',  settings: {},                                                                     slotId: 'r1c3' },
      { type: '@whiteboard/weather', variantId: 'default', settings: {},                                                                     slotId: 'r2c1' },
      { type: '@whiteboard/rss',     variantId: 'default', settings: { feedUrl: 'https://www.espn.com/espn/rss/news', title: 'ESPN News' },  slotId: 'r2c2' },
      { type: '@whiteboard/clock',   variantId: 'digital', settings: {},                                                                     slotId: 'r2c3' },
    ],
  },
  {
    id:          'blank',
    name:        'Blank Canvas',
    description: 'Start from scratch with an empty freeform board',
    icon:        'FrameCorners',
    layoutId:    'freeform',
    widgets:     [],
  },
]
