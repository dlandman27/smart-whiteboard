# Competitor Analysis: Skylight Calendar

> Written April 2026. Based on Skylight Calendar 2 (launched CES 2026) and the 15" / Max models.

---

## 1. What Skylight Calendar Is

Skylight is a **dedicated wall-mounted smart display for family organization**. You buy a physical touchscreen device (10", 15", or 27"), mount it in the kitchen or hallway, and it becomes the household scheduling hub. It runs a curated, locked-down OS — you can't install apps on it, customize the layout, or extend it. Its entire UX is designed around one job: keeping a busy family in sync.

**Pricing:**
| Model | Device | Plus subscription |
|---|---|---|
| 10" Calendar | $149 | $39/yr |
| 15" Calendar | $280 | $39/yr |
| 27" Calendar Max | $600 | $79/yr |

The free tier is genuinely limited. Photos, Magic Import, and Meal Planning are all Plus-gated.

---

## 2. What Skylight Does Well

### 2.1 Calendar is a two-way surface — not a read-only display

This is Skylight's most important UX insight: **the wall screen is an input device, not just an output device.**

- Tap the `+` button → event creation dialog opens inline
- **Tap-and-hold on an empty time slot** → dialog pre-fills with that time
- Pinch to zoom the schedule view time scale
- Swipe left/right to navigate dates
- Changes made on-screen sync back to Google Calendar / iCal bidirectionally

**Your app today:** `CalendarWidget.tsx` is entirely read-only. It pulls from Google Calendar and renders it beautifully (day/week/month, color-coded, scroll), but there is no way to tap an empty slot and create an event. The board is an output surface only.

---

### 2.2 Magic Import — AI-powered event ingestion

This is their flagship Plus feature and it's genuinely clever:

- Forward a **confirmation email** to a special address → Skylight parses it and creates the event automatically
- Take a **photo of a paper schedule, flyer, or PDF** → OCR + AI extracts title, date, time, people
- **Speak into the microphone** → voice-to-event
- **Upload a screenshot** of anything → event is created

The result: users almost never need to manually type in an event. Everything flows in through the medium it arrived in.

**Your app today:** You have a `VoiceListener` component and Walli as an AI orchestrator, but there is no equivalent "ingest this thing into my calendar" flow. You have the architecture to do this better than Skylight — Walli could accept voice, a photo drop, or a pasted email — but the feature doesn't exist yet.

---

### 2.3 Family profiles with color-coded ownership

Every event, chore, and meal is assigned to a **Profile** (a family member). Profiles have colors. The calendar view shows whose event is whose at a glance. When creating any item you pick a profile from a dropdown.

This gives the board an immediate visual answer to "whose day is the busiest?" and "who owns this task?"

**Your app today:** You have Google Calendar's native colorId system rendering in the calendar widget, but there's no concept of a person or profile. Everything is calendar-level, not person-level. If two people share one calendar, you can't distinguish them.

---

### 2.4 Chore Chart with gamification

The chore chart sits in the Tasks tab. Setup is:
- Name the chore, pick a Profile, set recurrence (daily/weekly/monthly/custom)
- Emojis are first-class so pre-reading kids can use it
- Completing a chore triggers a **confetti/emoji explosion** celebration

It's not a plain checklist. The celebration mechanic is small but drives real engagement with kids.

**Your app today:** `RoutinesWidget.tsx` is a checklist. It has no assignment, no recurrence logic exposed in a friendly UI, and no celebration feedback on completion. It covers the same ground but with less UX polish and no gamification hook.

---

### 2.5 Meal planning as a first-class feature

Skylight has a dedicated Meals tab:
- Week grid view: tap a day, pick a meal slot (breakfast/lunch/dinner/snack)
- Pre-loaded meal library + add your own recipes
- Meals appear on the main calendar alongside events so the whole board makes sense together

**Your app today:** No meal planning exists. You'd need a widget for this.

---

### 2.6 On-screen reminders with audio

When an event is approaching:
- A **popup overlay** appears on the display showing up to 3 upcoming events
- An optional **audio chime** fires at the same time
- Configurable per-calendar or per-event with custom lead times (X minutes before, at time of event)

The device is passively visible all day, so these reminders work even if nobody is looking at a phone.

**Your app today:** `TimersWidget.tsx` handles manual timers/alarms, but there's no system that watches Google Calendar events and fires ambient on-screen alerts when something is 15 minutes out. The board doesn't proactively interrupt you.

---

### 2.7 Frictionless 10-minute onboarding

From box to working display in ~10 minutes:
1. Plug in, connect to WiFi via guided app flow
2. Connect Google/iCal/Outlook account
3. Done — events appear immediately

No coding, no configuration, no accounts to set up beyond calendar sync. Every reviewer calls it out as a strength.

**Your app today:** Setup requires technical knowledge — running a Node server, setting env vars (`NOTION_API_KEY`), configuring OAuth. There is no guided onboarding. For a non-developer, this is a blocker.

---

### 2.8 Mobile companion app for remote management

The Skylight mobile app lets any family member:
- Add/edit events on the wall calendar remotely
- Update chores and check them off
- Edit grocery/to-do lists
- View the board's current state

The wall display and the phone stay in sync. As of Feb 2026 there is also a Skylight desktop web app.

**Your app today:** There is no mobile companion. The app is browser-based and works on mobile, but it's not optimized for "quickly add something to the board from my phone while I'm out."

---

## 3. Where Skylight Falls Short (Your Advantages)

| Area | Skylight | Your App |
|---|---|---|
| **Hardware requirement** | Must buy $150–$600 device | Runs on any screen, any browser |
| **Layout flexibility** | Fixed — their layout, their widgets | Freeform drag-resize canvas, layout presets |
| **Widget breadth** | Calendar, chores, lists, meals, photos | + Spotify, YouTube, Sports, Pomodoro, Notion, Weather, Countdown, Drawings, Custom HTML, Website embed |
| **AI layer** | None | Walli orchestrator — understands context, can rearrange the board, respond to voice |
| **Notion integration** | None | Deep: Notion View widget, Database widget, write-back via API |
| **Multi-board** | Single display | Multiple named boards |
| **Extensibility** | Closed — no plugins | Plugin registry, Custom HTML widget, open architecture |
| **Drawing/annotation** | None | Drawing canvas on the board |
| **Focus/productivity** | None | Pomodoro, Timers, Countdown |
| **Entertainment** | None | Spotify, YouTube, Sports scores |
| **Subscription gate** | Core features locked behind $40–$80/yr | Presumably no paywall on core features |
| **Power user escape hatch** | None | Custom HTML widget |

The core strategic gap: **Skylight is opinionated and locked.** Your app is flexible and open. Skylight made a product for the median family. You can make a product for anyone with a screen and things they want to track.

---

## 4. Improvements — Prioritized

### Priority 1 — Calendar write-back (closes the biggest gap)

**The problem:** Your calendar widget is read-only. Skylight's most praised UX is tap-to-create.

**What to build:**
- Tap-and-hold on an empty area of the Day or Week view → slide-up sheet with pre-filled time
- Inline event creation form: title, date, time, all-day toggle, calendar picker (which Google calendar to write to)
- POST to Google Calendar API via your Express server
- On success, optimistically add to the local TanStack Query cache

This alone turns the calendar from a display widget into an actual planning tool. No other ambient display does this without opening a separate app.

---

### Priority 2 — Walli "ingest this" flow (your version of Magic Import)

**The problem:** Skylight lets users throw anything at the calendar — email, photo, voice — and it creates the event. Your Walli orchestrator exists but isn't wired to calendar creation.

**What to build:**
- Walli command: "Add [event] to my calendar" → Walli calls Google Calendar write API
- Walli command: "I have a dentist appointment Thursday at 3" → parsed via Claude, event created
- Optional: drag-and-drop an image onto the Walli chat area → Claude Vision extracts event details → confirmation dialog → write to calendar

This is where you leapfrog Skylight — their Magic Import is a fixed pipeline. Yours is a conversation with an AI that understands your board's full context.

---

### Priority 3 — On-screen event reminders (ambient alert system)

**The problem:** Skylight proactively interrupts you with upcoming events. Your board is passive.

**What to build:**
- Background hook (in Express server or a browser-side interval) that checks Google Calendar for events starting in the next N minutes
- When triggered: fire a `NotificationToast` (the component already exists) with the event title and time
- Optional: audio chime via Web Audio API
- Configurable lead time per user (10 min, 15 min, 30 min)

Your `NotificationCenter` + `NotificationToast` infrastructure already exists. This is plumbing them into the calendar data.

---

### Priority 4 — Routines widget gamification (close the chore chart gap)

**The problem:** Your `RoutinesWidget` is a plain checklist. Skylight's chore chart has assignment, recurrence, and a celebration moment.

**What to build:**
- **Completion animation**: confetti burst or emoji explosion when all items in a routine are checked (CSS + a small particle library)
- **Person/label assignment** per routine item — just a color dot or avatar initial
- **Streak counter**: "Day 5 in a row!" displayed under the routine name
- **Recurrence**: auto-reset the checklist at midnight daily / Monday weekly (currently unclear if this exists)

These are small UX details but they're the difference between a tool people use once and one they come back to every day.

---

### Priority 5 — Meal planning widget

**The problem:** Skylight has it. You don't. It's a meaningful use case for households.

**What to build:**
- New widget `@whiteboard/meals`
- Week grid (7 columns × 3–4 rows for meal slots)
- Each cell: tap to add a meal name (simple text, no recipe database needed v1)
- Persist to Notion database or local board state
- Walli integration: "What's for dinner this week?" → Walli reads the meal widget

This is a relatively self-contained widget. v1 doesn't need a recipe library — just a grid you can type into.

---

### Priority 6 — Guided onboarding flow

**The problem:** Skylight's 10-minute setup is a key differentiator. Your app requires technical setup.

**What to build:**
- First-launch wizard: steps through connecting Google Calendar, connecting Notion (optional), naming the board
- Each step has a clear explanation of what it does and why
- Skip options for users who want to do it manually
- Pre-built "starter board" layout that appears after setup — clock, calendar, weather, a note — so users see a useful board immediately rather than a blank canvas

This lowers the activation barrier dramatically and is the single biggest thing that would make this product accessible to non-developers.

---

### Priority 7 — Mobile-optimized quick-add surface

**The problem:** Skylight's mobile app lets you update the board from anywhere. Your app works on mobile but isn't optimized for it.

**What to build:**
- A `/quick-add` route optimized for mobile: minimal UI, just a text field + voice input
- Submitting creates a Walli message: "Add [text] to my calendar" or "Add [text] to my grocery list on the board"
- Walli handles routing to the right widget
- Share sheet integration (iOS/Android): share a webpage/email to your board → Walli parses it

This doesn't require a native app — a well-designed PWA with a share target would cover 80% of the use case.

---

## 5. Summary Table

| Improvement | Effort | Impact | Closes gap with Skylight |
|---|---|---|---|
| Calendar write-back | Medium | Very High | Yes — their #1 UX advantage |
| Walli event ingestion | Medium | Very High | Yes — better than Magic Import |
| On-screen reminders | Low | High | Yes |
| Routines gamification | Low | Medium | Partial |
| Meal planning widget | Medium | Medium | Yes |
| Onboarding wizard | High | Very High | Yes — accessibility gap |
| Mobile quick-add | Medium | High | Partial |

---

## 6. The Strategic Angle

Skylight's bet is that families want a **dedicated appliance** — something that just works, with no configuration, that every family member can use without instruction. That's a real need and they fill it well.

Your bet is that people want a **smart, flexible ambient display** that adapts to how they actually work — not a fixed layout for a fixed use case. You're building for the person who wants their Notion sprint board next to their calendar next to their Pomodoro timer, rearranged by an AI that knows their context.

The risk is complexity. The opportunity is that Skylight literally cannot do what your app does, and no one else in this space has an AI orchestration layer. The goal for your next development cycle should be: **close the gaps that make Skylight feel more capable day-to-day (write-back, reminders, gamification) without giving up what makes your app categorically different (Walli, flexibility, depth).**

---

## 7. Open Architecture Question — Calendar as Infrastructure

> *Note to revisit:* The framing of calendar write-back as a "widget improvement" (Priority 1 above) may be the wrong frame entirely. On every serious ambient display — Skylight, Dakboard, Nest Hub — calendar is a first-class data layer baked into the core experience, not something you drag onto a canvas. The widget model works well for optional things (sports, Spotify, Pomodoro), but calendar is foundational: nearly every user needs it, and more importantly **Walli needs it** to have any situational awareness. If calendar is a widget that may or may not be on the board, Walli can't reliably reference what's happening today. If it's a core data layer, the whole board becomes context-aware by default.
>
> This may apply more broadly — what else is infrastructure vs. what's a widget? Date/time, notifications, and calendar feel like they belong to the system. Everything else lives on the canvas.

---

*Sources:*
- [Skylight Calendar Review 2026 — Cybernews](https://cybernews.com/reviews/skylight-calendar-review/)
- [Skylight debuts Calendar 2 — TechCrunch](https://techcrunch.com/2026/01/07/skylight-debuts-calendar-2-to-keep-your-family-organized/)
- [Skylight Calendar product page](https://myskylight.com/products/skylight-calendar/)
- [How To Use Skylight Magic Import — Skylight Support](https://skylight.zendesk.com/hc/en-us/articles/18039340445211-How-To-Use-Skylight-Magic-Import)
- [Using the Calendar Tab — Skylight Support](https://skylight.zendesk.com/hc/en-us/articles/36625171368987-Using-the-Calendar-Tab)
- [How to Set Reminders — Skylight Support](https://skylight.zendesk.com/hc/en-us/articles/32083277890075-How-to-Set-Reminders)
- [Chore Chart setup — Skylight Support](https://skylight.zendesk.com/hc/en-us/articles/8139191033627-How-can-I-set-up-Chore-Chart-on-my-Skylight-Calendar)
- [Skylight Calendar Set Up Guide](https://skylight.zendesk.com/hc/en-us/articles/30561875063707-Skylight-Calendar-Set-Up-Guide)
- [Hearth vs Skylight comparison — The Quality Edit](https://www.thequalityedit.com/articles/hearth-vs-skylight-review)
