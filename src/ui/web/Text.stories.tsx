import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './Text'

const meta: Meta<typeof Text> = {
  title:     'Design System/Text',
  component: Text,
  tags:      ['autodocs'],
  argTypes: {
    variant:       { control: 'select', options: ['display', 'heading', 'title', 'body', 'label', 'caption'] },
    size:          { control: 'select', options: ['large', 'medium', 'small'] },
    color:         { control: 'select', options: ['default', 'muted', 'accent', 'danger', 'onAccent', 'disabled'] },
    align:         { control: 'select', options: ['left', 'center', 'right', 'justify'] },
    textTransform: { control: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'] },
    numberOfLines: { control: 'number' },
    italic:        { control: 'boolean' },
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
    <div className="flex flex-col gap-6 p-8 max-w-2xl">
      <Text variant="display" size="large">Display Large</Text>
      <Text variant="display" size="medium">Display Medium</Text>
      <Text variant="display" size="small">Display Small</Text>
      <hr className="border-stone-200" />
      <Text variant="heading" size="large">Heading Large</Text>
      <Text variant="heading" size="medium">Heading Medium</Text>
      <Text variant="heading" size="small">Heading Small</Text>
      <hr className="border-stone-200" />
      <Text variant="title" size="large">Title Large</Text>
      <Text variant="title" size="medium">Title Medium</Text>
      <Text variant="title" size="small">Title Small</Text>
      <hr className="border-stone-200" />
      <Text variant="body" size="large">Body Large — used for main reading content.</Text>
      <Text variant="body" size="medium">Body Medium — used for main reading content.</Text>
      <Text variant="body" size="small">Body Small — used for supporting text.</Text>
      <hr className="border-stone-200" />
      <Text variant="label" size="large">Label Large</Text>
      <Text variant="label" size="medium">Label Medium</Text>
      <Text variant="label" size="small">Label Small</Text>
      <hr className="border-stone-200" />
      <Text variant="caption" size="large">Caption Large — secondary, muted context</Text>
      <Text variant="caption" size="medium">Caption Medium — secondary, muted context</Text>
      <Text variant="caption" size="small">Caption Small — secondary, muted context</Text>
    </div>
  ),
}

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-8">
      <Text color="default">Default — primary content</Text>
      <Text color="muted">Muted — secondary content</Text>
      <Text color="accent">Accent — highlighted / branded</Text>
      <Text color="danger">Danger — errors, destructive actions</Text>
      <Text color="disabled">Disabled — non-interactive</Text>
      <div className="mt-2 rounded-md px-3 py-2 inline-flex" style={{ background: 'var(--wt-accent)' }}>
        <Text color="onAccent">On Accent — text on accent background</Text>
      </div>
    </div>
  ),
}

export const Transforms: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-8">
      <Text variant="label" size="small" textTransform="uppercase" color="muted">Uppercase label</Text>
      <Text variant="body" size="medium" textTransform="capitalize">capitalize each word</Text>
      <Text variant="body" size="medium" italic>Italic body text</Text>
      <Text variant="body" size="medium" italic color="muted">Italic muted text</Text>
    </div>
  ),
}

export const NumberOfLines: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-8 max-w-sm">
      <div>
        <Text variant="label" size="small" color="muted" textTransform="uppercase">1 line</Text>
        <Text variant="body" size="medium" numberOfLines={1}>
          This is a long piece of text that will be clamped to a single line no matter how wide it is.
        </Text>
      </div>
      <div>
        <Text variant="label" size="small" color="muted" textTransform="uppercase">2 lines</Text>
        <Text variant="body" size="medium" numberOfLines={2}>
          This is a long piece of text that will be clamped to two lines. Any overflow beyond that point
          will be hidden with an ellipsis at the end of the visible content.
        </Text>
      </div>
    </div>
  ),
}
