import { google } from 'googleapis'
import { loadTokens, saveTokens } from './tokens.js'

export let pendingGCalAuth: { clientId: string; clientSecret: string; redirectUri: string } | null = null

export function setPendingGCalAuth(auth: typeof pendingGCalAuth) {
  pendingGCalAuth = auth
}

export function getGCalClient() {
  const tokens       = loadTokens()
  const clientId     = tokens?.gcal_client_id
  const clientSecret = tokens?.gcal_client_secret
  const redirectUri  = tokens?.gcal_redirect_uri ?? 'http://localhost:3001/api/gcal/callback'
  if (!clientId || !clientSecret) return null

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  client.setCredentials({ access_token: tokens?.access_token, refresh_token: tokens?.refresh_token })
  client.on('tokens', (newTokens: any) => saveTokens(newTokens))
  return client
}
