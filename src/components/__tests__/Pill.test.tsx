import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@whiteboard/ui-kit', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

import { Pill } from '../Pill'

describe('Pill', () => {
  it('renders without crashing', () => {
    const { container } = render(<Pill>Test</Pill>)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders children content', () => {
    render(<Pill>My Label</Pill>)
    expect(screen.getByText('My Label')).toBeInTheDocument()
  })

  it('renders a div element', () => {
    const { container } = render(<Pill>Content</Pill>)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('includes wt-pill class by default', () => {
    const { container } = render(<Pill>Item</Pill>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('wt-pill')
  })

  it('includes rounded-2xl class by default', () => {
    const { container } = render(<Pill>Item</Pill>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('rounded-2xl')
  })

  it('merges additional className', () => {
    const { container } = render(<Pill className="bg-blue-500">Blue Pill</Pill>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('bg-blue-500')
    expect(div.className).toContain('wt-pill')
  })

  it('fires onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Pill onClick={onClick}>Clickable</Pill>)
    fireEvent.click(screen.getByText('Clickable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('forwards ref to the div', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Pill ref={ref}>Ref Test</Pill>)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.nodeName).toBe('DIV')
  })

  it('passes through HTML attributes like data-testid', () => {
    render(<Pill data-testid="my-pill">Tagged</Pill>)
    expect(screen.getByTestId('my-pill')).toBeInTheDocument()
  })

  it('passes through style prop', () => {
    render(<Pill style={{ color: 'red' }}>Styled</Pill>)
    const el = screen.getByText('Styled') as HTMLElement
    expect(el.style.color).toBe('red')
  })

  it('renders with complex children', () => {
    render(
      <Pill>
        <span>icon</span>
        <span>label</span>
      </Pill>
    )
    expect(screen.getByText('icon')).toBeInTheDocument()
    expect(screen.getByText('label')).toBeInTheDocument()
  })
})
