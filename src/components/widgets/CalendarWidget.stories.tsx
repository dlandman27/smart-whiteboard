import type { Meta, StoryObj } from '@storybook/react'
import { CalendarWidget } from './CalendarWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

function mockCalendarFetch(events: Record<string, unknown>[]) {
  const origFetch = window.fetch
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (url.includes('/api/gcal')) {
      return new Response(JSON.stringify({ items: events }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return origFetch(input, init)
  }
}

const now = new Date()
const todayISO = now.toISOString().slice(0, 10)

function makeEvent(
  id: string,
  summary: string,
  startHour: number,
  durationHours: number,
  colorId?: string,
) {
  const start = new Date(now)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(start)
  end.setHours(startHour + durationHours)
  return {
    id,
    summary,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    colorId: colorId ?? '7',
  }
}

const MOCK_EVENTS = [
  makeEvent('1', 'Morning Standup', 9, 0.5, '7'),
  makeEvent('2', 'Design Review', 10, 1, '3'),
  makeEvent('3', 'Lunch with Team', 12, 1, '2'),
  makeEvent('4', 'Sprint Planning', 14, 1.5, '1'),
  makeEvent('5', 'Coffee Chat', 16, 0.5, '5'),
  {
    id: '6',
    summary: 'Company All-Hands',
    start: { date: todayISO },
    end: { date: todayISO },
    colorId: '4',
  },
]

const meta: Meta<typeof CalendarWidget> = {
  title: 'Widgets/Calendar',
  component: CalendarWidget,
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      mockCalendarFetch(MOCK_EVENTS)
      return <Story />
    },
    widgetDecorator,
  ],
  parameters: {
    widgetSize: { width: 360, height: 400 },
    widgetSettings: { calendarId: '' },
  },
}
export default meta

type Story = StoryObj<typeof CalendarWidget>

export const DayView: Story = {
  render: () => <CalendarWidget widgetId={STORY_WIDGET_ID} />,
}

export const EmptyDay: Story = {
  name: 'Empty Day',
  render: () => <CalendarWidget widgetId={STORY_WIDGET_ID} />,
  decorators: [
    (Story) => {
      mockCalendarFetch([])
      return <Story />
    },
  ],
}

export const Wide: Story = {
  name: 'Wide Layout',
  render: () => <CalendarWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 560, height: 360 },
  },
}
