import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { log, warn, error } from './logger.js'

describe('logger', () => {
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; warn: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> }

  beforeEach(() => {
    consoleSpy = {
      log:   vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn:  vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── log ────────────────────────────────────────────────────────────────────

  it('log calls console.log', () => {
    log('hello')
    expect(consoleSpy.log).toHaveBeenCalledOnce()
  })

  it('log does not throw', () => {
    expect(() => log('test message')).not.toThrow()
  })

  it('log includes INFO in output', () => {
    log('my message')
    const args = consoleSpy.log.mock.calls[0]
    const combined = args.join(' ')
    expect(combined).toContain('INFO')
  })

  it('log includes the message in output', () => {
    log('specific message text')
    const args = consoleSpy.log.mock.calls[0]
    const combined = args.join(' ')
    expect(combined).toContain('specific message text')
  })

  it('log passes multiple arguments through', () => {
    log('arg1', 'arg2', { key: 'val' })
    const args = consoleSpy.log.mock.calls[0]
    expect(args).toContain('arg1')
    expect(args).toContain('arg2')
  })

  it('log includes a timestamp-like prefix', () => {
    log('test')
    const firstArg = consoleSpy.log.mock.calls[0][0] as string
    // The prefix looks like [HH:MM:SS.mmm]
    expect(firstArg).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/)
  })

  // ── warn ───────────────────────────────────────────────────────────────────

  it('warn calls console.warn', () => {
    warn('watch out')
    expect(consoleSpy.warn).toHaveBeenCalledOnce()
  })

  it('warn does not throw', () => {
    expect(() => warn('warning message')).not.toThrow()
  })

  it('warn includes WARN in output', () => {
    warn('warning text')
    const args = consoleSpy.warn.mock.calls[0]
    const combined = args.join(' ')
    expect(combined).toContain('WARN')
  })

  it('warn includes the message in output', () => {
    warn('specific warning text')
    const args = consoleSpy.warn.mock.calls[0]
    expect(args).toContain('specific warning text')
  })

  it('warn passes multiple arguments through', () => {
    warn('a', 'b', 42)
    const args = consoleSpy.warn.mock.calls[0]
    expect(args).toContain('a')
    expect(args).toContain('b')
    expect(args).toContain(42)
  })

  // ── error ──────────────────────────────────────────────────────────────────

  it('error calls console.error', () => {
    error('something broke')
    expect(consoleSpy.error).toHaveBeenCalledOnce()
  })

  it('error does not throw', () => {
    expect(() => error('error message')).not.toThrow()
  })

  it('error includes ERROR in output', () => {
    error('an error')
    const args = consoleSpy.error.mock.calls[0]
    const combined = args.join(' ')
    expect(combined).toContain('ERROR')
  })

  it('error includes the message in output', () => {
    error('specific error text')
    const args = consoleSpy.error.mock.calls[0]
    expect(args).toContain('specific error text')
  })

  it('error passes Error objects through', () => {
    const err = new Error('test error')
    error('caught:', err)
    const args = consoleSpy.error.mock.calls[0]
    expect(args).toContain(err)
  })

  it('error passes multiple arguments through', () => {
    error('msg', { code: 500 }, new Error('oops'))
    const args = consoleSpy.error.mock.calls[0]
    expect(args).toContain('msg')
  })

  // ── Independence ───────────────────────────────────────────────────────────

  it('log does not call console.warn or console.error', () => {
    log('test')
    expect(consoleSpy.warn).not.toHaveBeenCalled()
    expect(consoleSpy.error).not.toHaveBeenCalled()
  })

  it('warn does not call console.log or console.error', () => {
    warn('test')
    expect(consoleSpy.log).not.toHaveBeenCalled()
    expect(consoleSpy.error).not.toHaveBeenCalled()
  })

  it('error does not call console.log or console.warn', () => {
    error('test')
    expect(consoleSpy.log).not.toHaveBeenCalled()
    expect(consoleSpy.warn).not.toHaveBeenCalled()
  })
})
