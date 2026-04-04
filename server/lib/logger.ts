const ts = () => new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm

export const log   = (...args: unknown[]) => console.log (`[${ts()}] INFO `, ...args)
export const warn  = (...args: unknown[]) => console.warn(`[${ts()}] WARN `, ...args)
export const error = (...args: unknown[]) => console.error(`[${ts()}] ERROR`, ...args)
