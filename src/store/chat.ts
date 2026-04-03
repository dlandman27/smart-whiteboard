import { create } from 'zustand'

export interface ChatMessage {
  id:   string
  role: 'user' | 'walli'
  text: string
  ts:   number
}

interface ChatStore {
  messages: ChatMessage[]
  isOpen:   boolean
  addMessage: (role: 'user' | 'walli', text: string) => void
  toggle: () => void
  close:  () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isOpen:   false,

  addMessage: (role, text) =>
    set((s) => ({
      messages: [
        ...s.messages.slice(-99),
        { id: Math.random().toString(36).slice(2), role, text, ts: Date.now() },
      ],
    })),

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close:  () => set({ isOpen: false }),
}))
