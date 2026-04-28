# Product Pillars

## 1. Walli — The Brain — Maturity: 5/10

**The core.** Walli is not a feature — he's the product. Everything else is infrastructure for him.

Walli's job: know Dylan, show up proactively, push toward goals without being annoying. He reads the board's state, knows the calendar, tracks habits, and builds a real mental model of the person over time.

### What's built
- Voice input pipeline (Web Speech API, "Hey Walli" wake word, silence timeout)
- TTS streaming via ElevenLabs (turbo model, MediaSource API)
- Claude Sonnet conversational agent with 40+ voice tools (Notion CRUD, board/widget control, timers, reminders, Spotify, web search, ESPN)
- Domain routing: classifies queries and routes to specialized agents (Apollo, Miles, Harvey, Alfred)
- 7 background agents on 10-15min intervals (task monitor, calendar warnings, focus agent, routine prompts, meeting countdown, end-of-day summary, stale task cleanup)
- AM briefing system (weather + calendar + tasks + sports via Claude synthesis)
- Dynamic agent framework: custom agents stored in Supabase, built at runtime
- Agent scheduler with 60-sec tick, status API, pet animations
- `walli_profile` table: preferred name, life focus, tendencies, motivation style, coaching style, check-in frequency, synthesized context
- `walli_observations` table: timestamped pattern logs (missed tasks, goal progress, interaction patterns)
- `buildWalliContext()`: assembles profile + observations + active goals + routine stats into a plain-English document injected into every Walli interaction

### What's half-built
- Context building exists but is not yet wired into Walli's actual system prompt — Walli doesn't know the user yet
- Observation logging infrastructure exists but nothing calls it yet (agents, voice tools, goal completions)
- Agent persistence in SQLite/Supabase but no frontend UI to create/manage agents
- Walli profile exists in DB but no onboarding flow to seed it
- External Walli microservices (Apollo/Miles/Harvey/Alfred) — only local Claude fallback works

### What's missing
- **Onboarding flow** — the wizard that seeds walli_profile on first run
- **Context injection** — wire `buildWalliContext()` into Walli's system prompt for every chat
- **Observation hooks** — call `logObservation()` when routines are skipped, goals logged, tasks completed
- **Synthesized context refresh** — periodic job that re-synthesizes observations into `synthesized_context`
- **Proactive nudges from Walli's model** — agents that act on the user model, not just schedules
- Adaptive interrupt priority (agents always speak, no priority queue)
- Offline fallback (fully cloud-dependent)
- Voice privacy controls

---

## 2. Board Core — Maturity: 7/10

**The canvas.** Walli decides what's on it. The board infrastructure needs to be solid enough that Walli can trust it.

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
- Sharing: `board_shares` table exists — but zero UI or logic implemented

### What's missing
- Screen scheduling (auto-switch boards by time of day — Walli should drive this)
- Display mode improvements (auto-cycling, motion-triggered wake, screen dimming)
- Photo wallpapers (Google Photos as board background)

---

## 3. Wiigits & Integrations — Maturity: 6/10

**The pieces Walli places on the board.** Breadth is decent; depth and quality are uneven.

### What's built
- 34 wiigit types across 28 component files
- Sports: 11 leagues x 3 variants (scores, standings, combined)
- Media: YouTube, Spotify, Google Photos slideshow, RSS/News
- Productivity: Calendar, Notion View, Database, Routines, Pomodoro, Timers, Note, Countdown, Goals
- Utility: Clock (3 variants), Weather, Quote, Website embed, Custom HTML, Split Container
- Special: Walli Agent, World Cup 2026
- Plugin SDK: `@whiteboard/sdk` with `registerPluginWidgets()` for third-party wiigits
- 8 configurable integrations on Connectors page
- 17 API routes, OAuth flows for Google + Spotify

### What's half-built
- Settings panels: 22 of 34 wiigits have them (65%)
- Error/loading states: inconsistent across wiigits
- Most integrations are read-only; only Notion has full CRUD

### What's missing
- Consistent error state UI across all wiigits
- Rate-limit handling in UI
- iCal feed support (Outlook + Apple calendars)

---

## 4. Mobile App (Walli Companion) — Maturity: 2/10

**The remote control and push channel.** Walli needs a mobile surface to reach you away from the board.

### What's built
- Expo SDK 54 + React Native 0.81 scaffolding
- Design tokens and architectural patterns defined
- API integration layer (`lib/api.ts`) pointing to Express backend
- Comprehensive objectives doc with 5 planned screens

### What's half-built
- Nothing — it's all planning docs

### What's missing (everything)
- Chat screen (Walli conversation on mobile)
- Board screen (switch boards, view/manage wiigits)
- Push notifications from Walli (nudges, reminders)
- Routine check-ins on mobile
- Goal logging from phone
- Widget quick-add

---

## 5. Onboarding — Maturity: 1/10

**How Walli learns who you are.** Currently nothing. This is the highest-priority gap.

Without onboarding, Walli is a generic assistant. With it, he starts knowing you from day one.

### What's built
- Supabase email/password auth via Auth UI component
- AuthGuard loads user data, initializes stores
- System boards auto-created on first login
- `walli_profile` schema in DB (waiting to be seeded)

### What's half-built
- Nothing — auth works but Walli doesn't meet you

### What's missing
- **Walli profile wizard** — preferred name, what you're working toward, your tendencies, how you want to be coached
- Guided connector setup ("let's connect your Google Calendar")
- First-board template picker
- OAuth providers (Google sign-in, magic links)

---

## Priority ranking (highest impact → lowest)

1. **Onboarding** (1/10) — Walli can't know you without it
2. **Walli context injection + observation hooks** (half-built) — connects the mental model to actual behavior
3. **Mobile App** (2/10) — Walli's mobile push channel
4. **Wiigits & Integrations** (6/10) — breadth gaps + quality inconsistency
5. **Board Core** (7/10) — solid, needs scheduling + display polish
