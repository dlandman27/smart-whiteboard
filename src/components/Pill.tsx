import React from 'react'
import { cn } from '@whiteboard/ui-kit'

type Props = React.HTMLAttributes<HTMLDivElement>

export const Pill = React.forwardRef<HTMLDivElement, Props>(({ className, children, ...rest }, ref) => {
  return (
    <div ref={ref} className={cn('wt-pill rounded-2xl', className)} {...rest}>
      {children}
    </div>
  )
})
