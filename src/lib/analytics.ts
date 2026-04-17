import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined

if (key) {
  posthog.init(key, {
    ...(host && { api_host: host }),
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
  })
}

export const analytics = {
  identify(userId: string, traits?: Record<string, unknown>) {
    if (!key) return
    posthog.identify(userId, traits)
  },

  track(event: string, props?: Record<string, unknown>) {
    if (!key) return
    posthog.capture(event, props)
  },

  reset() {
    if (!key) return
    posthog.reset()
  },
}
