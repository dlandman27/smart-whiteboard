import { supabaseAdmin } from '../lib/supabase.js'
import { encrypt, decrypt } from '../lib/crypto.js'

// ── OAuth tokens ─────────────────────────────────────────────────────────────

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_at?: string
  account_id?: string
  account_email?: string
}

export async function loadOAuthTokens(
  userId: string,
  service: string,
  accountId = 'primary',
): Promise<OAuthTokens | null> {
  const { data, error } = await supabaseAdmin
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)
    .eq('account_id', accountId)
    .single()

  if (error || !data) return null

  try {
    return {
      access_token:  data.access_token  ? decrypt(data.access_token)  : '',
      refresh_token: data.refresh_token ? decrypt(data.refresh_token) : undefined,
      expires_at:    data.expires_at    ?? undefined,
      account_id:    data.account_id,
      account_email: data.account_email ?? undefined,
    }
  } catch {
    // Decryption failed — token was encrypted with a different key (e.g. key rotation).
    return null
  }
}

/** Returns all connected accounts for a given service. */
export async function loadAllOAuthTokens(
  userId: string,
  service: string,
): Promise<OAuthTokens[]> {
  const { data, error } = await supabaseAdmin
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)

  if (error || !data) return []

  const results: OAuthTokens[] = []
  for (const row of data) {
    try {
      results.push({
        access_token:  row.access_token  ? decrypt(row.access_token)  : '',
        refresh_token: row.refresh_token ? decrypt(row.refresh_token) : undefined,
        expires_at:    row.expires_at    ?? undefined,
        account_id:    row.account_id,
        account_email: row.account_email ?? undefined,
      })
    } catch {
      // skip tokens that can't be decrypted
    }
  }
  return results
}

export async function saveOAuthTokens(
  userId: string,
  service: string,
  tokens: OAuthTokens,
  accountId = 'primary',
): Promise<void> {
  const { error } = await supabaseAdmin.from('oauth_tokens').upsert({
    user_id:       userId,
    service,
    account_id:    tokens.account_id    ?? accountId,
    account_email: tokens.account_email ?? null,
    access_token:  encrypt(tokens.access_token),
    refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expires_at:    tokens.expires_at    ?? null,
  })
  if (error) console.error('saveOAuthTokens:', error)
}

/** Delete a specific account, or all accounts for the service if accountId is omitted. */
export async function deleteOAuthTokens(
  userId: string,
  service: string,
  accountId?: string,
): Promise<void> {
  let q = supabaseAdmin
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('service', service)

  if (accountId) q = q.eq('account_id', accountId) as typeof q

  const { error } = await q
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
      api_key:       data.api_key       ? decrypt(data.api_key)       : undefined,
      client_id:     data.client_id     ?? undefined,
      client_secret: data.client_secret ? decrypt(data.client_secret) : undefined,
      redirect_uri:  data.redirect_uri  ?? undefined,
    }
  } catch {
    return null
  }
}

export async function saveCredential(userId: string, service: string, cred: Credential): Promise<void> {
  const { error } = await supabaseAdmin.from('user_credentials').upsert({
    user_id:       userId,
    service,
    api_key:       cred.api_key       ? encrypt(cred.api_key)       : null,
    client_id:     cred.client_id     ?? null,
    client_secret: cred.client_secret ? encrypt(cred.client_secret) : null,
    redirect_uri:  cred.redirect_uri  ?? null,
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
