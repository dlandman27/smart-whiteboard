import { create } from 'zustand'

interface BriefingStore {
  text:    string | null
  trigger: (text: string) => void
  clear:   () => void
}

export const useBriefingStore = create<BriefingStore>()((set) => ({
  text:    null,
  trigger: (text) => set({ text }),
  clear:   () => set({ text: null }),
}))
