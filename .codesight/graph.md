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
