import React from 'react'
import { cn } from '../ui/web/utils/cn'

type Props = React.HTMLAttributes<HTMLDivElement>

export function Pill({ className, children, ...rest }: Props) {
  return (
    <div className={cn('wt-pill border rounded-2xl', className)} {...rest}>
      {children}
    </div>
  )
}
