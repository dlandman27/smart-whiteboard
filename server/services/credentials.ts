import { supabaseAdmin } from '../lib/supabase.js'
import { encrypt, decrypt } from '../lib/crypto.js'

// ── OAuth tokens ─────────────────────────────────────────────────────────────

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_at?: string
}

export async function loadOAuthTokens(userId: string, service: string): Promise<OAuthTokens | null> {
  const { data, error } = await supabaseAdmin
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)
    .single()

  if (error || !data) return null

  try {
    return {
      access_token:  data.access_token ? decrypt(data.access_token) : '',
      refresh_token: data.refresh_token ? decrypt(data.refresh_token) : undefined,
      expires_at:    data.expires_at ?? undefined,
    }
  } catch {
    // Decryption failed — token was encrypted with a different key (e.g. key rotation).
    // Treat as not connected so the user can reconnect and re-encrypt with the current key.
    return null
  }
}

export async function saveOAuthTokens(userId: string, service: string, tokens: OAuthTokens): Promise<void> {
  const { error } = await supabaseAdmin.from('oauth_tokens').upsert({
    user_id:       userId,
    service,
    access_token:  encrypt(tokens.access_token),
    refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expires_at:    tokens.expires_at ?? null,
  })
  if (error) console.error('saveOAuthTokens:', error)
}

export async function deleteOAuthTokens(userId: string, service: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('service', service)
  if (error) console.error('deleteOAuthTokens:', error)
}

// ── User credentials (API keys, client secrets) ──────────────────────────────

export interface Credential {
  api_key?: string
  client_id?: string
  client_secret?: string
  redirect_uri?: string
}

export async function loadCredential(userId: string, service: string): Promise<Credential | null> {
  const { data, error } = await supabaseAdmin
    .from('user_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)
    .single()

  if (error || !data) return null

  try {
    return {
      api_key:       data.api_key ? decrypt(data.api_key) : undefined,
      client_id:     data.client_id ?? undefined,
      client_secret: data.client_secret ? decrypt(data.client_secret) : undefined,
      redirect_uri:  data.redirect_uri ?? undefined,
    }
  } catch {
    return null
  }
}

export async function saveCredential(userId: string, service: string, cred: Credential): Promise<void> {
  const { error } = await supabaseAdmin.from('user_credentials').upsert({
    user_id:       userId,
    service,
    api_key:       cred.api_key ? encrypt(cred.api_key) : null,
    client_id:     cred.client_id ?? null,
    client_secret: cred.client_secret ? encrypt(cred.client_secret) : null,
    redirect_uri:  cred.redirect_uri ?? null,
  })
  if (error) console.error('saveCredential:', error)
}

/** Return the first userId that has a stored OAuth token for the given service (for background agents). */
export async function getFirstUserWithService(service: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('oauth_tokens')
    .select('user_id')
    .eq('service', service)
    .limit(1)
    .single()
  return data?.user_id ?? null
}

export async function deleteCredential(userId: string, service: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_credentials')
    .delete()
    .eq('user_id', userId)
    .eq('service', service)
  if (error) console.error('deleteCredential:', error)
}
