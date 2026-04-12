import type { Meta, StoryObj } from '@storybook/react'
import { CountdownWidget } from './CountdownWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

// Helper: date N days from now as ISO date string
function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const meta: Meta<typeof CountdownWidget> = {
  title: 'Widgets/Countdown',
  component: CountdownWidget,
  tags: ['autodocs'],
  decorators: [widgetDecorator],
  parameters: {
    widgetSize: { width: 320, height: 260 },
  },
}
export default meta

type Story = StoryObj<typeof CountdownWidget>

export const Default: Story = {
  render: () => <CountdownWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      title: 'Vacation',
      targetDate: daysFromNow(42),
      showTime: true,
    },
  },
}

export const FewDays: Story = {
  name: 'Few Days Away',
  render: () => <CountdownWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      title: 'Product Launch',
      targetDate: daysFromNow(3),
      showTime: true,
    },
  },
}

export const PastDate: Story = {
  name: 'Past Date',
  render: () => <CountdownWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      title: 'Anniversary',
      targetDate: daysFromNow(-120),
      showTime: true,
    },
  },
}

export const NoDate: Story = {
  name: 'No Date Set',
  render: () => <CountdownWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      title: 'Countdown',
      targetDate: '',
      showTime: true,
    },
  },
}

export const Wide: Story = {
  name: 'Wide Layout',
  render: () => <CountdownWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 520, height: 220 },
    widgetSettings: {
      title: 'New Year',
      targetDate: `${new Date().getFullYear() + 1}-01-01`,
      showTime: true,
    },
  },
}

export const NoTimer: Story = {
  name: 'Without Time Display',
  render: () => <CountdownWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      title: 'Birthday',
      targetDate: daysFromNow(90),
      showTime: false,
    },
  },
}
