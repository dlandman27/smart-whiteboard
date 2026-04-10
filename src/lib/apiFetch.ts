import { supabase } from './supabase'

/**
 * Shared authenticated fetch for all API calls.
 * Attaches the Supabase JWT as a Bearer token on every request.
 */
export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()

  const headers = new Headers(options?.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || `HTTP ${res.status}`)
  }

  return res.json()
}
