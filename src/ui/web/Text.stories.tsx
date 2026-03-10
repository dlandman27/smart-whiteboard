import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './Text'

const meta: Meta<typeof Text> = {
  title:     'Design System/Text',
  component: Text,
  tags:      ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['display', 'heading', 'title', 'body', 'label', 'caption'] },
    size:    { control: 'select', options: ['large', 'medium', 'small'] },
    color:   { control: 'select', options: ['default', 'muted', 'accent', 'disabled'] },
    align:   { control: 'select', options: ['left', 'center', 'right'] },
  },
}

export default meta
type Story = StoryObj<typeof Text>

export const Playground: Story = {
  args: {
    variant:  'body',
    size:     'medium',
    color:    'default',
    children: 'The quick brown fox jumps over the lazy dog',
  },
}

export const TypeScale: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-4 max-w-xl">
      <Text variant="display" size="large">Display Large — Lora</Text>
      <Text variant="display" size="medium">Display Medium — Lora</Text>
      <Text variant="display" size="small">Display Small — Lora</Text>
      <hr className="border-stone-200" />
      <Text variant="heading" size="large">Heading Large — Lora</Text>
      <Text variant="heading" size="medium">Heading Medium — Lora</Text>
      <Text variant="heading" size="small">Heading Small — Lora</Text>
      <hr className="border-stone-200" />
      <Text variant="title" size="large">Title Large — Inter Semibold</Text>
      <Text variant="title" size="medium">Title Medium — Inter Semibold</Text>
      <Text variant="title" size="small">Title Small — Inter Semibold</Text>
      <hr className="border-stone-200" />
      <Text variant="body" size="large">Body Large — Inter Regular. Used for main reading content.</Text>
      <Text variant="body" size="medium">Body Medium — Inter Regular. Used for main reading content.</Text>
      <Text variant="body" size="small">Body Small — Inter Regular. Used for supporting text.</Text>
      <hr className="border-stone-200" />
      <Text variant="label" size="large">Label Large</Text>
      <Text variant="label" size="medium">Label Medium</Text>
      <Text variant="label" size="small">Label Small</Text>
      <hr className="border-stone-200" />
      <Text variant="caption" size="large">Caption Large — secondary, muted context</Text>
      <Text variant="caption" size="medium">Caption Medium — secondary, muted context</Text>
    </div>
  ),
}

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      <Text color="default">Default — stone-900</Text>
      <Text color="muted">Muted — stone-500</Text>
      <Text color="accent">Accent — amber-500</Text>
      <Text color="disabled">Disabled — stone-300</Text>
    </div>
  ),
}
