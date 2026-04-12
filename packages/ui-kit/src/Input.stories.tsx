import type { Meta, StoryObj } from '@storybook/react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title:     'Design System/Input',
  component: Input,
  tags:      ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Playground: Story = {
  args: {
    label:       'Label',
    placeholder: 'Placeholder…',
    size:        'md',
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-72 p-4">
      <Input size="sm" placeholder="Small input" />
      <Input size="md" placeholder="Medium input" />
      <Input size="lg" placeholder="Large input" />
    </div>
  ),
}

export const WithLabelAndHint: Story = {
  render: () => (
    <div className="w-72 p-4">
      <Input
        label="Board name"
        placeholder="e.g. Morning routines"
        hint="This will appear in the top-right nav."
      />
    </div>
  ),
}

export const WithError: Story = {
  render: () => (
    <div className="w-72 p-4">
      <Input
        label="API key"
        placeholder="notion_…"
        error="Invalid API key format."
        defaultValue="bad-key"
      />
    </div>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <div className="w-72 p-4">
      <Input
        placeholder="Search databases…"
        iconLeft={<MagnifyingGlass size={14} />}
      />
    </div>
  ),
}
