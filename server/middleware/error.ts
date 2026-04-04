import type { Request, Response, NextFunction } from 'express'

/**
 * Throw this for any intentional error in a route handler.
 * The errorMiddleware catches it and returns a clean JSON response.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Wraps an async route handler so any thrown error is forwarded to
 * Express error middleware via next(err). Works on sync handlers too.
 */
export function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => unknown,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Central error-handling middleware. Register last with app.use(errorMiddleware).
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    })
    return
  }
  console.error('[server error]', err)
  res.status(500).json({ error: 'Internal server error' })
}
