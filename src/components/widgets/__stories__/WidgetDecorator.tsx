import React, { useEffect } from 'react'
import type { Decorator } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWhiteboardStore } from '../../../store/whiteboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
})

/**
 * Dark-theme CSS variables matching the Dracula-calibrated dark palette.
 * Applied inline so Storybook stories render with the correct look
 * without requiring the full app theme system.
 */
const DARK_THEME_VARS: Record<string, string> = {
  '--wt-bg':               '#282a36',
  '--wt-border':           '#44475a',
  '--wt-border-active':    '#6272a4',
  '--wt-shadow-sm':        '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
  '--wt-shadow-md':        '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)',
  '--wt-shadow-lg':        '0 20px 40px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3)',
  '--wt-backdrop':         'none',
  '--wt-text':             '#f8f8f2',
  '--wt-text-muted':       '#6272a4',
  '--wt-surface':          '#21222c',
  '--wt-surface-hover':    '#343746',
  '--wt-surface-danger':   'rgba(255,85,85,0.12)',
  '--wt-surface-subtle':   '#343746',
  '--wt-accent':           '#bd93f9',
  '--wt-accent-text':      '#282a36',
  '--wt-danger':           '#ff5555',
  '--wt-success':          '#50fa7b',
  '--wt-info':             '#8be9fd',
  '--wt-action-bg':        '#282a36',
  '--wt-action-border':    '#44475a',
  '--wt-settings-bg':      '#282a36',
  '--wt-settings-border':  '#44475a',
  '--wt-settings-divider': '#343746',
  '--wt-settings-label':   '#6272a4',
  '--wt-scroll-thumb':     '#44475a',
  '--wt-clock-face':       '#21222c',
  '--wt-clock-stroke':     '#44475a',
  '--wt-clock-tick-major': '#f8f8f2',
  '--wt-clock-tick-minor': '#6272a4',
  '--wt-clock-hands':      '#f8f8f2',
  '--wt-clock-second':     '#ff5555',
  '--wt-clock-center':     '#f8f8f2',
  '--wt-note-bg':          '#343746',
}

/** The fixed widget ID used for all Storybook stories */
export const STORY_WIDGET_ID = 'storybook-widget-001'

/** The fixed board ID used in the Zustand store for stories */
const STORY_BOARD_ID = '00000000-0000-4000-8000-000000000001'

/**
 * Seeds the whiteboard Zustand store with a widget containing the
 * given settings so that `useWidgetSettings(widgetId, defaults)`
 * returns the merged result.
 */
function StoreSeeder({ settings }: { settings: Record<string, unknown> }) {
  useEffect(() => {
    const store = useWhiteboardStore.getState()
    const board = store.boards.find((b) => b.id === STORY_BOARD_ID)
    const widget = board?.widgets.find((w) => w.id === STORY_WIDGET_ID)

    if (!widget) {
      // Add a dummy widget to the default board
      useWhiteboardStore.setState((s) => ({
        boards: s.boards.map((b) =>
          b.id === STORY_BOARD_ID
            ? {
                ...b,
                widgets: [
                  ...b.widgets.filter((w) => w.id !== STORY_WIDGET_ID),
                  {
                    id: STORY_WIDGET_ID,
                    type: 'storybook',
                    databaseTitle: '',
                    x: 0,
                    y: 0,
                    width: 320,
                    height: 280,
                    settings,
                  },
                ],
              }
            : b,
        ),
        activeBoardId: STORY_BOARD_ID,
      }))
    } else {
      // Update existing widget settings
      store.updateSettings(STORY_WIDGET_ID, settings)
    }
  }, [settings])

  return null
}

/**
 * Storybook decorator that wraps a widget in a fixed-size container
 * with the app's dark-theme CSS variables applied and the Zustand
 * store pre-seeded with widget settings.
 *
 * Configure via story parameters:
 *   parameters: {
 *     widgetSize:     { width: 400, height: 300 },
 *     widgetSettings: { unit: 'celsius', ... },
 *   }
 */
export const widgetDecorator: Decorator = (Story, context) => {
  const { width = 320, height = 280 } = context.parameters.widgetSize ?? {}
  const settings = context.parameters.widgetSettings ?? {}

  return (
    <QueryClientProvider client={queryClient}>
      <div
        style={{
          ...DARK_THEME_VARS,
          width,
          height,
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--wt-bg)',
          color: 'var(--wt-text)',
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          position: 'relative',
        } as React.CSSProperties}
      >
        <StoreSeeder settings={settings} />
        <Story />
      </div>
    </QueryClientProvider>
  )
}
