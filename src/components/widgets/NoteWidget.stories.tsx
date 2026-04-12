import type { Meta, StoryObj } from '@storybook/react'
import { NoteWidget } from './NoteWidget'
import { widgetDecorator, STORY_WIDGET_ID } from './__stories__/WidgetDecorator'

const meta: Meta<typeof NoteWidget> = {
  title: 'Widgets/Note',
  component: NoteWidget,
  tags: ['autodocs'],
  decorators: [widgetDecorator],
  parameters: {
    widgetSize: { width: 320, height: 240 },
  },
}
export default meta

type Story = StoryObj<typeof NoteWidget>

export const WithText: Story = {
  render: () => <NoteWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      content: 'Remember to review the pull request\nbefore the team meeting at 3pm.',
      fontSize: 18,
      align: 'left',
    },
  },
}

export const Empty: Story = {
  name: 'Empty (Placeholder)',
  render: () => <NoteWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      content: '',
      fontSize: 24,
      align: 'left',
    },
  },
}

export const CenterAligned: Story = {
  name: 'Center Aligned',
  render: () => <NoteWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSettings: {
      content: 'Ship it!',
      fontSize: 32,
      align: 'center',
    },
  },
}

export const LongText: Story = {
  name: 'Long Content',
  render: () => <NoteWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 360, height: 300 },
    widgetSettings: {
      content:
        'Shopping List:\n- Milk\n- Eggs\n- Bread\n- Coffee beans\n- Avocados\n- Chicken breast\n- Spinach\n- Olive oil',
      fontSize: 16,
      align: 'left',
    },
  },
}

export const LargeFont: Story = {
  name: 'Large Font',
  render: () => <NoteWidget widgetId={STORY_WIDGET_ID} />,
  parameters: {
    widgetSize: { width: 400, height: 200 },
    widgetSettings: {
      content: 'Focus.',
      fontSize: 48,
      align: 'center',
    },
  },
}
