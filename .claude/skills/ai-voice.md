---
name: ai-voice
description: Work on the AI/Voice (Walli) pillar — voice commands, agents, briefings, TTS, smart suggestions. Use when building or improving anything related to the conversational AI layer.
---

# AI / Voice (Walli) Pillar

You are working on the AI/Voice pillar of the smart-whiteboard app. This is the product's main differentiator — no other smart display has a conversational AI layer.

## Architecture

- **Voice input**: Web Speech API with "Hey Walli" wake word in `src/components/VoiceListener.tsx` and `src/hooks/useVoice.ts`
- **TTS**: ElevenLabs streaming via `server/routes/voice.ts` (turbo model, MediaSource API)
- **Agent brain**: Claude Haiku with 40+ tools in `server/routes/walli.ts`
- **Domain routing**: Classifies queries → routes to specialized agents (Apollo, Miles, Harvey, Alfred)
- **Background agents**: 7 scheduled agents in `server/agents/` on 10-15min intervals via agent scheduler
- **Briefing system**: `server/routes/briefing.ts` + `server/crons/` — morning synthesis of weather, calendar, tasks, sports
- **Dynamic agents**: User-created agents via natural language, stored in SQLite (`walli.db`)
- **Frontend**: `src/components/WalliChat.tsx`, `src/components/VoiceListener.tsx`, `src/components/widgets/WalliAgentWidget.tsx`

## Current state (7/10)

**Fully built**: Voice pipeline, TTS streaming, 40+ voice tools, 7 background agents, briefing system, dynamic agent framework, agent scheduler with pet animations

**Half-built**:
- External Walli microservices (Apollo/Miles/Harvey/Alfred) — only local Claude fallback works
- Agent persistence in SQLite but NO frontend UI to create/manage agents
- Conversation memory: 6-turn local history, no semantic search or long-term recall
- Voice tool auth gaps (assumes OAuth already done)

**Missing**:
- Proactive smart suggestions ("you have a meeting in 30 min" without asking)
- Intent chaining / multi-step workflows ("when task is done, alert team and archive")
- Adaptive interrupt priority (agents always speak, no priority queue)
- Offline fallback (fully cloud-dependent)
- Voice privacy controls
- Agent state sync to persistent DB (lost on restart)
- Frontend UI for creating/managing custom agents

## Key files

- `server/routes/voice.ts` — TTS endpoint
- `server/routes/walli.ts` — Walli agent brain + voice tools
- `server/routes/briefing.ts` — Daily briefing
- `server/agents/` — Background agent definitions
- `server/agents/index.ts` — Scheduler, dynamic agent builder
- `server/crons/` — Cron jobs for briefing, reminders
- `src/components/VoiceListener.tsx` — Wake word + speech recognition
- `src/components/WalliChat.tsx` — Chat UI
- `src/hooks/useVoice.ts` — Voice state management
- `src/store/voice.ts` — Voice Zustand store

## Conventions

- Voice tools are defined as tool arrays in the walli route handler
- Background agents implement a standard interface: `{ id, label, interval, run(ctx) }`
- Agent context includes: broadcast, speak, notify, notion, anthropic, gcal, boards, activeBoardId
- Use `asyncRoute()` wrapper on all Express handlers
- All routes behind `requireAuth` middleware
- TTS uses ElevenLabs turbo v2 with voice ID from env

## When working on this pillar

1. Read the relevant files above before making changes
2. Voice tools should fail gracefully when OAuth isn't connected
3. Background agents should be idempotent (safe to re-run)
4. Keep Claude token usage efficient — use Haiku for conversational, Sonnet only when reasoning matters
5. Test with both voice input and chat text input
