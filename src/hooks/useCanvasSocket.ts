import { useEffect, useRef } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'
import { useThemeStore } from '../store/theme'

const WS_URL = 'ws://localhost:3001'

export function useCanvasSocket() {
  const wsRef = useRef<WebSocket | null>(null)

  function sendState(ws: WebSocket) {
    const state = useWhiteboardStore.getState()
    const board = state.boards.find((b) => b.id === state.activeBoardId)
    ws.send(JSON.stringify({
      type:          'state_update',
      widgets:       board?.widgets ?? [],
      boards:        state.boards.map((b) => ({ id: b.id, name: b.name, widgets: b.widgets })),
      activeBoardId: state.activeBoardId,
      canvas:        { width: window.innerWidth, height: window.innerHeight },
    }))
  }

  // Sync state to server whenever store changes
  useEffect(() => {
    return useWhiteboardStore.subscribe(() => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      sendState(ws)
    })
  }, [])

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => sendState(ws)

      ws.onmessage = (event) => {
        let msg: any
        try { msg = JSON.parse(event.data) } catch { return }

        const {
          addWidget, updateLayout, updateSettings, removeWidget, clearWidgets,
          addBoard, renameBoard, removeBoard, setActiveBoard, setCustomLayout,
        } = useWhiteboardStore.getState()
        const { setFocusedWidget } = useUIStore.getState()
        const { setTheme, setCustomTheme } = useThemeStore.getState()

        if (msg.type === 'create_widget') {
          addWidget({
            id:            msg.id,
            type:          msg.widgetType,
            x:             msg.x     ?? 100,
            y:             msg.y     ?? 100,
            width:         msg.width ?? 300,
            height:        msg.height ?? 200,
            databaseTitle: msg.label ?? (msg.widgetType as string).replace('@whiteboard/', ''),
            settings:      msg.settings ?? {},
          } as any)
        } else if (msg.type === 'update_widget') {
          const hasLayout = msg.x != null || msg.y != null || msg.width != null || msg.height != null
          if (hasLayout) {
            updateLayout(msg.id, {
              ...(msg.x      != null && { x:      msg.x }),
              ...(msg.y      != null && { y:      msg.y }),
              ...(msg.width  != null && { width:  msg.width }),
              ...(msg.height != null && { height: msg.height }),
            })
          }
          if (msg.settings) {
            updateSettings(msg.id, msg.settings)
          }
        } else if (msg.type === 'delete_widget') {
          removeWidget(msg.id)
        } else if (msg.type === 'clear_widgets') {
          clearWidgets()
        } else if (msg.type === 'create_board') {
          addBoard(msg.name, msg.id)
        } else if (msg.type === 'rename_board') {
          renameBoard(msg.id, msg.name)
        } else if (msg.type === 'delete_board') {
          removeBoard(msg.id)
        } else if (msg.type === 'switch_board') {
          setActiveBoard(msg.id)
        } else if (msg.type === 'focus_widget') {
          setFocusedWidget(msg.id ?? null)
        } else if (msg.type === 'unfocus_widget') {
          setFocusedWidget(null)
        } else if (msg.type === 'set_theme') {
          setTheme(msg.themeId)
        } else if (msg.type === 'set_custom_theme') {
          const { __baseTheme, ...vars } = msg.vars ?? {}
          setCustomTheme(vars, msg.background, __baseTheme)
        } else if (msg.type === 'set_custom_layout') {
          const boardId = useWhiteboardStore.getState().activeBoardId
          setCustomLayout(boardId, msg.slots ?? [])
        }
      }

      ws.onclose = () => {
        // Reconnect after 3s if closed unexpectedly
        setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])
}
