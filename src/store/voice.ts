import { create } from 'zustand'
import type { VoiceState } from '../hooks/useVoice'

interface VoiceStore {
  state:         VoiceState
  setVoiceState: (s: VoiceState) => void
}

export const useVoiceStore = create<VoiceStore>()((set) => ({
  state:         'idle',
  setVoiceState: (state) => set({ state }),
}))
