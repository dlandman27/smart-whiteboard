import type { Meta, StoryObj } from '@storybook/react'
import { RSSWidget } from './RSSWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

const MOCK_FEED = {
  title: 'Hacker News',
  description: 'Links for the intellectually curious.',
  items: [
    {
      title: 'Show HN: I built a real-time collaborative whiteboard',
      link: 'https://news.ycombinator.com/item?id=1',
      pubDate: new Date(Date.now() - 30 * 60_000).toISOString(),
      content: 'A real-time collaborative whiteboard built with React and WebSockets.',
      thumbnail: null,
    },
    {
      title: 'Rust is eating the world: a 2026 retrospective',
      link: 'https://news.ycombinator.com/item?id=2',
      pubDate: new Date(Date.now() - 2 * 3600_000).toISOString(),
      content: 'Five years of Rust adoption in production systems and what we learned.',
    },
    {
      title: 'Why SQLite is the only database you need',
      link: 'https://news.ycombinator.com/item?id=3',
      pubDate: new Date(Date.now() - 5 * 3600_000).toISOString(),
      content: 'A deep dive into SQLite performance at scale.',
    },
    {
      title: 'The architecture of a modern design system',
      link: 'https://news.ycombinator.com/item?id=4',
      pubDate: new Date(Date.now() - 8 * 3600_000).toISOString(),
    },
    {
      title: 'Lessons from building a startup in public',
      link: 'https://news.ycombinator.com/item?id=5',
      pubDate: new Date(Date.now() - 24 * 3600_000).toISOString(),
      content: 'What I learned from sharing every step of the journey.',
    },
    {
      title: 'WebAssembly reaches 1.0: what it means for the web',
      link: 'https://news.ycombinator.com/item?id=6',
      pubDate: new Date(Date.now() - 48 * 3600_000).toISOString(),
    },
  ],
}

function mockRSSFetch(feed: typeof MOCK_FEED) {
  const origFetch = window.fetch
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (url.includes('/api/rss')) {
      return new Response(JSON.stringify(feed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return origFetch(input, init)
  }
}

const meta: Meta<typeof RSSWidget> = {
  title: 'Widgets/RSS',
  component: RSSWidget,
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      mockRSSFetch(MOCK_FEED)
      return <Story />
    },
    widgetDecorator,
  ],
  parameters: {
    widgetSize: { width: 340, height: 420 },
    widgetSettings: {
      feedUrl: 'https://news.ycombinator.com/rss',
      feedName: '',
      limit: 10,
      showThumbnails: true,
      autoScroll: false,
    },
  },
}
export default meta

type Story = StoryObj<typeof RSSWidget>

export const Default: Story = {
  render: () => <RSSWidget widgetId={STORY_WIDGET_ID} />,
}

export const CustomName: Story = {
  name: 'Custom Feed Name',
  render: () => <RSSWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      feedUrl: 'https://news.ycombinator.com/rss',
      feedName: 'Tech News',
      limit: 10,
      showThumbnails: false,
      autoScroll: false,
    },
  },
}

export const Compact: Story = {
  name: 'Compact Height',
  render: () => <RSSWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 300, height: 260 },
  },
}

export const NoFeedConfigured: Story = {
  name: 'No Feed URL',
  render: () => <RSSWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      feedUrl: '',
      feedName: '',
      limit: 10,
      showThumbnails: true,
      autoScroll: false,
    },
  },
}
