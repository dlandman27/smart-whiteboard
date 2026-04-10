import { useWhiteboardStore } from '../store/whiteboard'

/**
 * Parses a possibly-namespaced widget ID.
 * Split sub-widgets use the format `parentId::paneA` or `parentId::paneB`.
 * Returns the real widget ID and an optional pane key.
 */
function parseSplitId(widgetId: string): { realId: string; paneKey?: string } {
  const sep = widgetId.indexOf('::')
  if (sep === -1) return { realId: widgetId }
  return { realId: widgetId.slice(0, sep), paneKey: widgetId.slice(sep + 2) }
}

export function useWidgetSettings<T extends Record<string, unknown>>(
  widgetId: string,
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const { realId, paneKey } = parseSplitId(widgetId)

  const raw = useWhiteboardStore((s) => {
    const widget = s.boards
      .find((b) => b.id === s.activeBoardId)
      ?.widgets.find((w) => w.id === realId)
    if (!widget?.settings) return undefined
    // If this is a sub-widget inside a split pane, read from pane config's settings
    if (paneKey) {
      const pane = widget.settings[paneKey] as { settings?: Record<string, unknown> } | undefined
      return pane?.settings
    }
    return widget.settings
  })

  const updateSettings = useWhiteboardStore((s) => s.updateSettings)

  const settings = { ...defaults, ...(raw ?? {}) } as T

  const update = (patch: Partial<T>) => {
    if (paneKey) {
      // Merge into the pane's nested settings object
      const state  = useWhiteboardStore.getState()
      const widget = state.boards
        .find((b) => b.id === state.activeBoardId)
        ?.widgets.find((w) => w.id === realId)
      const pane = (widget?.settings?.[paneKey] ?? {}) as Record<string, unknown>
      const paneSettings = { ...(pane.settings as Record<string, unknown> ?? {}), ...patch }
      updateSettings(realId, { [paneKey]: { ...pane, settings: paneSettings } })
    } else {
      updateSettings(widgetId, patch as Record<string, unknown>)
    }
  }

  return [settings, update]
}
