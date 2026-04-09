import { create } from 'zustand'

export type AgentDomain = 'apollo' | 'miles' | 'harvey' | 'alfred' | 'walli'

export interface AgentWidgetState {
  widget_id:  string
  agent:      AgentDomain
  data:       Record<string, unknown>
  size:       'small' | 'medium' | 'large' | 'full'
  updated_at: string
}

interface WalliAgentsStore {
  widgets: Record<string, AgentWidgetState>  // keyed by widget_id
  setWidget: (state: AgentWidgetState) => void
  getWidget: (widget_id: string) => AgentWidgetState | undefined
}

export const useWalliAgentsStore = create<WalliAgentsStore>((set, get) => ({
  widgets: {},
  setWidget: (state) =>
    set((prev) => ({ widgets: { ...prev.widgets, [state.widget_id]: state } })),
  getWidget: (widget_id) => get().widgets[widget_id],
}))
