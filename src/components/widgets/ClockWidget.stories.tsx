import type { Meta, StoryObj } from '@storybook/react'
import { ClockWidget, AnalogClockWidget, DigitalClockWidget } from './ClockWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

const meta: Meta<typeof ClockWidget> = {
  title: 'Widgets/Clock',
  component: ClockWidget,
  tags: ['autodocs'],
  decorators: [widgetDecorator],
  parameters: {
    widgetSize: { width: 320, height: 280 },
  },
}
export default meta

type Story = StoryObj<typeof ClockWidget>

export const Digital: Story = {
  render: () => <DigitalClockWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 340, height: 240 },
    widgetSettings: { timezone: '', showDate: true },
  },
}

export const Analog: Story = {
  render: () => <AnalogClockWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 300, height: 300 },
    widgetSettings: { timezone: '', showDate: true },
  },
}

export const Classic: Story = {
  render: () => <ClockWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 340, height: 280 },
    widgetSettings: {
      display: 'digital',
      use24h: false,
      showSeconds: true,
      showDate: true,
      font: 'thin',
      timezone: '',
      showTimezone: false,
      showHourNumbers: false,
    },
  },
}

export const ClassicAnalog: Story = {
  name: 'Classic (Analog)',
  render: () => <ClockWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 300, height: 320 },
    widgetSettings: {
      display: 'analog',
      use24h: false,
      showSeconds: true,
      showDate: true,
      font: 'thin',
      timezone: '',
      showTimezone: false,
      showHourNumbers: true,
    },
  },
}

export const WithTimezone: Story = {
  name: 'Digital + Timezone',
  render: () => <DigitalClockWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 340, height: 280 },
    widgetSettings: { timezone: 'America/New_York', showDate: true },
  },
}

export const Classic24h: Story = {
  name: 'Classic 24h Mono',
  render: () => <ClockWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 340, height: 260 },
    widgetSettings: {
      display: 'digital',
      use24h: true,
      showSeconds: true,
      showDate: false,
      font: 'mono',
      timezone: '',
      showTimezone: false,
      showHourNumbers: false,
    },
  },
}
