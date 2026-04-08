import { useRef } from 'react'
import { WidgetSizeContext } from './WidgetSizeContext'
import { useWidgetSize } from './useWidgetSize'
import { cn } from './utils/cn'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * The root element for every widget.
 *
 * - Runs a single `ResizeObserver` and publishes `containerWidth` /
 *   `containerHeight` via `WidgetSizeContext` so any descendant can call
 *   `useWidgetSizeContext()` without duplicating observer logic.
 * - Applies `w-full h-full box-border select-none` as baseline classes;
 *   callers extend via `className` or `style`.
 */
export function Container({ children, className, ...rest }: ContainerProps) {
  const ref  = useRef<HTMLDivElement>(null)
  const size = useWidgetSize(ref)

  return (
    <WidgetSizeContext.Provider value={size}>
      <div
        ref={ref}
        className={cn('w-full h-full box-border select-none', className)}
        {...rest}
      >
        {children}
      </div>
    </WidgetSizeContext.Provider>
  )
}
