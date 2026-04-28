# Roadmap

## What we're building toward

A personal life OS. Walli knows Dylan. The board is Walli's canvas. The whole system gets smarter over time.

The roadmap is milestone-driven, not feature-driven. Each milestone makes Walli meaningfully more useful.

---

## Milestone 1 — Walli Knows You (current priority)

Walli currently has no model of the user. Every conversation starts from zero. This milestone makes him actually know who he's talking to.

**What ships:**
- [ ] Onboarding wizard — seeds `walli_profile` (name, life focus, tendencies, motivation style, coaching style)
- [ ] `buildWalliContext()` wired into Walli's system prompt — he reads it before every interaction
- [ ] Observation hooks — `logObservation()` called when routines are skipped, goals are logged, tasks completed
- [ ] Synthesized context refresh — background job that periodically re-synthesizes observations into `synthesized_context`

**Success state:** After 1 week, Walli can make a comment about a pattern he's noticed. After 1 month, he references your tendencies without being told.

---

## Milestone 2 — Walli Runs the Morning

The daily loop from VISION.md: wake up, Walli greets you, surfaces today's context.

**What ships:**
- [ ] Morning greeting — Walli speaks at your configured briefing time, addresses you by name, references your goals and what's on the calendar
- [ ] Board curation on morning trigger — Walli (or an agent) places the right wiigits for the time of day
- [ ] Routine nudges informed by history — "you usually skip evening routines, let's try something different"
- [ ] Evening reflection — Walli notes what was skipped, sets up tomorrow

**Success state:** You walk up to the board in the morning and it shows exactly what you need without touching anything.

---

## Milestone 3 — Walli Has Opinions

Walli stops just responding and starts proactively surfacing things.

**What ships:**
- [ ] Pattern-triggered nudges — if you haven't logged a goal in 5 days, Walli mentions it
- [ ] Goal momentum — Walli surfaces struggling goals, not just all goals
- [ ] Streak awareness — "you're on a 12-day streak for this routine, don't break it today"
- [ ] Adaptive interrupt priority — Walli learns when you want to be interrupted and when not to

**Success state:** Walli says something unprompted that makes you think "how did he know?"

---

## Milestone 4 — Mobile: Walli in Your Pocket

The board is great for ambient display. But Walli needs to reach you away from the wall.

**What ships:**
- [ ] Walli chat on mobile — same conversational AI, same context, on your phone
- [ ] Push notifications from agents (nudges, reminders, celebrations)
- [ ] Routine check-ins on mobile
- [ ] Goal logging from phone

**Success state:** You log a run from your phone, Walli sees it on the board, and celebrates it when you walk by.

---

## Milestone 5 — Board Polish

The board should be beautiful. Walli curates it; it should look like he has good taste.

**What ships:**
- [ ] Screen scheduling — boards auto-switch by time of day (morning board, work board, evening board)
- [ ] Motion-triggered wake — screen dims when idle, wakes on presence
- [ ] Wiigit quality sweep — consistent loading/error states, settings panels for all 34 types
- [ ] Walli-driven layout changes — Walli can rearrange the board based on what's relevant

---

## Tech Stack

| Layer | Current |
|---|---|
| Frontend | React 18 + Vite + Zustand + TanStack Query + Tailwind |
| Backend | Express + TypeScript on Railway |
| Database | Supabase (Postgres) — all persistence |
| Auth | Supabase JWT; `DEV_USER_ID` bypasses in dev |
| Realtime | WebSocket (ws) for board updates |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| TTS | ElevenLabs streaming |
| STT | Deepgram |
| Mobile | Expo / React Native |

---

## Key Decisions

- **Personal, not SaaS.** This is built for one person. Every decision optimizes for depth over breadth.
- **Walli curates the board.** Users don't configure layouts — Walli does. They can always override.
- **The board is the output.** Walli's intelligence shows up as the right thing being on the board at the right time.
- **Chrome kiosk is the display.** `npm run start:kiosk` opens it. Electron is optional later.
- **Mobile is a companion.** Reach channel and input surface — not a standalone product.
