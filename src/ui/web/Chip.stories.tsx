import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Chip } from './Chip'

const meta: Meta<typeof Chip> = {
  title:     'Design System/Chip',
  component: Chip,
  tags:      ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'selected'] },
  },
}

export default meta
type Story = StoryObj<typeof Chip>

export const Playground: Story = {
  args: { variant: 'default', children: 'Chip label' },
}

export const Variants: Story = {
  render: () => (
    <div className="flex gap-2 p-4">
      <Chip variant="default">Default</Chip>
      <Chip variant="selected">Selected</Chip>
      <Chip disabled>Disabled</Chip>
    </div>
  ),
}

export const Toggle: Story = {
  render: () => {
    const options = ['All', 'Notion', 'Calendar', 'Drawing']
    const [active, setActive] = useState('All')
    return (
      <div className="flex gap-2 p-4">
        {options.map((o) => (
          <Chip
            key={o}
            variant={active === o ? 'selected' : 'default'}
            onClick={() => setActive(o)}
          >
            {o}
          </Chip>
        ))}
      </div>
    )
  },
}
