import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title:     'Design System/Button',
  component: Button,
  tags:      ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['solid', 'outline', 'ghost', 'link'] },
    size:    { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Playground: Story = {
  args: {
    variant:  'solid',
    size:     "lg",
    children: 'Button',
    iconRight: {}
  },
}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <Button variant="solid">Solid</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="solid" disabled>Disabled</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <div className="w-64 p-4">
      <Button fullWidth>Full Width</Button>
    </div>
  ),
}
