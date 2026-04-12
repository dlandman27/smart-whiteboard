# Product Pillars

## 1. AI / Voice (Walli) — Maturity: 7/10

**The moat.** Nobody else in the smart display space has a conversational AI layer.

### What's built
- Voice input pipeline (Web Speech API, "Hey Walli" wake word, silence timeout)
- TTS streaming via ElevenLabs (turbo model, MediaSource API)
- Claude Haiku conversational agent with 40+ voice tools (Notion CRUD, board/widget control, timers, reminders, Spotify, web search, ESPN)
- Domain routing: classifies queries and routes to specialized agents (Apollo, Miles, Harvey, Alfred)
- 7 background agents on 10-15min intervals (task monitor, calendar warnings, focus agent, routine prompts, meeting countdown, end-of-day summary, stale task cleanup)
- AM briefing system (weather + calendar + tasks + sports via Claude synthesis)
- Dynamic agent framework: users create custom agents via natural language
- Agent scheduler with 60-sec tick, status API, pet animations

### What's half-built
- External Walli microservices (Apollo/Miles/Harvey/Alfred) — only local Claude fallback works
- Agent persistence in SQLite but no frontend UI to create/manage agents
- Conversation memory: 6-turn local history, no semantic search or long-term recall
- Voice tool auth gaps (assumes OAuth already done)

### What's missing
- Smart proactive suggestions ("you have a meeting in 30 min" without asking)
- Intent chaining / multi-step workflows
- Adaptive interrupt priority (agents always speak, no priority queue)
- Offline fallback (fully cloud-dependent)
- Voice privacy controls
- Agent state sync to persistent DB (lost on restart)

---

## 2. Board Core — Maturity: 7/10

**The foundation.** Layout, multi-board, themes are solid. Templates and scheduling are the gaps.

### What's built
- Layout engine: 16+ presets (freeform, grids, sidebar, mosaic, etc.), fractional positioning, custom AI layouts
- Drag/resize: full mouse/touch support, slot snapping, occupant swap logic
- Multi-board: unlimited boards, reorderable, 5 auto-created system boards
- Display mode: fullscreen, hides chrome, board tabs in overlay, Ctrl+Shift+D
- Themes: 23 presets (10 light, 13 dark), fully customizable CSS vars, per-board overrides
- Backgrounds: 28 presets (dots, lines, grid, solid, gradient, image), per-board settings
- Supabase schema: complete with boards, widgets, drawings, shares tables

### What's half-built
- Board templates: system boards have special renderers but no "new board from template" for users
- Sharing: `board_shares` table exists with viewer/editor/admin roles, `is_public` + `share_code` fields on boards — but zero UI or logic implemented

### What's missing
- Screen scheduling (auto-switch boards by time of day)
- User-facing board templates ("Family Hub", "Home Office", "Kitchen Display")
- Multi-user collaboration (real-time presence, cursors, live sync)
- Photo wallpapers (Google Photos as board background, not just a widget)
- Display mode improvements (auto-cycling, motion-triggered wake, screen dimming)

---

## 3. Widgets & Integrations — Maturity: 6/10

**Breadth is good, depth is uneven.** 34 widgets, but quality and category coverage have gaps.

### What's built
- 34 widget types across 28 component files
- Sports: 11 leagues x 3 variants (scores, standings, combined)
- Media: YouTube, Spotify, Google Photos slideshow, RSS/News
- Productivity: Calendar, Notion View, Database, Routines, Pomodoro, Timers, Note, Countdown
- Utility: Clock (3 variants), Weather, Quote, Website embed, Custom HTML, Split Container
- Special: Walli Agent, World Cup 2026
- Plugin SDK: `@whiteboard/sdk` with `registerPluginWidgets()` for third-party widgets
- 8 configurable integrations on Connectors page
- 17 API routes, OAuth flows for Google + Spotify

### What's half-built
- Settings panels: 22 of 34 widgets have them (65%)
- Error/loading states: inconsistent — Weather and RSS are solid, Calendar and Database are weak
- Most integrations are read-only; only Notion has full CRUD

### What's missing
- **Stocks/crypto widget** — high demand, no implementation
- **Traffic/commute widget** — Google Maps integration
- **Smart home widget** — Home Assistant integration
- **Social media widgets** — Twitter/LinkedIn feeds
- **iCal feed support** — covers Outlook + Apple calendars
- **Todoist / other task managers**
- Consistent error state UI across all widgets
- Rate-limit handling in UI
- OAuth scope granularity (all-or-nothing currently)

---

## 4. Mobile App (Walli Companion) — Maturity: 2/10

**Planned but barely started.** Architecture is defined, code is not.

### What's built
- Expo SDK 54 + React Native 0.81 scaffolding
- Design tokens and architectural patterns defined
- API integration layer (`lib/api.ts`) pointing to Express backend
- Comprehensive objectives doc with 5 planned screens

### What's half-built
- Nothing — it's all planning docs and agent specs

### What's missing (everything)
- Chat screen (Walli voice interaction on mobile)
- Board screen (switch boards, view/manage widgets)
- Themes screen (apply presets, AI theme generation)
- Agents screen (list/enable/disable/create agents)
- Settings screen (server URL, connection status)
- Push notifications
- Widget quick-add from phone
- Layout switcher
- Per-widget settings editor

---

## 5. Onboarding & Auth — Maturity: 3/10

**Functional but bare.** Users can sign in and that's about it.

### What's built
- Supabase email/password auth via Auth UI component
- AuthGuard loads user data, initializes stores, starts syncing
- Settings page: theme picker, background, pets toggle, briefing time, sign out
- System boards auto-created on first login

### What's half-built
- Nothing — what exists works, there's just not much of it

### What's missing
- OAuth providers (Google, GitHub, magic links)
- Onboarding wizard after signup
- Template picker for first board
- Guided connector setup ("connect your Google account to see your calendar")
- Billing / subscription / payment system
- User profile / account management
- Email verification flow
- First-run widget suggestions

---

## Priority ranking (most work needed → least)

1. **Mobile App** (2/10) — basically doesn't exist yet
2. **Onboarding & Auth** (3/10) — functional but no retention hooks
3. **Widgets & Integrations** (6/10) — breadth gaps + quality inconsistency
4. **Board Core** (7/10) — solid foundation, needs templates + scheduling + sharing
5. **AI / Voice** (7/10) — strongest pillar, needs polish not features
