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
