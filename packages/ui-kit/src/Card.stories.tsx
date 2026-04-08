import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './Card'
import { Text } from './Text'

const meta: Meta<typeof Card> = {
  title:     'Design System/Card',
  component: Card,
  tags:      ['autodocs'],
  argTypes: {
    tone:    { control: 'select', options: ['default', 'accent', 'flat'] },
    radius:  { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
  },
}

export default meta
type Story = StoryObj<typeof Card>

const Content = () => (
  <>
    <Text variant="title" size="medium">Card title</Text>
    <Text variant="body" size="medium" color="muted" className="mt-1">
      This is some supporting body text inside the card.
    </Text>
  </>
)

export const Playground: Story = {
  args: { tone: 'default', radius: 'xl', padding: 'md' },
  render: (args) => <Card {...args}><Content /></Card>,
}

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4 w-72">
      <Card tone="default"><Content /></Card>
      <Card tone="accent"><Content /></Card>
      <Card tone="flat"><Content /></Card>
    </div>
  ),
}
