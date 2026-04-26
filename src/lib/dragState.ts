let _dragging = false
export const widgetDragState = {
  get active() { return _dragging },
  start() { _dragging = true },
  end()   { _dragging = false },
}
