import type { Meta, StoryObj } from '@storybook/react'
import { QuoteWidget } from './QuoteWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

function mockQuoteFetch(quote: { quote: string; author: string }) {
  const origFetch = window.fetch
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (url.includes('/api/quote')) {
      return new Response(JSON.stringify(quote), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return origFetch(input, init)
  }
}

const SAMPLE_QUOTE = {
  quote: 'The only way to do great work is to love what you do.',
  author: 'Steve Jobs',
}

const LONG_QUOTE = {
  quote: 'In the middle of difficulty lies opportunity. It is not the strongest of the species that survives, nor the most intelligent, but the one most responsive to change.',
  author: 'Albert Einstein',
}

const meta: Meta<typeof QuoteWidget> = {
  title: 'Widgets/Quote',
  component: QuoteWidget,
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      // Clear any cached quote so the story always fetches fresh
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('quote-cache-'))
          .forEach((k) => localStorage.removeItem(k))
      } catch {}
      mockQuoteFetch(SAMPLE_QUOTE)
      return <Story />
    },
    widgetDecorator,
  ],
  parameters: {
    widgetSize: { width: 360, height: 260 },
    widgetSettings: {
      showRefresh: true,
      fontSize: 'md',
      align: 'center',
    },
  },
}
export default meta

type Story = StoryObj<typeof QuoteWidget>

export const Default: Story = {
  render: () => <QuoteWidget widgetId={STORY_WIDGET_ID} />,
}

export const LeftAligned: Story = {
  name: 'Left Aligned',
  render: () => <QuoteWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      showRefresh: true,
      fontSize: 'md',
      align: 'left',
    },
  },
}

export const LargeFont: Story = {
  name: 'Large Font',
  render: () => <QuoteWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 440, height: 300 },
    widgetSettings: {
      showRefresh: false,
      fontSize: 'lg',
      align: 'center',
    },
  },
}

export const LongQuote: Story = {
  name: 'Long Quote',
  render: () => <QuoteWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockQuoteFetch(LONG_QUOTE)
      return <Story />
    },
  ],
  parameters: {
    widgetSize: { width: 400, height: 300 },
    widgetSettings: {
      showRefresh: true,
      fontSize: 'sm',
      align: 'center',
    },
  },
}
