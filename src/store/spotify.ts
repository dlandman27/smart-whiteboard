import { create } from 'zustand'

/**
 * Temporary local state for Spotify credential input fields.
 * These are NOT persisted — they're only held while the user is filling out
 * the form. The actual credentials are saved server-side when the user
 * initiates the OAuth flow via /spotify/start-auth.
 */
interface SpotifyCredentialStore {
  clientId:    string
  clientSecret: string
  redirectUri: string
  set: (patch: Partial<Omit<SpotifyCredentialStore, 'set'>>) => void
}

export const useSpotifyCredentials = create<SpotifyCredentialStore>()(
  (set) => ({
    clientId:    '',
    clientSecret: '',
    redirectUri: 'http://localhost:3001/api/spotify/callback',
    set: (patch) => set(patch),
  })
)
