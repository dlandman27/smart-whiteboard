import { useState, useEffect } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface ToastMessage {
  id:       string
  message:  string
  variant:  ToastVariant
  duration?: number
}

let messages: ToastMessage[] = []
const listeners = new Set<(msgs: ToastMessage[]) => void>()

function notify() {
  const snapshot = [...messages]
  listeners.forEach((fn) => fn(snapshot))
}

export function toast(message: string, variant: ToastVariant = 'info', duration = 3000): void {
  const id = Math.random().toString(36).slice(2)
  messages = [...messages, { id, message, variant, duration }]
  notify()

  setTimeout(() => {
    messages = messages.filter((m) => m.id !== id)
    notify()
  }, duration)
}

export function useToastMessages(): ToastMessage[] {
  const [msgs, setMsgs] = useState<ToastMessage[]>([...messages])

  useEffect(() => {
    function handler(updated: ToastMessage[]) {
      setMsgs(updated)
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return msgs
}
