import type { Meta, StoryObj } from '@storybook/react'
import { GooglePhotosWidget } from './GooglePhotosWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

function mockGPhotosFetch(opts: { connected: boolean; photos: Record<string, unknown>[] }) {
  const origFetch = window.fetch
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (url.includes('/api/gphotos/status')) {
      return new Response(JSON.stringify({ connected: opts.connected }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/api/gphotos/photos')) {
      return new Response(JSON.stringify({ items: opts.photos }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return origFetch(input, init)
  }
}

const MOCK_PHOTOS = [
  {
    id: 'photo-1',
    baseUrl: 'https://picsum.photos/seed/a/800/600',
    width: 800,
    height: 600,
    description: 'Sunset over mountains',
  },
  {
    id: 'photo-2',
    baseUrl: 'https://picsum.photos/seed/b/800/600',
    width: 800,
    height: 600,
    description: 'City skyline',
  },
  {
    id: 'photo-3',
    baseUrl: 'https://picsum.photos/seed/c/800/600',
    width: 800,
    height: 600,
    description: 'Forest trail',
  },
]

const meta: Meta<typeof GooglePhotosWidget> = {
  title: 'Widgets/GooglePhotos',
  component: GooglePhotosWidget,
  tags: ['autodocs'],
  decorators: [widgetDecorator],
  parameters: {
    widgetSize: { width: 480, height: 320 },
    widgetSettings: {
      interval: 30,
      fitMode: 'cover',
      showCounter: false,
    },
  },
}
export default meta

type Story = StoryObj<typeof GooglePhotosWidget>

export const Connected: Story = {
  render: () => <GooglePhotosWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockGPhotosFetch({ connected: true, photos: MOCK_PHOTOS })
      return <Story />
    },
  ],
}

export const WithCounter: Story = {
  name: 'With Photo Counter',
  render: () => <GooglePhotosWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      interval: 30,
      fitMode: 'cover',
      showCounter: true,
    },
  },
  decorators: [
    (Story) => {
      mockGPhotosFetch({ connected: true, photos: MOCK_PHOTOS })
      return <Story />
    },
  ],
}

export const ContainFit: Story = {
  name: 'Contain Fit Mode',
  render: () => <GooglePhotosWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      interval: 30,
      fitMode: 'contain',
      showCounter: true,
    },
  },
  decorators: [
    (Story) => {
      mockGPhotosFetch({ connected: true, photos: MOCK_PHOTOS })
      return <Story />
    },
  ],
}

export const Disconnected: Story = {
  render: () => <GooglePhotosWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockGPhotosFetch({ connected: false, photos: [] })
      return <Story />
    },
  ],
}
