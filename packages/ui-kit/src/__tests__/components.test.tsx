import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Text,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  MenuItem,
  Panel,
  PanelHeader,
  SettingsSection,
  Slider,
  Spacer,
  Stat,
  Toggle,
  Icon,
  IconButton,
  Input,
  SegmentedControl,
  Container,
  WidgetSizeContext,
  useWidgetSizeContext,
  Flex,
  FlexRow,
  FlexCol,
  Grid,
  Box,
  Center,
  ScrollArea,
  widgetBreakpoints,
  widgetSizing,
  getBreakpoint,
  WIDGET_SHAPES,
} from '../index'

// ─────────────────────────────────────────────────────────────────────────────
// Text
// ─────────────────────────────────────────────────────────────────────────────
describe('Text', () => {
  it('renders children', () => {
    render(<Text>Hello World</Text>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('uses a <p> tag for body variant by default', () => {
    render(<Text variant="body">Body text</Text>)
    expect(screen.getByText('Body text').tagName).toBe('P')
  })

  it('uses an <h1> for display variant', () => {
    render(<Text variant="display">Display</Text>)
    expect(screen.getByText('Display').tagName).toBe('H1')
  })

  it('uses an <h2> for heading variant', () => {
    render(<Text variant="heading">Heading</Text>)
    expect(screen.getByText('Heading').tagName).toBe('H2')
  })

  it('uses a <span> for label variant', () => {
    render(<Text variant="label">Label</Text>)
    expect(screen.getByText('Label').tagName).toBe('SPAN')
  })

  it('uses a <span> for caption variant', () => {
    render(<Text variant="caption">Caption</Text>)
    expect(screen.getByText('Caption').tagName).toBe('SPAN')
  })

  it('renders with a custom tag via `as`', () => {
    render(<Text as="li">Item</Text>)
    expect(screen.getByText('Item').tagName).toBe('LI')
  })

  it('applies italic style', () => {
    render(<Text italic>Italic</Text>)
    expect(screen.getByText('Italic')).toHaveStyle({ fontStyle: 'italic' })
  })

  it('applies textAlign style', () => {
    render(<Text align="center">Centered</Text>)
    expect(screen.getByText('Centered')).toHaveStyle({ textAlign: 'center' })
  })

  it('fires onClick', () => {
    const handler = vi.fn()
    render(<Text onClick={handler}>Click me</Text>)
    fireEvent.click(screen.getByText('Click me'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('renders title attribute', () => {
    render(<Text title="tooltip">T</Text>)
    expect(screen.getByTitle('tooltip')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────────────────────
describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument()
  })

  it('fires onClick', () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>Go</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders iconLeft and iconRight', () => {
    render(
      <Button iconLeft={<span data-testid="left" />} iconRight={<span data-testid="right" />}>
        Label
      </Button>,
    )
    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it.each(['solid', 'outline', 'ghost', 'link', 'accent'] as const)(
    'renders %s variant without crashing',
    (variant) => {
      render(<Button variant={variant}>V</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    },
  )

  it.each(['sm', 'md', 'lg'] as const)('renders size=%s without crashing', (size) => {
    render(<Button size={size}>S</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('adds w-full class when fullWidth is true', () => {
    render(<Button fullWidth>FW</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it.each(['default', 'accent', 'flat'] as const)('renders tone=%s without crashing', (tone) => {
    const { container } = render(<Card tone={tone}>T</Card>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it.each(['sm', 'md', 'lg', 'xl'] as const)('renders radius=%s without crashing', (radius) => {
    const { container } = render(<Card radius={radius}>R</Card>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it.each(['none', 'sm', 'md', 'lg'] as const)('renders padding=%s without crashing', (padding) => {
    const { container } = render(<Card padding={padding}>P</Card>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Card className="my-custom">C</Card>)
    expect(container.firstChild).toHaveClass('my-custom')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox
// ─────────────────────────────────────────────────────────────────────────────
describe('Checkbox', () => {
  it('renders label text', () => {
    render(<Checkbox label="Accept" checked={false} onChange={() => {}} />)
    expect(screen.getByText('Accept')).toBeInTheDocument()
  })

  it('reflects checked state', () => {
    render(<Checkbox label="Check" checked={true} onChange={() => {}} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('reflects unchecked state', () => {
    render(<Checkbox label="Check" checked={false} onChange={() => {}} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('calls onChange with new value', () => {
    const handler = vi.fn()
    render(<Checkbox label="Toggle" checked={false} onChange={handler} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(handler).toHaveBeenCalledWith(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Chip
// ─────────────────────────────────────────────────────────────────────────────
describe('Chip', () => {
  it('renders children', () => {
    render(<Chip>Tag</Chip>)
    expect(screen.getByText('Tag')).toBeInTheDocument()
  })

  it('fires onClick', () => {
    const handler = vi.fn()
    render(<Chip onClick={handler}>Click</Chip>)
    fireEvent.click(screen.getByText('Click'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<Chip disabled>Nope</Chip>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it.each(['default', 'selected'] as const)('renders variant=%s without crashing', (variant) => {
    render(<Chip variant={variant}>V</Chip>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders iconLeft', () => {
    render(<Chip iconLeft={<span data-testid="icon" />}>With icon</Chip>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Divider
// ─────────────────────────────────────────────────────────────────────────────
describe('Divider', () => {
  it('renders horizontal divider by default', () => {
    const { container } = render(<Divider />)
    const el = container.firstChild as HTMLElement
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('w-full', 'h-px')
  })

  it('renders vertical divider', () => {
    const { container } = render(<Divider orientation="vertical" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('w-px')
  })

  it('applies custom className', () => {
    const { container } = render(<Divider className="my-divider" />)
    expect(container.firstChild).toHaveClass('my-divider')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MenuItem
// ─────────────────────────────────────────────────────────────────────────────
describe('MenuItem', () => {
  it('renders name', () => {
    render(<MenuItem icon={<span />} name="Dashboard" onClick={() => {}} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('fires onClick', () => {
    const handler = vi.fn()
    render(<MenuItem icon={<span />} name="Item" onClick={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<MenuItem icon={<span />} name="Off" disabled onClick={() => {}} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders source when provided', () => {
    render(<MenuItem icon={<span />} name="Item" source="Notion" onClick={() => {}} />)
    expect(screen.getByText('Notion')).toBeInTheDocument()
  })

  it('renders label when provided and selected', () => {
    render(<MenuItem icon={<span />} name="Item" label="New" selected onClick={() => {}} />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('fires onMouseEnter', () => {
    const handler = vi.fn()
    render(<MenuItem icon={<span />} name="Hover" onClick={() => {}} onMouseEnter={handler} />)
    fireEvent.mouseEnter(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────────────
describe('Panel', () => {
  it('renders children', () => {
    render(<Panel onClose={() => {}}>Panel content</Panel>)
    expect(screen.getByText('Panel content')).toBeInTheDocument()
  })

  it('calls onClose after clicking the backdrop', async () => {
    vi.useFakeTimers()
    const handler = vi.fn()
    const { container } = render(<Panel onClose={handler}>Content</Panel>)
    // The backdrop is the first fixed inset-0 div
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement
    fireEvent.click(backdrop)
    vi.advanceTimersByTime(200)
    expect(handler).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PanelHeader
// ─────────────────────────────────────────────────────────────────────────────
describe('PanelHeader', () => {
  it('renders title', () => {
    render(<PanelHeader title="Settings" onClose={() => {}} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const handler = vi.fn()
    render(<PanelHeader title="Header" onClose={handler} />)
    // The close button is an IconButton with icon="X"
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('renders back button and calls onBack', () => {
    const backHandler = vi.fn()
    render(<PanelHeader title="Sub" onClose={() => {}} onBack={backHandler} />)
    const buttons = screen.getAllByRole('button')
    // Back button is first
    fireEvent.click(buttons[0])
    expect(backHandler).toHaveBeenCalledTimes(1)
  })

  it('renders actions slot', () => {
    render(
      <PanelHeader
        title="H"
        onClose={() => {}}
        actions={<button data-testid="action-btn">Action</button>}
      />,
    )
    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SettingsSection
// ─────────────────────────────────────────────────────────────────────────────
describe('SettingsSection', () => {
  it('renders label', () => {
    render(<SettingsSection label="General">child</SettingsSection>)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<SettingsSection label="Sec"><span>Row</span></SettingsSection>)
    expect(screen.getByText('Row')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <SettingsSection label="L" className="custom-sec">child</SettingsSection>,
    )
    expect(container.firstChild).toHaveClass('custom-sec')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Slider
// ─────────────────────────────────────────────────────────────────────────────
describe('Slider', () => {
  it('renders label', () => {
    render(<Slider label="Opacity" value={50} min={0} max={100} onChange={() => {}} />)
    expect(screen.getByText('Opacity')).toBeInTheDocument()
  })

  it('shows current value with unit', () => {
    render(<Slider label="Size" value={12} min={0} max={100} onChange={() => {}} unit="px" />)
    expect(screen.getByText('12px')).toBeInTheDocument()
  })

  it('calls onChange with numeric value', () => {
    const handler = vi.fn()
    render(<Slider label="L" value={10} min={0} max={100} onChange={handler} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '42' } })
    expect(handler).toHaveBeenCalledWith(42)
  })

  it('renders range input with correct min/max', () => {
    render(<Slider label="L" value={5} min={1} max={20} onChange={() => {}} />)
    const input = screen.getByRole('slider') as HTMLInputElement
    expect(input.min).toBe('1')
    expect(input.max).toBe('20')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Spacer
// ─────────────────────────────────────────────────────────────────────────────
describe('Spacer', () => {
  it('renders a span with aria-hidden', () => {
    const { container } = render(<Spacer />)
    const el = container.querySelector('span[aria-hidden]') as HTMLElement
    expect(el).toBeInTheDocument()
  })

  it('applies vertical height for default orientation', () => {
    const { container } = render(<Spacer size="md" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveStyle({ height: '16px' })
  })

  it('applies horizontal width when horizontal=true', () => {
    const { container } = render(<Spacer horizontal />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveStyle({ width: '16px' })
  })

  it('respects custom px value', () => {
    const { container } = render(<Spacer px={99} />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveStyle({ height: '99px' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Stat
// ─────────────────────────────────────────────────────────────────────────────
describe('Stat', () => {
  it('renders value and label', () => {
    render(<Stat value="72" label="Temp" />)
    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('Temp')).toBeInTheDocument()
  })

  it('renders unit when provided', () => {
    render(<Stat value="72" label="Temp" unit="°F" />)
    expect(screen.getByText('°F')).toBeInTheDocument()
  })

  it('does not render unit when omitted', () => {
    render(<Stat value="72" label="Temp" />)
    expect(screen.queryByText('°F')).not.toBeInTheDocument()
  })

  it.each(['sm', 'md', 'lg'] as const)('renders size=%s without crashing', (size) => {
    render(<Stat value="5" label="L" size={size} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Toggle
// ─────────────────────────────────────────────────────────────────────────────
describe('Toggle', () => {
  it('renders label', () => {
    render(<Toggle value={false} label="Dark mode" onChange={() => {}} />)
    expect(screen.getByText('Dark mode')).toBeInTheDocument()
  })

  it('calls onChange with toggled value when off', () => {
    const handler = vi.fn()
    render(<Toggle value={false} label="T" onChange={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledWith(true)
  })

  it('calls onChange with toggled value when on', () => {
    const handler = vi.fn()
    render(<Toggle value={true} label="T" onChange={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledWith(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Icon
// ─────────────────────────────────────────────────────────────────────────────
describe('Icon', () => {
  it('renders a known Phosphor icon without crashing', () => {
    // "House" is a standard Phosphor icon
    const { container } = render(<Icon icon="House" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('returns null for unknown icon names', () => {
    const { container } = render(<Icon icon="NonExistentIconXYZ" />)
    expect(container.firstChild).toBeNull()
  })

  it('accepts a custom component', () => {
    const CustomIcon = () => <svg data-testid="custom-svg" />
    render(<Icon icon={CustomIcon} />)
    expect(screen.getByTestId('custom-svg')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// IconButton
// ─────────────────────────────────────────────────────────────────────────────
describe('IconButton', () => {
  it('renders without crashing', () => {
    render(<IconButton icon="House" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('fires onClick', () => {
    const handler = vi.fn()
    render(<IconButton icon="House" onClick={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<IconButton icon="House" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders title attribute', () => {
    render(<IconButton icon="House" title="Home" />)
    expect(screen.getByTitle('Home')).toBeInTheDocument()
  })

  it.each(['default', 'active', 'ghost'] as const)('renders variant=%s without crashing', (variant) => {
    render(<IconButton icon="House" variant={variant} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it.each(['sm', 'md', 'lg', 'xl'] as const)('renders size=%s without crashing', (size) => {
    render(<IconButton icon="House" size={size} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────────
describe('Input', () => {
  it('renders without crashing', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('associates label with input via htmlFor', () => {
    render(<Input label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toBeInTheDocument()
  })

  it('renders hint text', () => {
    render(<Input hint="Enter your email" />)
    expect(screen.getByText('Enter your email')).toBeInTheDocument()
  })

  it('renders error and hides hint', () => {
    render(<Input hint="Hint" error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.queryByText('Hint')).not.toBeInTheDocument()
  })

  it('renders iconLeft and iconRight', () => {
    render(
      <Input
        iconLeft={<span data-testid="il" />}
        iconRight={<span data-testid="ir" />}
      />,
    )
    expect(screen.getByTestId('il')).toBeInTheDocument()
    expect(screen.getByTestId('ir')).toBeInTheDocument()
  })

  it('fires onChange', () => {
    const handler = vi.fn()
    render(<Input onChange={handler} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it.each(['sm', 'md', 'lg'] as const)('renders size=%s without crashing', (size) => {
    render(<Input size={size} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SegmentedControl
// ─────────────────────────────────────────────────────────────────────────────
describe('SegmentedControl', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ]

  it('renders all option labels', () => {
    render(<SegmentedControl value="a" options={options} onChange={() => {}} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  it('calls onChange with clicked option value', () => {
    const handler = vi.fn()
    render(<SegmentedControl value="a" options={options} onChange={handler} />)
    fireEvent.click(screen.getByText('Option B'))
    expect(handler).toHaveBeenCalledWith('b')
  })

  it('marks active segment with correct class', () => {
    render(<SegmentedControl value="b" options={options} onChange={() => {}} />)
    const activeBtn = screen.getByText('Option B').closest('button')
    expect(activeBtn).toHaveClass('wt-seg-active')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Container
// ─────────────────────────────────────────────────────────────────────────────
describe('Container', () => {
  it('renders children', () => {
    render(<Container>Widget content</Container>)
    expect(screen.getByText('Widget content')).toBeInTheDocument()
  })

  it('applies base classes', () => {
    const { container } = render(<Container>C</Container>)
    const div = container.firstChild as HTMLElement
    expect(div).toHaveClass('w-full', 'h-full', 'box-border', 'select-none')
  })

  it('forwards additional className', () => {
    const { container } = render(<Container className="extra">C</Container>)
    expect(container.firstChild).toHaveClass('extra')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// WidgetSizeContext
// ─────────────────────────────────────────────────────────────────────────────
describe('WidgetSizeContext', () => {
  it('provides default 0x0 size', () => {
    const Consumer = () => {
      const size = useWidgetSizeContext()
      return <span>{`${size.containerWidth}x${size.containerHeight}`}</span>
    }
    render(<Consumer />)
    expect(screen.getByText('0x0')).toBeInTheDocument()
  })

  it('provides overridden values from Provider', () => {
    const Consumer = () => {
      const size = useWidgetSizeContext()
      return <span>{`${size.containerWidth}x${size.containerHeight}`}</span>
    }
    render(
      <WidgetSizeContext.Provider value={{ containerWidth: 320, containerHeight: 240 }}>
        <Consumer />
      </WidgetSizeContext.Provider>,
    )
    expect(screen.getByText('320x240')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flex / FlexRow / FlexCol
// ─────────────────────────────────────────────────────────────────────────────
describe('Flex', () => {
  it('renders children', () => {
    render(<Flex>Row content</Flex>)
    expect(screen.getByText('Row content')).toBeInTheDocument()
  })

  it('applies flex class', () => {
    const { container } = render(<Flex>C</Flex>)
    expect(container.firstChild).toHaveClass('flex')
  })

  it('renders with col direction', () => {
    const { container } = render(<Flex dir="col">C</Flex>)
    expect(container.firstChild).toHaveClass('flex-col')
  })

  it('applies gap class', () => {
    const { container } = render(<Flex gap="md">C</Flex>)
    expect(container.firstChild).toHaveClass('gap-4')
  })

  it('applies wrap class', () => {
    const { container } = render(<Flex wrap>C</Flex>)
    expect(container.firstChild).toHaveClass('flex-wrap')
  })

  it('applies h-full when fullHeight', () => {
    const { container } = render(<Flex fullHeight>C</Flex>)
    expect(container.firstChild).toHaveClass('h-full')
  })

  it('fires onClick', () => {
    const handler = vi.fn()
    render(<Flex onClick={handler}>Click</Flex>)
    fireEvent.click(screen.getByText('Click'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('renders as custom tag', () => {
    render(<Flex as="section">Sec</Flex>)
    expect(screen.getByText('Sec').tagName).toBe('SECTION')
  })
})

describe('FlexRow', () => {
  it('renders children', () => {
    render(<FlexRow>Row</FlexRow>)
    expect(screen.getByText('Row')).toBeInTheDocument()
  })

  it('has flex-row class', () => {
    const { container } = render(<FlexRow>R</FlexRow>)
    expect(container.firstChild).toHaveClass('flex-row')
  })
})

describe('FlexCol', () => {
  it('renders children', () => {
    render(<FlexCol>Col</FlexCol>)
    expect(screen.getByText('Col')).toBeInTheDocument()
  })

  it('has flex-col class', () => {
    const { container } = render(<FlexCol>C</FlexCol>)
    expect(container.firstChild).toHaveClass('flex-col')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Grid
// ─────────────────────────────────────────────────────────────────────────────
describe('Grid', () => {
  it('renders children', () => {
    render(<Grid>Grid content</Grid>)
    expect(screen.getByText('Grid content')).toBeInTheDocument()
  })

  it('applies grid class', () => {
    const { container } = render(<Grid>C</Grid>)
    expect(container.firstChild).toHaveClass('grid')
  })

  it('applies cols class for cols=2', () => {
    const { container } = render(<Grid cols={2}>C</Grid>)
    expect(container.firstChild).toHaveClass('grid-cols-2')
  })

  it('applies gap class', () => {
    const { container } = render(<Grid gap="sm">C</Grid>)
    expect(container.firstChild).toHaveClass('gap-2')
  })

  it('applies h-full when fullHeight', () => {
    const { container } = render(<Grid fullHeight>C</Grid>)
    expect(container.firstChild).toHaveClass('h-full')
  })

  it('renders as custom tag', () => {
    render(<Grid as="section">Sec</Grid>)
    expect(screen.getByText('Sec').tagName).toBe('SECTION')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Box
// ─────────────────────────────────────────────────────────────────────────────
describe('Box', () => {
  it('renders children', () => {
    render(<Box>Box content</Box>)
    expect(screen.getByText('Box content')).toBeInTheDocument()
  })

  it('applies overflow class', () => {
    const { container } = render(<Box overflow="hidden">C</Box>)
    expect(container.firstChild).toHaveClass('overflow-hidden')
  })

  it('applies w-full when fullWidth', () => {
    const { container } = render(<Box fullWidth>C</Box>)
    expect(container.firstChild).toHaveClass('w-full')
  })

  it('applies h-full when fullHeight', () => {
    const { container } = render(<Box fullHeight>C</Box>)
    expect(container.firstChild).toHaveClass('h-full')
  })

  it('fires onClick', () => {
    const handler = vi.fn()
    render(<Box onClick={handler}>Click</Box>)
    fireEvent.click(screen.getByText('Click'))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Center
// ─────────────────────────────────────────────────────────────────────────────
describe('Center', () => {
  it('renders children', () => {
    render(<Center>Centered</Center>)
    expect(screen.getByText('Centered')).toBeInTheDocument()
  })

  it('applies items-center and justify-center', () => {
    const { container } = render(<Center>C</Center>)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('items-center', 'justify-center')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ScrollArea
// ─────────────────────────────────────────────────────────────────────────────
describe('ScrollArea', () => {
  it('renders children', () => {
    render(<ScrollArea>Content</ScrollArea>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies overflow-y-auto for axis=y by default', () => {
    const { container } = render(<ScrollArea>C</ScrollArea>)
    expect(container.firstChild).toHaveClass('overflow-y-auto')
  })

  it('applies overflow-x-auto for axis=x', () => {
    const { container } = render(<ScrollArea axis="x">C</ScrollArea>)
    expect(container.firstChild).toHaveClass('overflow-x-auto')
  })

  it('applies overflow-auto for axis=both', () => {
    const { container } = render(<ScrollArea axis="both">C</ScrollArea>)
    expect(container.firstChild).toHaveClass('overflow-auto')
  })

  it('applies flex-1 by default', () => {
    const { container } = render(<ScrollArea>C</ScrollArea>)
    expect(container.firstChild).toHaveClass('flex-1')
  })

  it('omits flex-1 when flex1=false', () => {
    const { container } = render(<ScrollArea flex1={false}>C</ScrollArea>)
    expect(container.firstChild).not.toHaveClass('flex-1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// widgetTokens (pure JS — no rendering needed)
// ─────────────────────────────────────────────────────────────────────────────
describe('widgetTokens', () => {
  describe('widgetBreakpoints', () => {
    it('has expected breakpoint values', () => {
      expect(widgetBreakpoints.xs).toBe(160)
      expect(widgetBreakpoints.sm).toBe(240)
      expect(widgetBreakpoints.md).toBe(360)
      expect(widgetBreakpoints.lg).toBe(480)
      expect(widgetBreakpoints.xl).toBe(640)
    })
  })

  describe('widgetSizing', () => {
    it('has expected sizing constraints', () => {
      expect(widgetSizing.minWidth).toBe(160)
      expect(widgetSizing.minHeight).toBe(120)
      expect(widgetSizing.maxWidth).toBe(1600)
      expect(widgetSizing.maxHeight).toBe(1200)
    })
  })

  describe('getBreakpoint', () => {
    it('returns xs for width < sm', () => {
      expect(getBreakpoint(100)).toBe('xs')
      expect(getBreakpoint(159)).toBe('xs')
    })
    it('returns sm for width >= sm and < md', () => {
      expect(getBreakpoint(240)).toBe('sm')
      expect(getBreakpoint(300)).toBe('sm')
    })
    it('returns md for width >= md and < lg', () => {
      expect(getBreakpoint(360)).toBe('md')
    })
    it('returns lg for width >= lg and < xl', () => {
      expect(getBreakpoint(480)).toBe('lg')
    })
    it('returns xl for width >= xl', () => {
      expect(getBreakpoint(640)).toBe('xl')
      expect(getBreakpoint(1000)).toBe('xl')
    })
  })

  describe('WIDGET_SHAPES', () => {
    it('contains small-square shape with correct dimensions', () => {
      expect(WIDGET_SHAPES['small-square'].width).toBe(200)
      expect(WIDGET_SHAPES['small-square'].height).toBe(200)
    })

    it('every shape has id, width, height, label', () => {
      for (const shape of Object.values(WIDGET_SHAPES)) {
        expect(shape.id).toBeTruthy()
        expect(typeof shape.width).toBe('number')
        expect(typeof shape.height).toBe('number')
        expect(shape.label).toBeTruthy()
      }
    })
  })
})
