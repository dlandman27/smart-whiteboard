---
name: onboarding
description: Work on the Onboarding & Auth pillar — login flow, first-run experience, template picker, guided setup, billing. Use when building or improving user acquisition and retention flows.
---

# Onboarding & Auth Pillar

You are working on the Onboarding & Auth pillar. Currently bare-minimum (3/10) — users can sign in and land on an empty board.

## Architecture

- **Auth**: Supabase Auth via `@supabase/auth-ui-react`
- **Auth guard**: `src/components/AuthGuard.tsx` — wraps app, loads user data, inits stores
- **Login UI**: `src/components/AuthGuard.tsx` contains LoginScreen with Supabase Auth UI
- **Settings**: `src/components/SettingsBoardView.tsx` — theme, background, pets, briefing time, sign out
- **Supabase**: Auth + RLS policies in `supabase/migrations/001_initial_schema.sql`

## Current state (3/10)

**What's built**:
- Email/password auth via Supabase Auth UI
- AuthGuard initializes whiteboard store, theme store, starts sync
- System boards auto-created on first login (Main, Calendar, Settings, Connectors, Today, Todo)
- Settings page: theme picker, default background, pets toggle, briefing time, sign out

**What's missing**:
- OAuth providers (Google, GitHub, Apple, magic links)
- Onboarding wizard after signup (currently drops user into empty Main board)
- Template picker for first board ("Family Hub", "Home Office", "Kitchen Display")
- Guided connector setup ("Connect Google to see your calendar")
- First-run widget suggestions
- Billing / subscription / payment system
- User profile / account info display
- Email verification flow
- Password reset UI (Supabase handles backend, no custom UI)
- Usage analytics / telemetry

## Key files

- `src/components/AuthGuard.tsx` — Login screen + auth state management
- `src/components/SettingsBoardView.tsx` — User settings page
- `src/store/whiteboard.ts` — Board initialization on first login
- `src/store/theme.ts` — Theme initialization
- `src/lib/db.ts` — Supabase client + persistence
- `supabase/migrations/001_initial_schema.sql` — Schema + RLS policies
- `server/middleware/auth.ts` — Server-side auth middleware

## Onboarding flow to build

```
Sign up (email/password or OAuth)
  → Welcome screen ("Let's set up your board")
  → Template picker (Family Hub / Home Office / Kitchen Display / Blank)
  → Connect accounts (Google, Spotify — skip option)
  → Set location (for weather widget)
  → Board loads with pre-configured widgets from template
```

## Board templates to create

Each template should pre-populate widgets with sensible defaults:

- **Family Hub**: Calendar, Weather, Google Photos slideshow, Shared notes, Countdown (next vacation)
- **Home Office**: Calendar, Clock, Pomodoro, Notion tasks, Weather, News feed
- **Kitchen Display**: Clock, Weather, Google Photos, Quote of the day, Timers
- **Sports Fan**: Sports scores (pick leagues), Calendar, Weather, News feed
- **Blank**: Empty freeform board (current default)

## Conventions

- Supabase Auth UI handles the heavy lifting — customize appearance, don't rebuild
- Use Supabase RLS policies for data access control
- Auth tokens are JWTs validated in `server/middleware/auth.ts`
- Theme application happens in `ThemeApplier` component in `App.tsx`
- System boards use deterministic UUIDs — don't conflict with them

## When working on this pillar

1. Read `src/components/AuthGuard.tsx` first — that's the entry point
2. Onboarding should feel fast (< 60 seconds to a populated board)
3. Every step in onboarding must be skippable
4. Template widgets should use sensible defaults (weather: user's location, calendar: primary)
5. Don't break existing login flow while adding onboarding
6. Billing is a separate concern from auth — keep them decoupled
7. Consider the kiosk/wall-display use case — some users will set up once and never log in again
