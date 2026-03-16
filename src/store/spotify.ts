import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SpotifyCredentialStore {
  clientId:    string
  clientSecret: string
  redirectUri: string
  set: (patch: Partial<Omit<SpotifyCredentialStore, 'set'>>) => void
}

export const useSpotifyCredentials = create<SpotifyCredentialStore>()(
  persist(
    (set) => ({
      clientId:    '',
      clientSecret: '',
      redirectUri: 'http://localhost:3001/api/spotify/callback',
      set: (patch) => set(patch),
    }),
    { name: 'spotify-credentials' }
  )
)
