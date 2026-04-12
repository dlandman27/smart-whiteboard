# smart-whiteboard — AI Context Map

> **Stack:** express | none | react | typescript

> 85 routes + 2 ws | 7 models | 143 components | 53 lib files | 30 env vars | 9 middleware | 22% test coverage
> **Token savings:** this file is ~9,400 tokens. Without it, AI exploration would cost ~122,900 tokens. **Saves ~113,600 tokens per conversation.**

---

# Routes

## CRUD Resources

- **`/agents`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Agent
- **`/canvas/board`** POST | PATCH/:id | DELETE/:id → Board
- **`/canvas/widget`** POST | PATCH/:id | DELETE/:id → Widget
- **`/credentials`** POST | GET/:id | DELETE/:id → Credential
- **`/databases`** GET | GET/:id | DELETE/:id → Database

## Other Routes

- `GET` `*` [auth, ai]
- `GET` `/test` params() [auth] ✓
- `GET` `/health` params() [auth] ✓
- `GET` `/gcal/callback` params() [auth] ✓
- `GET` `/spotify/callback` params() [auth] ✓
- `GET` `/api/test` params() [auth] ✓
- `GET` `/api/health` params() [auth] ✓
- `GET` `/api/gcal/callback` params() [auth] ✓
- `GET` `/api/spotify/callback` params() [auth] ✓
- `GET` `/boom` params() [auth] ✓
- `GET` `/sync-boom` params() [auth] ✓
- `GET` `/ok` params() [auth] ✓
- `POST` `/agents/:id/run` params(id) [db]
- `GET` `/canvas/boards` params() [db]
- `POST` `/canvas/board/:id/activate` params(id) [db]
- `GET` `/briefing` params() [auth]
- `POST` `/briefing/settings` params() [auth]
- `GET` `/briefing/settings` params() [auth]
- `GET` `/canvas/widgets` params() [auth, db, ai]
- `POST` `/canvas/clear-widgets` params() [auth, db, ai]
- `POST` `/canvas/layout` params() [auth, db, ai]
- `POST` `/canvas/focus-widget` params() [auth, db, ai]
- `POST` `/canvas/theme` params() [auth, db, ai]
- `POST` `/canvas/custom-theme` params() [auth, db, ai]
- `POST` `/theme/generate` params() [auth, db, ai]
- `GET` `/gcal/status` params() [auth, db]
- `POST` `/gcal/connect` params() [auth, db]
- `POST` `/gcal/disconnect` params() [auth, db]
- `GET` `/gcal/calendars` params() [auth, db]
- `GET` `/gcal/events` params() [auth, db]
- `POST` `/gcal/events` params() [auth, db]
- `DELETE` `/gcal/events/:calendarId/:eventId` params(calendarId, eventId) [auth, db]
- `GET` `/gtasks/status` params() [auth, db]
- `GET` `/gtasks/lists` params() [auth, db]
- `GET` `/gtasks/tasks` params() [auth, db]
- `POST` `/gtasks/tasks` params() [auth, db]
- `PATCH` `/gtasks/tasks/:taskListId/:taskId` params(taskListId, taskId) [auth, db]
- `DELETE` `/gtasks/tasks/:taskListId/:taskId` params(taskListId, taskId) [auth, db]
- `GET` `/quote` params() [auth]
- `GET` `/notifications` params()
- `GET` `/timers` params()
- `GET` `/reminders` params()
- `POST` `/databases/:id/query` params(id) [auth, db, ai]
- `POST` `/databases/:id/pages` params(id) [auth, db, ai]
- `POST` `/databases/:id/smart-entry` params(id) [auth, db, ai]
- `PATCH` `/pages/:id` params(id) [auth, db, ai]
- `DELETE` `/pages/:id` params(id) [auth, db, ai]
- `GET` `/notion/workspace-page` params() [auth, db, ai]
- `POST` `/notion/workspace-page` params() [auth, db, ai]
- `POST` `/notion/databases` params() [auth, db, ai]
- `GET` `/pages/:id/blocks` params(id) [auth, db, ai]
- `PATCH` `/blocks/:id` params(id) [auth, db, ai]
- `POST` `/doc` params() [auth, db, ai]
- `GET` `/standings/:league` params(league)
- `GET` `/sports/:league` params(league)
- `GET` `/spotify/status` params() [auth, db]
- `POST` `/spotify/start-auth` params() [auth, db]
- `GET` `/spotify/now-playing` params() [auth, db]
- `POST` `/spotify/play` params() [auth, db]
- `POST` `/spotify/pause` params() [auth, db]
- `POST` `/spotify/next` params() [auth, db]
- `POST` `/spotify/previous` params() [auth, db]
- `POST` `/spotify/volume` params() [auth, db]
- `POST` `/voice` params() [auth, ai]
- `POST` `/tts` params() [auth, ai]
- `POST` `/walli/widget` params()
- `POST` `/walli/layout` params()
- `GET` `/walli/widgets` params()
- `GET` `/youtube/search` params()

## WebSocket Events

- `WS` `message` — `server/ws.ts`
- `WS` `close` — `server/ws.ts`

---

# Schema

### boards
- id: uuid (pk)
- user_id: uuid (fk)
- name: text (required)
- layout_id: text (required, fk)
- board_type: text
- or: null
  calendar_id   text
- slot_pad: integer (required)
- custom_slots: jsonb (required)
- background: jsonb (required)
- widget_style: text
- or: null
  ord           int (required)
- is_public: boolean (required)
- share_code: text (unique)

### widgets
- id: uuid (pk)
- board_id: uuid (fk)
- user_id: uuid (fk)
- type: text
- variant_id: text (fk)
- settings: jsonb (required)
- database_id: text (fk)
- database_title: text (required)
- calendar_id: text (fk)
- x: integer (required)
- y: integer (required)
- width: integer (required)
- height: integer (required)
- slot_id: text (fk)

### board_drawings
- board_id: uuid (pk, fk)
- user_id: uuid (fk)
- data_url: text

### user_theme
- user_id: uuid (pk, fk)
- active_theme_id: text (required, fk)
- custom_overrides: jsonb (required)
- custom_theme: jsonb
- background: jsonb (required)
- pets_enabled: boolean (required)

### user_credentials
- id: uuid (pk)
- user_id: uuid (fk)
- service: text (required)
- api_key: text
- client_secret: text

### oauth_tokens
- user_id: uuid (fk)
- service: text (required)
- access_token: text

### board_shares
- id: uuid (pk)
- board_id: uuid (fk)
- user_id: uuid (fk)
- role: text (required)
- admin: created_at  timestamptz (required)

---

# Components

- **Chip** — props: variant, iconLeft, disabled, onClick, className — `packages/ui-kit/src/Chip.tsx`
- **Container** — props: className — `packages/ui-kit/src/Container.tsx`
- **Divider** — props: orientation, className — `packages/ui-kit/src/Divider.tsx`
- **Icon** — props: icon, size, weight, className, style — `packages/ui-kit/src/Icon.tsx`
- **IconButton** — props: icon, variant, size, weight, filled, title, disabled, className, onClick, onMouseDown — `packages/ui-kit/src/IconButton.tsx`
- **MenuItem** — props: icon, iconBg, iconStyle, name, source, label, selected, disabled, onClick, onMouseEnter — `packages/ui-kit/src/MenuItem.tsx`
- **Panel** — props: onClose, width, maxHeight, className, style — `packages/ui-kit/src/Panel.tsx`
- **PanelHeader** — props: title, onClose, onBack, actions, className — `packages/ui-kit/src/PanelHeader.tsx`
- **SegmentedControl** — props: value, options, onChange, className — `packages/ui-kit/src/SegmentedControl.tsx`
- **SettingsSection** — props: label, className — `packages/ui-kit/src/SettingsSection.tsx`
- **Spacer** — props: size, px, horizontal — `packages/ui-kit/src/Spacer.tsx`
- **Stat** — props: label, value, unit, size, className, style — `packages/ui-kit/src/Stat.tsx`
- **Text** — props: variant, size, color, align, textTransform, numberOfLines, italic, as, className, style — `packages/ui-kit/src/Text.tsx`
- **WidgetSizeContext** — `packages/ui-kit/src/WidgetSizeContext.tsx`
- **Box** — props: flex1, fullHeight, fullWidth, noSelect, overflow, Tag, className, style, onClick — `packages/ui-kit/src/layouts/Box.tsx`
- **Center** — props: dir — `packages/ui-kit/src/layouts/Center.tsx`
- **Flex** — props: dir, align, justify, gap, wrap, flex1, fullHeight, fullWidth, noSelect, overflow — `packages/ui-kit/src/layouts/Flex.tsx`
- **FlexRow** — props: fullWidth — `packages/ui-kit/src/layouts/Flex.tsx`
- **FlexCol** — props: fullWidth, align — `packages/ui-kit/src/layouts/Flex.tsx`
- **Grid** — props: cols, gap, flex1, fullHeight, Tag, className, style — `packages/ui-kit/src/layouts/Grid.tsx`
- **ScrollArea** — props: axis, flex1, className, style — `packages/ui-kit/src/layouts/ScrollArea.tsx`
- **SpotifyWidget** — props: _widgetId — `plugins/spotify/SpotifyWidget.tsx`
- **App** — `src/App.tsx`
- **AuthGuard** — `src/components/AuthGuard.tsx`
- **BackgroundPicker** — props: background, onSelect — `src/components/BackgroundPicker.tsx`
- **BoardContextMenu** — props: x, y, canvasW, canvasH, onClose, onAddWidget, onChangeLayout, onBoardSettings, widgetCtx — `src/components/BoardContextMenu.tsx`
- **BoardMenu** — props: onClose, onSlide — `src/components/BoardMenu.tsx`
- **BoardNav** — props: onSlide — `src/components/BoardNav.tsx`
- **BoardSettingsPanel** — props: onClose — `src/components/BoardSettingsPanel.tsx`
- **BoardThumbnail** — props: board, width, height — `src/components/BoardThumbnail.tsx`
- **BottomToolbar** — props: onToolChange, onWidgetSelected, externalPickerOpen, onExternalPickerClose — `src/components/BottomToolbar.tsx`
- **CalendarBoardView** — `src/components/CalendarBoardView.tsx`
- **ConfigPanel** — props: onClose — `src/components/ConfigPanel.tsx`
- **ConnectorsBoardView** — `src/components/ConnectorsBoardView.tsx`
- **DatabasePicker** — props: onClose, onWidgetSelected — `src/components/DatabasePicker.tsx`
- **DrawingCanvas** — props: boardId, tool, color, strokeWidth, eraserSize — `src/components/DrawingCanvas.tsx`
- **KioskGuard** — `src/components/KioskGuard.tsx`
- **LayoutPicker** — props: onClose — `src/components/LayoutPicker.tsx`
- **LoginScreen** — `src/components/LoginScreen.tsx`
- **Logo** — props: size — `src/components/Logo.tsx`
- **LogoSettings** — props: showSettings, onCloseSettings — `src/components/LogoSettings.tsx`
- **NetworkStatusBanner** — `src/components/NetworkStatusBanner.tsx`
- **NotificationCenter** — props: onClose — `src/components/NotificationCenter.tsx`
- **NotificationCenterButton** — props: active, onClick — `src/components/NotificationCenter.tsx`
- **NotificationToast** — `src/components/NotificationToast.tsx`
- **PetBar** — `src/components/PetBar.tsx`
- **Pill** — props: className — `src/components/Pill.tsx`
- **SettingsBoardView** — `src/components/SettingsBoardView.tsx`
- **SettingsPanel** — props: onClose, defaultTab — `src/components/SettingsPanel.tsx`
- **ThemePicker** — `src/components/ThemePicker.tsx`
- **TodayBoardView** — `src/components/TodayBoardView.tsx`
- **TodoBoardView** — `src/components/TodoBoardView.tsx`
- **UndoToast** — `src/components/UndoToast.tsx`
- **VoiceListener** — `src/components/VoiceListener.tsx`
- **WalliChatButton** — `src/components/WalliChat.tsx`
- **Whiteboard** — `src/components/Whiteboard.tsx`
- **WhiteboardBackground** — props: background — `src/components/WhiteboardBackground.tsx`
- **Widget** — props: id, x, y, width, height, settingsContent, preferences, refSize, slotAssigned, onDoubleTap — `src/components/Widget.tsx`
- **WidgetCanvas** — props: activeTool, pendingWidget, onClearPending, onDoubleTap, onWidgetDoubleTap — `src/components/WidgetCanvas.tsx`
- **LayoutPicker** — props: onClose — `src/components/layout/LayoutPicker.tsx`
- **LayoutSlot** — props: x, y, width, height, mode, isHovered, onClick — `src/components/layout/LayoutSlot.tsx`
- **LayoutSlots** — props: pendingWidget, draggingWidgetId, hoveredSlotId, onSlotClick — `src/components/layout/LayoutSlots.tsx`
- **LayoutThumbnail** — props: layout, width, height, active — `src/components/layout/LayoutThumbnail.tsx`
- **PixelSprite** — props: sprite, frameIdx, flip — `src/components/pets/PixelSprite.tsx`
- **WalkingPet** — props: agent, mood, message, onMessageDone, onInspect, inspecting — `src/components/pets/WalkingPet.tsx`
- **CalendarWidget** — props: widgetId — `src/components/widgets/CalendarWidget.tsx`
- **VariantClockSettings** — props: widgetId — `src/components/widgets/ClockSettings.tsx`
- **ClockSettings** — props: widgetId — `src/components/widgets/ClockSettings.tsx`
- **AnalogClockWidget** — props: widgetId — `src/components/widgets/ClockWidget.tsx`
- **DigitalClockWidget** — props: widgetId — `src/components/widgets/ClockWidget.tsx`
- **ClockWidget** — props: widgetId — `src/components/widgets/ClockWidget.tsx`
- **CountdownSettings** — props: widgetId — `src/components/widgets/CountdownSettings.tsx`
- **CountdownWidget** — props: widgetId — `src/components/widgets/CountdownWidget.tsx`
- **DatabaseWidget** — props: widgetId — `src/components/widgets/DatabaseWidget.tsx`
- **HtmlWidget** — props: widgetId — `src/components/widgets/HtmlWidget.tsx`
- **NoteWidget** — props: widgetId — `src/components/widgets/NoteWidget.tsx`
- **PomodoroWidget** — props: widgetId — `src/components/widgets/PomodoroWidget.tsx`
- **PomodoroSettings** — props: widgetId — `src/components/widgets/PomodoroWidget.tsx`
- **QuoteSettings** — props: widgetId — `src/components/widgets/QuoteSettings.tsx`
- **QuoteWidget** — props: widgetId — `src/components/widgets/QuoteWidget.tsx`
- **RoutinesWidget** — props: widgetId — `src/components/widgets/RoutinesWidget.tsx`
- **RoutinesSettings** — props: widgetId — `src/components/widgets/RoutinesWidget.tsx`
- **SplitSettings** — props: widgetId — `src/components/widgets/SplitSettings.tsx`
- **SplitWidget** — props: widgetId — `src/components/widgets/SplitWidget.tsx`
- **NFLSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **NBASettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **NHLSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **MLBSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **EPLSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **LaLigaSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **UCLSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **BundesligaSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **SerieASettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **Ligue1Settings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **MLSSettings** — props: widgetId — `src/components/widgets/SportsSettings.tsx`
- **NFLWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NBAWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NHLWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **MLBWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NFLScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NBAScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NHLScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **MLBScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NFLStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NBAStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **NHLStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **MLBStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **EPLWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **EPLScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **EPLStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **LaLigaWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **LaLigaScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **LaLigaStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **UCLWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **UCLScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **UCLStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **BundesligaWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **BundesligaScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **BundesligaStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **SerieAWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **SerieAScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **SerieAStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **Ligue1Widget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **Ligue1ScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **Ligue1StandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **MLSWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **MLSScoresWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **MLSStandingsWidget** — props: widgetId — `src/components/widgets/SportsWidget.tsx`
- **SpotifyWidget** — props: widgetId — `src/components/widgets/SpotifyWidget.tsx`
- **SpotifySettings** — props: widgetId — `src/components/widgets/SpotifyWidget.tsx`
- **TimersWidget** — props: widgetId — `src/components/widgets/TimersWidget.tsx`
- **UrlWidget** — props: widgetId — `src/components/widgets/UrlWidget.tsx`
- **UrlSettings** — props: widgetId — `src/components/widgets/UrlWidget.tsx`
- **WalliAgentWidget** — props: widgetId — `src/components/widgets/WalliAgentWidget.tsx`
- **WalliAgentSettings** — props: widgetId — `src/components/widgets/WalliAgentWidget.tsx`
- **WeatherSettings** — props: widgetId — `src/components/widgets/WeatherSettings.tsx`
- **WeatherWidget** — props: widgetId — `src/components/widgets/WeatherWidget.tsx`
- **WorldcupWidget** — props: widgetId — `src/components/widgets/WorldcupWidget.tsx`
- **YouTubeWidget** — props: widgetId — `src/components/widgets/YouTubeWidget.tsx`
- **YouTubeSettings** — props: widgetId — `src/components/widgets/YouTubeWidget.tsx`
- **NotionViewSettingsPanel** — props: widgetId — `src/components/widgets/notion-view/NotionViewSettings.tsx`
- **NotionViewWidget** — props: widgetId — `src/components/widgets/notion-view/index.tsx`
- **BUILTIN_WIDGET_TYPES** — `src/components/widgets/registry.tsx`

---

# Libraries

- `mcp/server.ts`
  - function XxxWidget: ({...}) => void
  - function XxxSettings: ({...}) => void
  - interface XxxSettings
  - const XXX_DEFAULTS: XxxSettings
- `packages/ui-kit/src/useWidgetSize.ts` — function useWidgetSize: (ref) => WidgetSize, interface WidgetSize
- `packages/ui-kit/src/utils/cn.ts` — function cn: (...classes) => void
- `packages/ui-kit/src/widgetTokens.ts`
  - function getBreakpoint: (containerWidth) => WidgetBreakpoint
  - interface WidgetConstraints
  - interface WidgetShape
  - type WidgetBreakpoint
  - const widgetBreakpoints
  - const widgetSizing
  - _...1 more_
- `plugins/spotify/hooks.ts`
  - function useSpotifyStatus: () => void
  - function useSpotifyNowPlaying: (enabled) => void
  - function startSpotifyAuth: (clientId, clientSecret, redirectUri) => Promise<string>
  - interface NowPlayingTrack
- `server/agents/dynamic-runner.ts`
  - function readUserAgents: () => UserAgentDef[]
  - function addUserAgent: (def, 'createdAt'>) => UserAgentDef
  - function removeUserAgent: (id) => void
  - function updateUserAgent: (id, patch) => UserAgentDef
  - function buildDynamicAgent: (def) => Agent
  - function loadDynamicAgents: () => Agent[]
  - _...1 more_
- `server/agents/index.ts` — function createScheduler: (ctx) => AgentScheduler
- `server/agents/scheduler.ts` — class AgentScheduler
- `server/crons/briefing.ts` — function startBriefingCron: (notion) => void
- `server/crons/index.ts` — function startAllCrons: (notion) => void
- `server/crons/reminders.ts` — function startReminderCron: () => void
- `server/crons/timers.ts` — function startTimerCron: () => void
- `server/lib/crypto.ts` — function encrypt: (plaintext) => string, function decrypt: (encoded) => string
- `server/lib/logger.ts`
  - function log
  - function warn
  - function error
- `server/lib/notify.ts` — function notify: (title, body, opts) => Promise<void>
- `server/middleware/auth.ts` — function requireAuth: (req, res, next) => void
- `server/middleware/error.ts`
  - function asyncRoute: (fn, res, next) => void
  - function errorMiddleware: (err, _req, res, _next) => void
  - class AppError
- `server/services/board-utils.ts`
  - function autoSaveDatabases: () => void
  - function getBoardSnapshot: () => string
  - function ordinal: (n) => string
  - function leagueLabel: (key) => string
  - const canvas
- `server/services/briefing.ts` — function compileBriefing: (notion) => Promise<string>
- `server/services/credentials.ts`
  - function loadOAuthTokens: (userId, service) => Promise<OAuthTokens | null>
  - function saveOAuthTokens: (userId, service, tokens) => Promise<void>
  - function deleteOAuthTokens: (userId, service) => Promise<void>
  - function loadCredential: (userId, service) => Promise<Credential | null>
  - function saveCredential: (userId, service, cred) => Promise<void>
  - function deleteCredential: (userId, service) => Promise<void>
  - _...2 more_
- `server/services/gcal.ts` — function getGCalOAuth2Client: () => void, function getGCalClient: (userId) => void
- `server/services/memory.ts`
  - function loadMemory: () => WalliMemory
  - function saveMemory: (mem) => void
  - function memoryToPrompt: (mem) => string
  - interface WalliMemory
- `server/services/notify.ts` — function loggedNotify: (title, body, opts) => void, const notifLog: NotifEntry[]
- `server/services/reminders.ts`
  - function loadReminders: () => Reminder[]
  - function saveReminders: (reminders) => void
  - interface Reminder
- `server/services/schema-cache.ts` — function getCachedSchema: (notion, databaseId) => void, function invalidateSchema: (databaseId) => void
- `server/services/spotify.ts`
  - function getSpotifyAccessToken: (userId) => Promise<string | null>
  - function spotifyControl: (userId, method, endpoint, body?) => Promise<
  - const SPOTIFY_SCOPES
  - const pendingSpotifyAuths
- `server/services/tokens.ts`
  - function loadTokens: () => Record<string, string> | null
  - function saveTokens: (tokens, string>) => void
  - function deleteTokens: (keys) => void
- `server/services/tts-normalize.ts` — function normalizeTtsText: (raw) => string
- `server/services/voice-tools/registry.ts` — function executeVoiceTool: (name, input, any>, notion) => Promise<string>, const VOICE_TOOLS: Anthropic.Tool[]
- `server/ws.ts`
  - function getBoards: () => void
  - function getActiveBoardId: () => void
  - function getWidgets: () => void
  - function getCanvas: () => void
  - function broadcast: (msg) => void
  - function initWebSocket: (httpServer) => void
  - _...1 more_
- `src/hooks/useCanvasSocket.ts` — function useCanvasSocket: () => void
- `src/hooks/useGCal.ts`
  - function useGCalStatus: () => void
  - function startGCalAuth: () => Promise<string>
  - function disconnectGCal: () => Promise<void>
  - function useGCalCalendars: () => void
  - function useGCalEvents: (timeMin, timeMax, calendarId) => void
  - function useAllCalendarEvents: (timeMin, timeMax, calendarIds) => void
  - _...5 more_
- `src/hooks/useKioskRefresh.ts` — function useKioskRefresh: () => void
- `src/hooks/useLayout.ts`
  - function computeSlotRect: (slot, canvasW, canvasH, slotGap, slotPad) => SlotRect
  - function useLayout: () => void
  - interface SlotRect
  - const DEFAULT_SLOT_GAP
  - const DEFAULT_SLOT_PAD
  - const TOOLBAR_RESERVED
- `src/hooks/useNetworkStatus.ts` — function useNetworkStatus: () => void
- `src/hooks/useNotion.ts`
  - function useNotionHealth: () => void
  - function useNotionDatabases: () => void
  - function useNotionPages: (databaseId) => void
  - function useNotionView: (databaseId, opts?) => void
  - function useWeightLog: (databaseId) => void
  - function useUpdatePage: (databaseId) => void
  - _...4 more_
- `src/hooks/useSports.ts`
  - function useScores: (league) => void
  - function useStandings: (league) => void
  - function useNFLScores: () => void
  - function useNBAScores: () => void
  - interface GameTeam
  - interface Game
  - _...4 more_
- `src/hooks/useSpotify.ts`
  - function useSpotifyStatus: () => void
  - function useInvalidateSpotifyStatus: () => void
  - function startSpotifyAuth: (clientId, clientSecret, redirectUri) => Promise<string>
- `src/hooks/useTasks.ts`
  - function useTasksStatus: () => void
  - function useTaskLists: () => void
  - function useTasksForList: (taskListId, showCompleted) => void
  - function useAllTasks: (taskListIds, showCompleted) => void
  - function createTask: (taskListId, task) => Promise<GTask>
  - function updateTask: (taskListId, taskId, updates, 'title' | 'notes' | 'due' | 'status'>>) => Promise<GTask>
  - _...5 more_
- `src/hooks/useVoice.ts`
  - function useVoice: () => VoiceStatus
  - interface VoiceStatus
  - type VoiceState
- `src/hooks/useWeather.ts`
  - function useWeather: (cfg) => void
  - interface WeatherData
  - interface WeatherConfig
- `src/layouts/presets.ts`
  - function getLayoutPreset: (id) => Layout
  - const DEFAULT_LAYOUT_ID
  - const LAYOUT_PRESETS: Layout[]
- `src/lib/apiFetch.ts` — function apiFetch: (path, options?) => Promise<T>
- `src/lib/db.ts`
  - function loadBoards: (userId) => Promise<Board[]>
  - function upsertBoard: (board, userId, ord) => Promise<void>
  - function deleteBoard: (boardId) => Promise<void>
  - function upsertWidget: (widget, boardId, userId) => Promise<void>
  - function deleteWidget: (widgetId) => Promise<void>
  - function loadTheme: (userId) => Promise<ThemeRow | null>
  - _...4 more_
- `src/lib/realtimeSync.ts`
  - function touchId: (id) => void
  - function startRealtimeSync: (userId) => void
  - function stopRealtimeSync: () => void
- `src/lib/sounds.ts`
  - function soundPanelOpen: () => void
  - function soundSwipe: () => void
  - function soundAlert: () => void
  - function soundClick: () => void
  - function soundWidgetRemoved: () => void
  - function soundWidgetDrop: () => void
  - _...6 more_
- `src/lib/syncBoards.ts` — function startBoardSync: (userId) => void, function stopBoardSync: () => void
- `src/lib/syncTheme.ts` — function startThemeSync: (userId) => void, function stopThemeSync: () => void
- `src/plugins/loader.ts` — function loadPluginDefs: () => StaticWidgetDef[]
- `src/store/whiteboard.ts`
  - function ensureSystemBoards: (boards) => Board[]
  - interface Board
  - type WidgetStyle
  - const DEFAULT_SETTINGS_ID
  - const DEFAULT_CONNECTORS_ID
  - const DEFAULT_TODAY_ID
  - _...2 more_
- `src/themes/presets.ts`
  - function applyThemeVars: (vars) => void
  - interface ThemeVars
  - interface Theme
  - const VAR_LABELS: Partial<Record<keyof ThemeVars, string>>
  - const THEMES: Theme[]
  - const THEME_MAP
  - _...1 more_
- `src/themes/scale.ts`
  - function generateScale: (hue, saturation) => ShadeScale
  - function complementary: (hue) => number
  - function analogous: (hue) => [number, number]
  - function buildThemeVars: (input) => ThemeVars
  - interface ScaleThemeInput
  - type ShadeStep
  - _...1 more_
- `vite-plugins/ui-kit-enforce.ts` — function uiKitEnforce: () => Plugin

---

# Config

## Environment Variables

- `ANTHROPIC_API_KEY` (has default) — .env.example
- `BING_API_KEY` **required** — server/routes/notion.ts
- `BING_SEARCH_API_KEY` **required** — .env.example
- `BRAVE_SEARCH_API_KEY` **required** — server/services/voice-tools/web.ts
- `DB_PATH` **required** — server/services/db.ts
- `DEV` **required** — packages/ui-kit/src/Icon.tsx
- `ELEVENLABS_API_KEY` (has default) — .env.example
- `ELEVENLABS_VOICE_ID` **required** — server/routes/voice.ts
- `ENCRYPTION_KEY` (has default) — .env.example
- `GOOGLE_CLIENT_ID` (has default) — .env.example
- `GOOGLE_CLIENT_SECRET` (has default) — .env.example
- `GOOGLE_REDIRECT_URI` (has default) — .env.example
- `NODE_ENV` **required** — server/index.ts
- `NOTION_API_KEY` (has default) — .env.example
- `NOTION_PARENT_PAGE_ID` **required** — server/routes/notion.ts
- `NTFY_SERVER` **required** — server/lib/notify.ts
- `NTFY_TOPIC` **required** — server/lib/notify.ts
- `PORT` (has default) — .env.example
- `SUPABASE_SERVICE_ROLE_KEY` (has default) — .env.example
- `SUPABASE_URL` (has default) — .env.example
- `VITE_ANTHROPIC_API_KEY` **required** — server/routes/canvas.ts
- `VITE_BING_SEARCH_API_KEY` **required** — server/services/voice-tools/web.ts
- `VITE_BRAVE_SEARCH_API_KEY` **required** — server/services/voice-tools/web.ts
- `VITE_ELEVENLABS_API_KEY` **required** — server/routes/voice.ts
- `VITE_ELEVENLABS_VOICE_ID` **required** — server/routes/voice.ts
- `VITE_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (has default) — .env.example
- `VITE_PUBLIC_SUPABASE_URL` (has default) — .env.example
- `WALLI_API_URL` **required** — server/routes/voice.ts
- `WHITEBOARD_URL` **required** — mcp/server.ts
- `YOUTUBE_API_KEY` (has default) — .env.example

## Config Files

- `.env.example`
- `railway.json`
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

## auth
- auth-pipeline.test — `server/integration/auth-pipeline.test.ts`
- auth.test — `server/middleware/auth.test.ts`
- auth — `server/middleware/auth.ts`
- requireAuth — `server/index.ts`

## error-handler
- error.test — `server/middleware/error.test.ts`
- errorMiddleware — `server/index.ts`

## logging
- error — `server/middleware/error.ts`

## cors
- cors — `server/index.ts`

## rate-limit
- rateLimit — `server/index.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src/store/whiteboard.ts` — imported by **26** files
- `packages/ui-kit/src/utils/cn.ts` — imported by **20** files
- `server/middleware/error.ts` — imported by **14** files
- `src/types/index.ts` — imported by **14** files
- `src/components/widgets/registry.tsx` — imported by **14** files
- `src/store/theme.ts` — imported by **12** files
- `server/agents/types.ts` — imported by **11** files
- `server/ws.ts` — imported by **11** files
- `src/lib/supabase.ts` — imported by **10** files
- `server/lib/logger.ts` — imported by **8** files
- `server/services/credentials.ts` — imported by **8** files
- `packages/ui-kit/src/layouts/Flex.tsx` — imported by **7** files
- `server/lib/supabase.ts` — imported by **7** files
- `src/constants/backgrounds.ts` — imported by **7** files
- `src/lib/sounds.ts` — imported by **7** files
- `server/services/memory.ts` — imported by **6** files
- `server/lib/crypto.ts` — imported by **6** files
- `server/services/voice-tools/_types.ts` — imported by **6** files
- `src/store/notifications.ts` — imported by **6** files
- `src/store/ui.ts` — imported by **6** files

## Import Map (who imports what)

- `src/store/whiteboard.ts` ← `src/components/AuthGuard.tsx`, `src/components/BoardContextMenu.tsx`, `src/components/BoardMenu.tsx`, `src/components/BoardNav.tsx`, `src/components/BoardSettingsPanel.tsx` +21 more
- `packages/ui-kit/src/utils/cn.ts` ← `packages/ui-kit/src/Button.tsx`, `packages/ui-kit/src/Card.tsx`, `packages/ui-kit/src/Checkbox.tsx`, `packages/ui-kit/src/Chip.tsx`, `packages/ui-kit/src/Container.tsx` +15 more
- `server/middleware/error.ts` ← `server/index.ts`, `server/middleware/error.test.ts`, `server/routes/agents.ts`, `server/routes/briefing.ts`, `server/routes/canvas.ts` +9 more
- `src/types/index.ts` ← `src/components/BottomToolbar.tsx`, `src/components/DatabasePicker.tsx`, `src/components/LayoutPicker.tsx`, `src/components/LayoutPicker.tsx`, `src/components/Whiteboard.tsx` +9 more
- `src/components/widgets/registry.tsx` ← `src/components/DatabasePicker.tsx`, `src/components/LayoutPicker.tsx`, `src/components/WidgetCanvas.tsx`, `src/components/widgets/ClockSettings.tsx`, `src/components/widgets/ClockWidget.tsx` +9 more
- `src/store/theme.ts` ← `src/App.tsx`, `src/components/AuthGuard.tsx`, `src/components/BoardSettingsPanel.tsx`, `src/components/BoardThumbnail.tsx`, `src/components/SettingsBoardView.tsx` +7 more
- `server/agents/types.ts` ← `server/agents/built-in/calendarAgent.ts`, `server/agents/built-in/endOfDay.ts`, `server/agents/built-in/focusAgent.ts`, `server/agents/built-in/meetingCountdown.ts`, `server/agents/built-in/routineAgent.ts` +6 more
- `server/ws.ts` ← `server/crons/briefing.ts`, `server/crons/reminders.ts`, `server/crons/timers.ts`, `server/index.ts`, `server/index.ts` +6 more
- `src/lib/supabase.ts` ← `src/components/AuthGuard.tsx`, `src/components/LoginScreen.tsx`, `src/components/SettingsBoardView.tsx`, `src/hooks/useCanvasSocket.ts`, `src/lib/apiFetch.test.ts` +5 more
- `server/lib/logger.ts` ← `server/agents/scheduler.ts`, `server/crons/briefing.ts`, `server/index.ts`, `server/lib/notify.ts`, `server/middleware/error.ts` +3 more

---

# Test Coverage

> **22%** of routes and models are covered by tests
> 14 test files found

## Covered Routes

- GET:/test
- GET:/health
- GET:/gcal/callback
- GET:/spotify/callback
- GET:/api/test
- GET:/api/health
- GET:/api/gcal/callback
- GET:/api/spotify/callback
- GET:/boom
- GET:/sync-boom
- GET:/ok
- GET:/credentials/:service
- POST:/credentials/:service
- DELETE:/credentials/:service

## Covered Models

- boards
- widgets
- board_drawings
- user_theme
- user_credentials
- oauth_tokens

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_