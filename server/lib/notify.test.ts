import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger to avoid console noise
vi.mock('./logger.js', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

import { notify } from './notify.js'

const ORIGINAL_NTFY_TOPIC  = process.env.NTFY_TOPIC
const ORIGINAL_NTFY_SERVER = process.env.NTFY_SERVER

beforeEach(() => {
  vi.clearAllMocks()
  // Reset env vars to unset
  delete process.env.NTFY_TOPIC
  delete process.env.NTFY_SERVER
})

afterEach(() => {
  if (ORIGINAL_NTFY_TOPIC  !== undefined) process.env.NTFY_TOPIC  = ORIGINAL_NTFY_TOPIC
  else delete process.env.NTFY_TOPIC
  if (ORIGINAL_NTFY_SERVER !== undefined) process.env.NTFY_SERVER = ORIGINAL_NTFY_SERVER
  else delete process.env.NTFY_SERVER
})

describe('notify', () => {
  it('does nothing when NTFY_TOPIC is not set', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('calls fetch when NTFY_TOPIC is set', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Hello', 'World')
    expect(fetchSpy).toHaveBeenCalledOnce()
    fetchSpy.mockRestore()
  })

  it('uses default ntfy.sh server when NTFY_SERVER is not set', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body')
    const [url] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('ntfy.sh')
    expect(String(url)).toContain('my-topic')
    fetchSpy.mockRestore()
  })

  it('uses custom NTFY_SERVER when set', async () => {
    process.env.NTFY_TOPIC  = 'my-topic'
    process.env.NTFY_SERVER = 'https://my-ntfy-server.com'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body')
    const [url] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('my-ntfy-server.com')
    expect(String(url)).toContain('my-topic')
    fetchSpy.mockRestore()
  })

  it('uses POST method', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body')
    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).method).toBe('POST')
    fetchSpy.mockRestore()
  })

  it('sends title in headers', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('My Title', 'Body text')
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Title']).toBe('My Title')
    fetchSpy.mockRestore()
  })

  it('sends body text as request body', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'My body text')
    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).body).toBe('My body text')
    fetchSpy.mockRestore()
  })

  it('sets Content-Type to text/plain', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body')
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Content-Type']).toBe('text/plain')
    fetchSpy.mockRestore()
  })

  it('includes Priority header when priority option is set', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body', { priority: 'urgent' })
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Priority']).toBe('urgent')
    fetchSpy.mockRestore()
  })

  it('does not include Priority header when priority option is absent', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body')
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Priority']).toBeUndefined()
    fetchSpy.mockRestore()
  })

  it('includes Tags header when tags option is set', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body', { tags: ['warning', 'computer'] })
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Tags']).toBe('warning,computer')
    fetchSpy.mockRestore()
  })

  it('does not include Tags header when tags is empty', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body', { tags: [] })
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Tags']).toBeUndefined()
    fetchSpy.mockRestore()
  })

  it('includes Click header when url option is set', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body', { url: 'https://example.com' })
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Click']).toBe('https://example.com')
    fetchSpy.mockRestore()
  })

  it('does not include Click header when url option is absent', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Title', 'Body')
    const [, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Click']).toBeUndefined()
    fetchSpy.mockRestore()
  })

  it('does not throw when fetch rejects (logs error instead)', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))
    await expect(notify('Title', 'Body')).resolves.toBeUndefined()
    fetchSpy.mockRestore()
  })

  it('calls logError when fetch throws', async () => {
    process.env.NTFY_TOPIC = 'my-topic'
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'))
    const { error: logError } = await import('./logger.js')
    await notify('Title', 'Body')
    expect(logError).toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('handles all options together', async () => {
    process.env.NTFY_TOPIC  = 'alerts'
    process.env.NTFY_SERVER = 'https://custom.server.com'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await notify('Alert', 'Something happened', {
      priority: 'high',
      tags: ['alert', 'server'],
      url: 'https://dashboard.example.com',
    })
    const [url, options] = fetchSpy.mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(String(url)).toBe('https://custom.server.com/alerts')
    expect(headers['Title']).toBe('Alert')
    expect(headers['Priority']).toBe('high')
    expect(headers['Tags']).toBe('alert,server')
    expect(headers['Click']).toBe('https://dashboard.example.com')
    expect((options as RequestInit).body).toBe('Something happened')
    fetchSpy.mockRestore()
  })
})
