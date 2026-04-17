import { PostHog } from 'posthog-node'

const key = process.env.POSTHOG_API_KEY
const host = process.env.POSTHOG_HOST

let _client: PostHog | null = null

function getClient(): PostHog | null {
  if (!key) return null
  if (!_client) {
    _client = new PostHog(key, host ? { host } : undefined)
  }
  return _client
}

export const analytics = {
  capture(event: string, props?: Record<string, unknown>, distinctId = 'server') {
    getClient()?.capture({ distinctId, event, properties: props })
  },

  identify(distinctId: string, props?: Record<string, unknown>) {
    getClient()?.identify({ distinctId, properties: props })
  },

  async shutdown() {
    await _client?.shutdown()
  },
}
