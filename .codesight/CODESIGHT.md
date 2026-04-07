# smart-whiteboard — AI Context Map

> **Stack:** express | none | react | typescript

> 61 routes | 0 models | 75 components | 54 lib files | 25 env vars | 2 middleware | 377 import links
> **Token savings:** this file is ~5,300 tokens. Without it, AI exploration would cost ~83,000 tokens. **Saves ~77,700 tokens per conversation.**

---

# Routes

- `GET` `/agents` [db]
- `POST` `/agents/:id/run` params(id) [db]
- `PATCH` `/agents/:id` params(id) [db]
- `POST` `/agents` [db]
- `DELETE` `/agents/:id` params(id) [db]
- `GET` `/canvas/boards` [db]
- `POST` `/canvas/board` [db]
- `PATCH` `/canvas/board/:id` params(id) [db]
- `DELETE` `/canvas/board/:id` params(id) [db]
- `POST` `/canvas/board/:id/activate` params(id) [db]
- `GET` `/briefing` [auth]
- `POST` `/briefing/settings` [auth]
- `GET` `/briefing/settings` [auth]
- `GET` `/canvas/widgets` [auth, db, ai]
- `POST` `/canvas/widget` [auth, db, ai]
- `PATCH` `/canvas/widget/:id` params(id) [auth, db, ai]
- `DELETE` `/canvas/widget/:id` params(id) [auth, db, ai]
- `POST` `/canvas/clear-widgets` [auth, db, ai]
- `POST` `/canvas/layout` [auth, db, ai]
- `POST` `/canvas/focus-widget` [auth, db, ai]
- `POST` `/canvas/theme` [auth, db, ai]
- `POST` `/canvas/custom-theme` [auth, db, ai]
- `POST` `/theme/generate` [auth, db, ai]
- `GET` `/gcal/status` [auth]
- `POST` `/gcal/start-auth` [auth]
- `GET` `/gcal/callback` [auth]
- `GET` `/gcal/calendars` [auth]
- `GET` `/gcal/events` [auth]
- `GET` `/quote` [auth]
- `GET` `/notifications`
- `GET` `/timers`
- `GET` `/reminders`
- `GET` `/health` [auth, db]
- `GET` `/databases` [auth, db]
- `GET` `/databases/:id` params(id) [auth, db]
- `POST` `/databases/:id/query` params(id) [auth, db]
- `POST` `/databases/:id/pages` params(id) [auth, db]
- `POST` `/databases/:id/smart-entry` params(id) [auth, db]
- `PATCH` `/pages/:id` params(id) [auth, db]
- `DELETE` `/pages/:id` params(id) [auth, db]
- `DELETE` `/databases/:id` params(id) [auth, db]
- `GET` `/notion/workspace-page` [auth, db]
- `POST` `/notion/workspace-page` [auth, db]
- `POST` `/notion/databases` [auth, db]
- `GET` `/pages/:id/blocks` params(id) [auth, db]
- `PATCH` `/blocks/:id` params(id) [auth, db]
- `POST` `/doc` [auth, db]
- `GET` `/standings/:league` params(league)
- `GET` `/sports/:league` params(league)
- `GET` `/spotify/status` [auth]
- `POST` `/spotify/start-auth` [auth]
- `GET` `/spotify/callback` [auth]
- `GET` `/spotify/now-playing` [auth]
- `POST` `/spotify/play` [auth]
- `POST` `/spotify/pause` [auth]
- `POST` `/spotify/next` [auth]
- `POST` `/spotify/previous` [auth]
- `POST` `/spotify/volume` [auth]
- `POST` `/voice` [auth, ai]
- `POST` `/tts` [auth, ai]
- `GET` `/youtube/search`

---

# Components

- **SpotifyWidget** — props: widgetId — `plugins\spotify\SpotifyWidget.tsx`
- **App** — `src\App.tsx`
- **AuthGuard** — `src\components\AuthGuard.tsx`
- **BackgroundPicker** — `src\components\BackgroundPicker.tsx`
- **BoardMenu** — props: onClose, onSlide — `src\components\BoardMenu.tsx`
- **BoardNav** — props: onSlide — `src\components\BoardNav.tsx`
- **BoardThumbnail** — props: board, width, height — `src\components\BoardThumbnail.tsx`
- **BottomToolbar** — props: onToolChange, onWidgetSelected — `src\components\BottomToolbar.tsx`
- **ConfigPanel** — props: onClose — `src\components\ConfigPanel.tsx`
- **DatabasePicker** — props: onClose, onWidgetSelected — `src\components\DatabasePicker.tsx`
- **DrawingCanvas** — props: boardId, tool, color, strokeWidth, eraserSize — `src\components\DrawingCanvas.tsx`
- **KioskGuard** — `src\components\KioskGuard.tsx`
- **LayoutPicker** — props: onClose — `src\components\layout\LayoutPicker.tsx`
- **LayoutSlot** — props: id, x, y, width, height, mode, isHovered, onClick — `src\components\layout\LayoutSlot.tsx`
- **LayoutSlots** — props: pendingWidget, draggingWidgetId, hoveredSlotId, onSlotClick — `src\components\layout\LayoutSlots.tsx`
- **LayoutThumbnail** — props: layout, width, height, active — `src\components\layout\LayoutThumbnail.tsx`
- **LoginScreen** — `src\components\LoginScreen.tsx`
- **Logo** — props: size — `src\components\Logo.tsx`
- **LogoSettings** — props: showSettings, onCloseSettings — `src\components\LogoSettings.tsx`
- **NetworkStatusBanner** — `src\components\NetworkStatusBanner.tsx`
- **NotificationCenter** — props: onClose — `src\components\NotificationCenter.tsx`
- **NotificationToast** — `src\components\NotificationToast.tsx`
- **PetBar** — `src\components\PetBar.tsx`
- **PixelSprite** — props: sprite, frameIdx, flip — `src\components\pets\PixelSprite.tsx`
- **WalkingPet** — props: agent, mood, message, onMessageDone, onInspect, inspecting — `src\components\pets\WalkingPet.tsx`
- **Pill** — `src\components\Pill.tsx`
- **SettingsPanel** — props: onClose — `src\components\SettingsPanel.tsx`
- **ThemePicker** — `src\components\ThemePicker.tsx`
- **UndoToast** — `src\components\UndoToast.tsx`
- **VoiceListener** — `src\components\VoiceListener.tsx`
- **WalliChatButton** — `src\components\WalliChat.tsx`
- **Whiteboard** — `src\components\Whiteboard.tsx`
- **WhiteboardBackground** — props: background — `src\components\WhiteboardBackground.tsx`
- **Widget** — props: id, x, y, width, height, settingsContent, preferences, refSize — `src\components\Widget.tsx`
- **WidgetCanvas** — props: activeTool, pendingWidget, onClearPending — `src\components\WidgetCanvas.tsx`
- **CalendarWidget** — props: widgetId — `src\components\widgets\CalendarWidget.tsx`
- **ClockSettings** — props: widgetId — `src\components\widgets\ClockSettings.tsx`
- **ClockWidget** — props: widgetId — `src\components\widgets\ClockWidget.tsx`
- **CountdownSettings** — props: widgetId — `src\components\widgets\CountdownSettings.tsx`
- **CountdownWidget** — props: widgetId — `src\components\widgets\CountdownWidget.tsx`
- **DatabaseWidget** — props: widgetId — `src\components\widgets\DatabaseWidget.tsx`
- **HtmlWidget** — props: widgetId — `src\components\widgets\HtmlWidget.tsx`
- **NoteWidget** — props: widgetId — `src\components\widgets\NoteWidget.tsx`
- **NotionViewWidget** — props: widgetId — `src\components\widgets\notion-view\index.tsx`
- **NotionViewSettingsPanel** — props: widgetId — `src\components\widgets\notion-view\NotionViewSettings.tsx`
- **PomodoroWidget** — props: widgetId — `src\components\widgets\PomodoroWidget.tsx`
- **QuoteSettings** — props: widgetId — `src\components\widgets\QuoteSettings.tsx`
- **QuoteWidget** — props: widgetId — `src\components\widgets\QuoteWidget.tsx`
- **BUILTIN_WIDGETS** — `src\components\widgets\registry.tsx`
- **RoutinesWidget** — props: widgetId — `src\components\widgets\RoutinesWidget.tsx`
- **SportsSettings** — props: widgetId, league — `src\components\widgets\SportsSettings.tsx`
- **NFLWidget** — props: widgetId — `src\components\widgets\SportsWidget.tsx`
- **SpotifyWidget** — props: widgetId — `src\components\widgets\SpotifyWidget.tsx`
- **TimersWidget** — props: widgetId — `src\components\widgets\TimersWidget.tsx`
- **UrlWidget** — props: widgetId — `src\components\widgets\UrlWidget.tsx`
- **WeatherSettings** — props: widgetId — `src\components\widgets\WeatherSettings.tsx`
- **WeatherWidget** — props: widgetId — `src\components\widgets\WeatherWidget.tsx`
- **WorldcupWidget** — props: widgetId — `src\components\widgets\WorldcupWidget.tsx`
- **YouTubeWidget** — props: widgetId — `src\components\widgets\YouTubeWidget.tsx`
- **Box** — props: flex1, fullHeight, fullWidth, noSelect, overflow, as, className, style, onClick — `src\ui\layouts\Box.tsx`
- **Center** — props: dir — `src\ui\layouts\Center.tsx`
- **Flex** — props: dir, align, justify, gap, wrap, flex1, fullHeight, fullWidth, noSelect, overflow — `src\ui\layouts\Flex.tsx`
- **Grid** — props: cols, gap, flex1, fullHeight, as, className, style — `src\ui\layouts\Grid.tsx`
- **ScrollArea** — props: axis, flex1, className, style — `src\ui\layouts\ScrollArea.tsx`
- **Chip** — props: variant, iconLeft, disabled, onClick, className — `src\ui\web\Chip.tsx`
- **Divider** — props: orientation, className — `src\ui\web\Divider.tsx`
- **Icon** — props: icon, size, weight, className, style — `src\ui\web\Icon.tsx`
- **IconButton** — props: icon, variant, size, weight, filled, title, disabled, className, onClick, onMouseDown — `src\ui\web\IconButton.tsx`
- **MenuItem** — props: icon, iconBg, iconStyle, name, source, label, selected, disabled, onClick, onMouseEnter — `src\ui\web\MenuItem.tsx`
- **Panel** — props: onClose, width, maxHeight, className, style — `src\ui\web\Panel.tsx`
- **PanelHeader** — props: title, onClose, onBack, actions, className — `src\ui\web\PanelHeader.tsx`
- **SegmentedControl** — `src\ui\web\SegmentedControl.tsx`
- **SettingsSection** — props: label, className — `src\ui\web\SettingsSection.tsx`
- **Spacer** — props: size, px, horizontal — `src\ui\web\Spacer.tsx`
- **Text** — props: variant, size, color, align, textTransform, numberOfLines, italic, as, className, style — `src\ui\web\Text.tsx`

---

# Libraries

- `mcp\server.ts`
  - function XxxWidget: ({...}) => void
  - function XxxSettings: ({...}) => void
  - interface XxxSettings
  - const XXX_DEFAULTS: XxxSettings
- `plugins\spotify\hooks.ts`
  - function useSpotifyStatus: () => void
  - function useSpotifyNowPlaying: (enabled) => void
  - function startSpotifyAuth: (clientId, clientSecret, redirectUri) => Promise<string>
  - interface NowPlayingTrack
- `server\agents\dynamic-runner.ts`
  - function readUserAgents: () => UserAgentDef[]
  - function addUserAgent: (def, 'createdAt'>) => UserAgentDef
  - function removeUserAgent: (id) => void
  - function updateUserAgent: (id, patch) => UserAgentDef
  - function buildDynamicAgent: (def) => Agent
  - function loadDynamicAgents: () => Agent[]
  - _...1 more_
- `server\agents\index.ts` — function createScheduler: (ctx) => AgentScheduler
- `server\agents\scheduler.ts` — class AgentScheduler
- `server\crons\briefing.ts` — function startBriefingCron: (notion) => void
- `server\crons\index.ts` — function startAllCrons: (notion) => void
- `server\crons\reminders.ts` — function startReminderCron: () => void
- `server\crons\timers.ts` — function startTimerCron: () => void
- `server\lib\logger.ts`
  - function log
  - function warn
  - function error
- `server\lib\notify.ts` — function notify: (title, body, opts) => Promise<void>
- `server\middleware\error.ts`
  - function asyncRoute: (fn, res, next) => void
  - function errorMiddleware: (err, _req, res, _next) => void
  - class AppError
- `server\routes\agents.ts` — function agentsRouter: (agentScheduler) => Router
- `server\routes\boards.ts` — function boardsRouter: () => Router
- `server\routes\briefing.ts` — function briefingRouter: (notion) => Router
- `server\routes\canvas.ts` — function canvasRouter: () => Router
- `server\routes\gcal.ts` — function gcalRouter: () => Router
- `server\routes\misc.ts` — function miscRouter: () => Router
- `server\routes\notifications.ts` — function notificationsRouter: () => Router
- `server\routes\notion.ts` — function notionRouter: (notion) => Router
- `server\routes\sports.ts` — function sportsRouter: () => Router
- `server\routes\spotify.ts` — function spotifyRouter: () => Router
- `server\routes\voice.ts` — function voiceRouter: (notion) => Router
- `server\routes\youtube.ts` — function youtubeRouter: () => Router
- `server\services\board-utils.ts`
  - function autoSaveDatabases: () => void
  - function getBoardSnapshot: () => string
  - function ordinal: (n) => string
  - function leagueLabel: (key) => string
  - const canvas
- `server\services\briefing.ts` — function compileBriefing: (notion) => Promise<string>
- `server\services\gcal.ts` — function setPendingGCalAuth: (auth) => void, function getGCalClient: () => void
- `server\services\memory.ts`
  - function loadMemory: () => WalliMemory
  - function saveMemory: (mem) => void
  - function memoryToPrompt: (mem) => string
  - interface WalliMemory
- `server\services\notify.ts` — function loggedNotify: (title, body, opts) => void, const notifLog: NotifEntry[]
- `server\services\reminders.ts`
  - function loadReminders: () => Reminder[]
  - function saveReminders: (reminders) => void
  - interface Reminder
- `server\services\schema-cache.ts` — function getCachedSchema: (notion, databaseId) => void, function invalidateSchema: (databaseId) => void
- `server\services\spotify.ts`
  - function setPendingSpotifyAuth: (auth) => void
  - function getSpotifyAccessToken: () => Promise<string | null>
  - function spotifyControl: (method, endpoint, body?) => Promise<
  - const SPOTIFY_SCOPES
- `server\services\tokens.ts` — function loadTokens: () => Record<string, string> | null, function saveTokens: (tokens, string>) => void
- `server\services\tts-normalize.ts` — function normalizeTtsText: (raw) => string
- `server\services\voice-tools\registry.ts` — function executeVoiceTool: (name, input, any>, notion) => Promise<string>, const VOICE_TOOLS: Anthropic.Tool[]
- `server\ws.ts`
  - function getBoards: () => void
  - function getActiveBoardId: () => void
  - function getWidgets: () => void
  - function getCanvas: () => void
  - function broadcast: (msg) => void
  - function initWebSocket: (httpServer) => void
  - _...1 more_
- `src\components\pets\sprites.ts`
  - function getSpriteType: (agentId, icon, spriteType?) => keyof typeof SPRITES
  - type Frame
  - type Sprite
  - const PX
  - const SPRITES: Record<string, Sprite>
- `src\components\widgets\notion-view\utils.ts`
  - function getProp: (page, propName) => any
  - function formatDate: (dateStr, style) => string
  - function formatValue: (v) => string
- `src\hooks\useCanvasSocket.ts` — function useCanvasSocket: () => void
- `src\hooks\useGCal.ts`
  - function useGCalStatus: () => void
  - function startGCalAuth: (clientId, clientSecret, redirectUri) => Promise<string>
  - function useGCalCalendars: () => void
  - function useGCalEvents: (timeMin, timeMax, calendarId) => void
  - interface GCalStatus
  - interface GCalEvent
  - _...1 more_
- `src\hooks\useKioskRefresh.ts` — function useKioskRefresh: () => void
- `src\hooks\useLayout.ts`
  - function computeSlotRect: (slot, canvasW, canvasH, slotGap, slotPad) => SlotRect
  - function useLayout: () => void
  - interface SlotRect
  - const DEFAULT_SLOT_GAP
  - const DEFAULT_SLOT_PAD
  - const TOOLBAR_RESERVED
- `src\hooks\useNetworkStatus.ts` — function useNetworkStatus: () => void
- `src\hooks\useNotion.ts`
  - function useNotionHealth: () => void
  - function useNotionDatabases: () => void
  - function useNotionPages: (databaseId) => void
  - function useNotionView: (databaseId, opts?) => void
  - function useWeightLog: (databaseId) => void
  - function useUpdatePage: (databaseId) => void
  - _...4 more_
- `src\hooks\useSports.ts`
  - function useNFLScores: () => void
  - function useNBAScores: () => void
  - interface GameTeam
  - interface Game
- `src\hooks\useSpotify.ts`
  - function useSpotifyStatus: () => void
  - function useInvalidateSpotifyStatus: () => void
  - function startSpotifyAuth: (clientId, clientSecret, redirectUri) => Promise<string>
- `src\hooks\useVoice.ts`
  - function useVoice: () => VoiceStatus
  - interface VoiceStatus
  - type VoiceState
- `src\hooks\useWeather.ts`
  - function useWeather: (cfg) => void
  - interface WeatherData
  - interface WeatherConfig
- `src\layouts\presets.ts`
  - function getLayoutPreset: (id) => Layout
  - const DEFAULT_LAYOUT_ID
  - const LAYOUT_PRESETS: Layout[]
- `src\lib\db.ts`
  - function loadBoards: (userId) => Promise<Board[]>
  - function upsertBoard: (board, userId, ord) => Promise<void>
  - function deleteBoard: (boardId) => Promise<void>
  - function upsertWidget: (widget, boardId, userId) => Promise<void>
  - function deleteWidget: (widgetId) => Promise<void>
- `src\lib\sounds.ts`
  - function soundPanelOpen: () => void
  - function soundSwipe: () => void
  - function soundAlert: () => void
  - function soundClick: () => void
  - function soundWidgetRemoved: () => void
  - function soundWidgetDrop: () => void
  - _...6 more_
- `src\plugins\loader.ts` — function loadPluginDefs: () => StaticWidgetDef[]
- `src\themes\presets.ts`
  - function applyThemeVars: (vars) => void
  - interface ThemeVars
  - interface Theme
  - const VAR_LABELS: Partial<Record<keyof ThemeVars, string>>
  - const THEMES: Theme[]
  - const THEME_MAP
  - _...1 more_
- `src\ui\web\utils\cn.ts` — function cn: (...classes) => void

---

# Config

## Environment Variables

- `ANTHROPIC_API_KEY` (has default) — .env.example
- `BING_SEARCH_API_KEY` **required** — .env.example
- `BRAVE_SEARCH_API_KEY` **required** — server\services\voice-tools\web.ts
- `DEV` **required** — src\ui\web\Icon.tsx
- `ELEVENLABS_API_KEY` (has default) — .env.example
- `ELEVENLABS_VOICE_ID` **required** — server\routes\voice.ts
- `GOOGLE_CLIENT_ID` (has default) — .env
- `GOOGLE_CLIENT_SECRET` (has default) — .env
- `NOTION_API_KEY` (has default) — .env.example
- `NOTION_PARENT_PAGE_ID` **required** — server\routes\notion.ts
- `NTFY_SERVER` **required** — server\lib\notify.ts
- `NTFY_TOPIC` **required** — server\lib\notify.ts
- `PORT` (has default) — .env.example
- `SPOTIFY_CLIENT_ID` (has default) — .env
- `SPOTIFY_CLIENT_SECRET` (has default) — .env
- `VITE_ANTHROPIC_API_KEY` (has default) — .env
- `VITE_BING_SEARCH_API_KEY` **required** — server\services\voice-tools\web.ts
- `VITE_BRAVE_SEARCH_API_KEY` (has default) — .env
- `VITE_ELEVENLABS_API_KEY` (has default) — .env
- `VITE_ELEVENLABS_VOICE_ID` (has default) — .env
- `VITE_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (has default) — .env.example
- `VITE_PUBLIC_SUPABASE_URL` (has default) — .env.example
- `VITE_YOUTUBE_API_KEY` (has default) — .env
- `WHITEBOARD_URL` **required** — mcp\server.ts
- `YOUTUBE_API_KEY` (has default) — .env.example

## Config Files

- `.env.example`
- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`

## Key Dependencies

- @anthropic-ai/sdk: ^0.80.0
- @supabase/supabase-js: ^2.100.0
- better-sqlite3: ^12.8.0
- express: ^4.19.2
- react: ^18.3.1
- zod: ^3.25.76

---

# Middleware

## logging
- error — `server\middleware\error.ts`

## cors
- cors — `server\index.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src\ui\web\utils\cn.ts` — imported by **20** files
- `src\store\whiteboard.ts` — imported by **16** files
- `server\agents\types.ts` — imported by **11** files
- `server\ws.ts` — imported by **10** files
- `server\middleware\error.ts` — imported by **10** files
- `src\components\widgets\registry.tsx` — imported by **9** files
- `server\lib\logger.ts` — imported by **8** files
- `server\services\tokens.ts` — imported by **8** files
- `src\store\theme.ts` — imported by **8** files
- `src\lib\sounds.ts` — imported by **7** files
- `server\services\memory.ts` — imported by **6** files
- `server\services\voice-tools\_types.ts` — imported by **6** files
- `src\store\notifications.ts` — imported by **5** files
- `src\ui\layouts\Flex.tsx` — imported by **5** files
- `src\ui\web\Text.tsx` — imported by **5** files
- `server\services\db.ts` — imported by **4** files
- `server\services\notify.ts` — imported by **4** files
- `server\services\board-utils.ts` — imported by **4** files
- `src\constants\backgrounds.ts` — imported by **4** files
- `src\layouts\presets.ts` — imported by **4** files

## Import Map (who imports what)

- `src\ui\web\utils\cn.ts` ← `src\components\Pill.tsx`, `src\ui\layouts\Box.tsx`, `src\ui\layouts\Flex.tsx`, `src\ui\layouts\Grid.tsx`, `src\ui\layouts\ScrollArea.tsx` +15 more
- `src\store\whiteboard.ts` ← `src\components\AuthGuard.tsx`, `src\components\BoardMenu.tsx`, `src\components\BoardNav.tsx`, `src\components\BoardThumbnail.tsx`, `src\components\BottomToolbar.tsx` +11 more
- `server\agents\types.ts` ← `server\agents\built-in\calendarAgent.ts`, `server\agents\built-in\endOfDay.ts`, `server\agents\built-in\focusAgent.ts`, `server\agents\built-in\meetingCountdown.ts`, `server\agents\built-in\routineAgent.ts` +6 more
- `server\ws.ts` ← `server\crons\briefing.ts`, `server\crons\reminders.ts`, `server\crons\timers.ts`, `server\index.ts`, `server\index.ts` +5 more
- `server\middleware\error.ts` ← `server\index.ts`, `server\routes\agents.ts`, `server\routes\briefing.ts`, `server\routes\canvas.ts`, `server\routes\gcal.ts` +5 more
- `src\components\widgets\registry.tsx` ← `src\components\DatabasePicker.tsx`, `src\components\WidgetCanvas.tsx`, `src\components\widgets\ClockSettings.tsx`, `src\components\widgets\ClockWidget.tsx`, `src\components\widgets\TimersWidget.tsx` +4 more
- `server\lib\logger.ts` ← `server\agents\scheduler.ts`, `server\crons\briefing.ts`, `server\index.ts`, `server\lib\notify.ts`, `server\middleware\error.ts` +3 more
- `server\services\tokens.ts` ← `server\crons\briefing.ts`, `server\index.ts`, `server\routes\briefing.ts`, `server\routes\gcal.ts`, `server\routes\notion.ts` +3 more
- `src\store\theme.ts` ← `src\App.tsx`, `src\components\BackgroundPicker.tsx`, `src\components\BoardThumbnail.tsx`, `src\components\SettingsPanel.tsx`, `src\components\ThemePicker.tsx` +3 more
- `src\lib\sounds.ts` ← `src\components\BottomToolbar.tsx`, `src\components\NotificationToast.tsx`, `src\components\VoiceListener.tsx`, `src\components\Widget.tsx`, `src\components\WidgetCanvas.tsx` +2 more

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_