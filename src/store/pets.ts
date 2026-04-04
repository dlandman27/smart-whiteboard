import { create } from 'zustand'

export type PetMood = 'idle' | 'active' | 'speaking'

export interface PetState {
  agentId:  string
  mood:     PetMood
  message:  string | null
}

interface PetsStore {
  pets:       Record<string, PetState>
  setPet:     (agentId: string, mood: PetMood, message?: string) => void
  clearMessage: (agentId: string) => void
}

export const usePetsStore = create<PetsStore>((set) => ({
  pets: {},

  setPet(agentId, mood, message) {
    set((s) => ({
      pets: {
        ...s.pets,
        [agentId]: { agentId, mood, message: message ?? s.pets[agentId]?.message ?? null },
      },
    }))
  },

  clearMessage(agentId) {
    set((s) => ({
      pets: {
        ...s.pets,
        [agentId]: { ...s.pets[agentId], mood: 'idle', message: null },
      },
    }))
  },
}))
