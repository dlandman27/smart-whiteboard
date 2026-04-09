import { useEffect, useRef } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'
import { useThemeStore } from '../store/theme'
import { soundWidgetAdded, soundWidgetRemoved } from '../lib/sounds'
import { useBriefingStore } from '../store/briefing'
import { useNotificationStore } from '../store/notifications'
import { usePetsStore } from '../store/pets'
import { useWalliAgentsStore } from '../store/walliAgents'
import { queryClient } from '../App'

const WS_URL = 'ws://localhost:3001'

// Module-level dedup set — survives component remounts (Strict Mode, reconnects, multiple tabs via shared sessionStorage)
const handledSpeakIds = new Set<string>()

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

  // Sync state to server whenever store changes — throttled to avoid flooding during drag
  useEffect(() => {
    let pending = false
    return useWhiteboardStore.subscribe(() => {
      if (pending) return
      pending = true
      setTimeout(() => {
        pending = false
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        sendState(ws)
      }, 100)
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
          soundWidgetAdded()
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
          soundWidgetRemoved()
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
        } else if (msg.type === 'speak_briefing') {
          if (msg.id) {
            if (handledSpeakIds.has(msg.id)) return
            handledSpeakIds.add(msg.id)
            // Keep the set from growing forever
            if (handledSpeakIds.size > 200) {
              const first = handledSpeakIds.values().next().value
              handledSpeakIds.delete(first)
            }
          }
          useBriefingStore.getState().trigger(msg.text)
        } else if (msg.type === 'flash_widget') {
          useUIStore.getState().flashWidget(msg.id)
        } else if (msg.type === 'timer_alert') {
          useNotificationStore.getState().addNotification({
            title: `⏰ ${msg.label}`,
            body:  'Timer done',
          })
        } else if (msg.type === 'pet_wake') {
          usePetsStore.getState().setPet(msg.agentId, 'active')
        } else if (msg.type === 'pet_message') {
          usePetsStore.getState().setPet(msg.agentId, 'speaking', msg.text)
        } else if (msg.type === 'pet_idle') {
          const current = usePetsStore.getState().pets[msg.agentId]
          // Don't clear if there's still a message showing
          if (!current?.message) usePetsStore.getState().setPet(msg.agentId, 'idle')
        } else if (msg.type === 'walli_widget_update') {
          useWalliAgentsStore.getState().setWidget(msg)
        } else if (msg.type === 'walli_layout_update') {
          // layout decisions handled per-widget by WalliAgentWidget
          useWalliAgentsStore.getState().setWidget({ ...msg, type: undefined })
        } else if (msg.type === 'notion_invalidate') {
          if (msg.databaseId) {
            queryClient.invalidateQueries({ queryKey: ['notion-view', msg.databaseId] })
            queryClient.invalidateQueries({ queryKey: ['pages', msg.databaseId] })
          } else {
            queryClient.invalidateQueries({ queryKey: ['notion-view'] })
            queryClient.invalidateQueries({ queryKey: ['pages'] })
          }
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
