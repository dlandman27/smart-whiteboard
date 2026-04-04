# Pod Commit & PR Prefixes

All commits and PR titles use conventional commits format: `<type>(<scope>): <description>`

## Scopes by pod

| Pod | Scope | Example |
|---|---|---|
| Widget UI | `widget` | `feat(widget): add countdown widget` |
| Data/Integration | `integration` | `feat(integration): add todoist integration` |
| Board Core | `board` | `fix(board): bump persist migration to v4` |
| AI/Agent layer | `agent` | `feat(agent): add habit streak agent` |
| Mobile (Walli app) | `mobile` | `feat(mobile): add layout switcher screen` |

## Commit types

| Type | When to use |
|---|---|
| `feat` | New widget, integration, agent, screen, or feature |
| `fix` | Bug fix — broken behavior, wrong output, crash |
| `refactor` | Code restructure with no behavior change |
| `style` | Formatting, token cleanup, no logic change |
| `chore` | Dependency updates, config, tooling |
| `docs` | Comments, README, spec files only |
| `test` | Adding or fixing tests |

## Full examples

```
feat(widget): add countdown widget
fix(widget): handle empty data state in NotionWidget
refactor(widget): migrate ClockWidget to ResizeObserver pattern

feat(integration): add todoist integration
fix(integration): add enabled guard to useTodoist hook

feat(board): add mosaic layout preset
fix(board): bump whiteboard-layout persist version to v4
refactor(board): remove any cast in addWidget action

feat(agent): add habit streak agent
fix(agent): catch unhandled rejection in calendarAgent

feat(mobile): add layout switcher to board tab
fix(mobile): show error state when server unreachable on agents screen
refactor(mobile): move inline fetch calls to lib/api.ts
```
