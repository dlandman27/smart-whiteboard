import { vi } from 'vitest'

/**
 * Mock useWidgetSettings to return the given settings object and a no-op updater.
 * Call this INSIDE vi.mock('@whiteboard/sdk', ...) factory.
 */
export function mockWidgetSettings<T>(settings: T) {
  return vi.fn().mockReturnValue([settings, vi.fn()])
}

/**
 * Mock global.fetch to return specific responses based on URL substring matching.
 * Each key in `responses` is matched against the fetch URL; the first match wins.
 * If no match is found, returns a 404 response.
 */
export function mockFetch(responses: Record<string, any>) {
  return vi.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    for (const [pattern, body] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve(new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  })
}

/**
 * Mock useWidgetSizeContext to return a given width/height.
 * Call this INSIDE vi.mock('@whiteboard/ui-kit', ...) factory.
 */
export function mockWidgetSize(width = 400, height = 300) {
  return vi.fn().mockReturnValue({ containerWidth: width, containerHeight: height })
}
