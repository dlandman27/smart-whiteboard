import { useWhiteboardStore } from '../store/whiteboard'

export function useWidgetSettings<T extends Record<string, unknown>>(
  widgetId: string,
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const raw = useWhiteboardStore((s) =>
    s.boards
      .find((b) => b.id === s.activeBoardId)
      ?.widgets.find((w) => w.id === widgetId)?.settings
  )
  const updateSettings = useWhiteboardStore((s) => s.updateSettings)
  const settings = { ...defaults, ...(raw ?? {}) } as T
  const update = (patch: Partial<T>) =>
    updateSettings(widgetId, patch as Record<string, unknown>)
  return [settings, update]
}
