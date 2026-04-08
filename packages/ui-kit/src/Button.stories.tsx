import type { Meta, StoryObj } from '@storybook/react'
import { Plus, ArrowRight } from 'lucide-react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title:     'Design System/Button',
  component: Button,
  tags:      ['autodocs'],
  argTypes: {
    variant:   { control: 'select', options: ['solid', 'outline', 'ghost', 'link', 'accent'] },
    size:      { control: 'select', options: ['sm', 'md', 'lg'] },
    fullWidth: { control: 'boolean' },
    disabled:  { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Playground: Story = {
  args: {
    variant:  'solid',
    size:     'md',
    children: 'Button',
  },
}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-8">
      <Button variant="solid">Solid</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-3 p-8">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-8">
      <Button variant="solid"   iconLeft={<Plus size={14} />}>Add item</Button>
      <Button variant="outline" iconRight={<ArrowRight size={14} />}>Continue</Button>
      <Button variant="accent"  iconLeft={<Plus size={14} />}>New widget</Button>
      <Button variant="ghost"   iconLeft={<Plus size={14} />} size="sm">Add</Button>
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-8">
      <Button variant="solid"   disabled>Disabled solid</Button>
      <Button variant="outline" disabled>Disabled outline</Button>
      <Button variant="accent"  disabled>Disabled accent</Button>
    </div>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <div className="w-64 p-8">
      <Button fullWidth>Full Width</Button>
      <div className="mt-3">
        <Button fullWidth variant="accent">Full Width Accent</Button>
      </div>
    </div>
  ),
}
