import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

// Paths that skip JWT verification (OAuth browser redirects, health checks)
const PUBLIC_PATHS = [
  '/gcal/callback',
  '/spotify/callback',
  '/health',
]

/**
 * Middleware that verifies a Supabase JWT and sets req.userId.
 * Returns 401 if the token is missing, malformed, or invalid.
 * Skips verification for OAuth callback routes and health checks.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.includes(req.path)) {
    next()
    return
  }

  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' })
    return
  }

  const token = header.slice(7) // strip "Bearer "

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    req.userId = user.id
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}
