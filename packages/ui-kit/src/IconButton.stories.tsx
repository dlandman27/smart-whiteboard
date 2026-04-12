import type { Meta, StoryObj } from '@storybook/react'
import { Cursor, Pen, Eraser, X, CaretLeft, CaretRight, ArrowClockwise, Plus } from '@phosphor-icons/react'
import { IconButton } from './IconButton'

const meta: Meta<typeof IconButton> = {
  title:     'Design System/IconButton',
  component: IconButton,
  tags:      ['autodocs'],
  argTypes: {
    icon:    { control: false },
    variant: { control: 'select', options: ['default', 'active', 'ghost'] },
    size:    { control: 'select', options: ['sm', 'md', 'lg'] },
    filled:  { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof IconButton>

export const Playground: Story = {
  args: {
    icon:    Pen,
    variant: 'default',
    size:    'md',
    filled:  false,
    title:   'Pen',
  },
}

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <IconButton icon={Pen} variant="default" title="Default" />
      <IconButton icon={Pen} variant="active"  title="Active — filled icon, dark bg" />
      <IconButton icon={Pen} variant="ghost"   title="Ghost" />
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4">
      <IconButton icon={Plus} size="sm" title="Small" />
      <IconButton icon={Plus} size="md" title="Medium" />
      <IconButton icon={Plus} size="lg" title="Large" />
    </div>
  ),
}

export const ToolbarExample: Story = {
  render: () => {
    return (
      <div className="flex items-center gap-px bg-white border border-stone-200 shadow-lg rounded-2xl px-2 py-2 w-fit">
        <IconButton icon={Cursor} variant="active"  title="Select — active" />
        <IconButton icon={Pen}           variant="default" title="Marker" />
        <IconButton icon={Eraser}        variant="default" title="Eraser" />
        <div className="w-px h-6 bg-stone-200 mx-1.5" />
        <IconButton icon={X}             variant="default" title="Close" />
      </div>
    )
  },
}

export const NavExample: Story = {
  render: () => (
    <div className="flex items-center gap-px bg-white border border-stone-200 shadow-lg rounded-2xl px-2 py-2 w-fit">
      <IconButton icon={CaretLeft}  disabled title="Previous" />
      <span className="px-2 text-xs text-stone-700 font-medium">Board 1</span>
      <IconButton icon={CaretRight} title="Next" />
      <IconButton icon={Plus}         title="New board" />
    </div>
  ),
}

export const FilledManually: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <IconButton icon={ArrowClockwise} filled={false} title="Not filled" />
      <IconButton icon={ArrowClockwise} filled={true}  title="Filled" />
    </div>
  ),
}
