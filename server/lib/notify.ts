// ── ntfy push notifications ───────────────────────────────────────────────────
//
// Publishes a push notification to an ntfy topic.
// Install the ntfy app on your phone and subscribe to the same topic.
// https://ntfy.sh

interface NotifyOptions {
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent'
  tags?:     string[]
  url?:      string
}

export async function notify(title: string, body: string, opts: NotifyOptions = {}): Promise<void> {
  const topic = process.env.NTFY_TOPIC
  if (!topic) return

  const server = process.env.NTFY_SERVER ?? 'https://ntfy.sh'

  const headers: Record<string, string> = {
    'Title':        title,
    'Content-Type': 'text/plain',
  }
  if (opts.priority) headers['Priority'] = opts.priority
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.url) headers['Click'] = opts.url

  try {
    await fetch(`${server}/${topic}`, {
      method:  'POST',
      headers,
      body,
    })
  } catch (err) {
    console.error('[ntfy] Failed to send notification:', err)
  }
}
