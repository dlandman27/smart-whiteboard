import type { Meta, StoryObj } from '@storybook/react'
import {
  Plus, X, Check, Search, Settings, Trash2,
  ChevronLeft, ChevronRight, Calendar, Database,
  MousePointer2, Pen, Eraser, RefreshCw, ExternalLink,
} from 'lucide-react'
import { Icon } from './Icon'

const meta: Meta<typeof Icon> = {
  title:     'Design System/Icon',
  component: Icon,
  tags:      ['autodocs'],
  argTypes: {
    icon: { control: false },
    size: { control: 'number' },
  },
}

export default meta
type Story = StoryObj<typeof Icon>

export const Playground: Story = {
  args: {
    icon: Plus,
    size: 24,
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6 p-4">
      <div className="flex flex-col items-center gap-1.5">
        <Icon icon={Plus} size={12} />
        <span className="text-xs text-stone-400">12</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Icon icon={Plus} size={14} />
        <span className="text-xs text-stone-400">14</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Icon icon={Plus} size={16} />
        <span className="text-xs text-stone-400">16</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Icon icon={Plus} size={20} />
        <span className="text-xs text-stone-400">20</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Icon icon={Plus} size={24} />
        <span className="text-xs text-stone-400">24</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Icon icon={Plus} size={32} />
        <span className="text-xs text-stone-400">32</span>
      </div>
    </div>
  ),
}

const ALL_ICONS = [
  { icon: Plus,          name: 'Plus' },
  { icon: X,             name: 'X' },
  { icon: Check,         name: 'Check' },
  { icon: Search,        name: 'Search' },
  { icon: Settings,      name: 'Settings' },
  { icon: Trash2,        name: 'Trash2' },
  { icon: ChevronLeft,   name: 'ChevronLeft' },
  { icon: ChevronRight,  name: 'ChevronRight' },
  { icon: Calendar,      name: 'Calendar' },
  { icon: Database,      name: 'Database' },
  { icon: MousePointer2, name: 'MousePointer2' },
  { icon: Pen,           name: 'Pen' },
  { icon: Eraser,        name: 'Eraser' },
  { icon: RefreshCw,     name: 'RefreshCw' },
  { icon: ExternalLink,  name: 'ExternalLink' },
]

export const Gallery: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 p-4">
      {ALL_ICONS.map(({ icon, name }) => (
        <div key={name} className="flex flex-col items-center gap-1.5">
          <Icon icon={icon} size={20} />
          <span className="text-xs text-stone-400">{name}</span>
        </div>
      ))}
    </div>
  ),
}

export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4">
      <Icon icon={Database} size={20} className="text-stone-900" />
      <Icon icon={Database} size={20} className="text-stone-400" />
      <Icon icon={Database} size={20} className="text-amber-500" />
      <Icon icon={Database} size={20} className="text-blue-500" />
      <Icon icon={Database} size={20} className="text-red-500" />
      <Icon icon={Database} size={20} className="text-green-500" />
    </div>
  ),
}
