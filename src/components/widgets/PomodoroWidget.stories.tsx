import type { Meta, StoryObj } from '@storybook/react'
import { PomodoroWidget } from './PomodoroWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

const meta: Meta<typeof PomodoroWidget> = {
  title: 'Widgets/Pomodoro',
  component: PomodoroWidget,
  tags: ['autodocs'],
  decorators: [widgetDecorator],
  parameters: {
    widgetSize: { width: 300, height: 380 },
    widgetSettings: {
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      cyclesBeforeLongBreak: 4,
    },
  },
}
export default meta

type Story = StoryObj<typeof PomodoroWidget>

export const Default: Story = {
  name: 'Idle (Focus)',
  render: () => <PomodoroWidget widgetId={STORY_WIDGET_ID} />,
}

export const ShortCycles: Story = {
  name: 'Short Cycles (1min focus)',
  render: () => <PomodoroWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      workMinutes: 1,
      breakMinutes: 1,
      longBreakMinutes: 2,
      cyclesBeforeLongBreak: 2,
    },
  },
}

export const WideLayout: Story = {
  name: 'Wide Layout',
  render: () => <PomodoroWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 560, height: 260 },
    widgetSettings: {
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      cyclesBeforeLongBreak: 4,
    },
  },
}

export const Compact: Story = {
  name: 'Compact',
  render: () => <PomodoroWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 260, height: 320 },
  },
}
