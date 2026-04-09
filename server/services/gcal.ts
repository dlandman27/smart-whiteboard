import { google } from 'googleapis'
import { loadTokens, saveTokens } from './tokens.js'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  ?? 'http://localhost:3001/api/gcal/callback'

export function getGCalOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export function getGCalClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  const tokens = loadTokens()
  if (!tokens?.access_token && !tokens?.refresh_token) return null

  const client = getGCalOAuth2Client()
  client.setCredentials({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
  client.on('tokens', (newTokens: any) => saveTokens(newTokens))
  return client
}

export { CLIENT_ID, REDIRECT_URI }
