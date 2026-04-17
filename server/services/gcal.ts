import { google } from 'googleapis'
import { loadOAuthTokens, saveOAuthTokens } from './credentials.js'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  ?? 'http://localhost:3001/api/gcal/callback'

export function getGCalOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export async function getGCalClient(userId: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  const tokens = await loadOAuthTokens(userId, 'gcal')
  if (!tokens?.access_token && !tokens?.refresh_token) return null

  const client = getGCalOAuth2Client()
  client.setCredentials({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date:   tokens.expires_at ? new Date(tokens.expires_at).getTime() : undefined,
  })
  client.on('tokens', (newTokens: any) => {
    saveOAuthTokens(userId, 'gcal', {
      access_token:  newTokens.access_token ?? tokens.access_token,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
      expires_at:    newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : undefined,
    })
  })
  return client
}

export { CLIENT_ID, REDIRECT_URI }
