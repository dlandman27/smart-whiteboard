import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GCalCredentialStore {
  clientId:    string
  clientSecret: string
  redirectUri: string
  set: (patch: Partial<Omit<GCalCredentialStore, 'set'>>) => void
}

export const useGCalCredentials = create<GCalCredentialStore>()(
  persist(
    (set) => ({
      clientId:    '',
      clientSecret: '',
      redirectUri: 'http://localhost:3001/api/gcal/callback',
      set: (patch) => set(patch),
    }),
    { name: 'gcal-credentials' }
  )
)
