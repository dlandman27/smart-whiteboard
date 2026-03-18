import { cn } from './utils/cn'

interface Props {
  orientation?: 'horizontal' | 'vertical'
  className?:   string
}

export function Divider({ orientation = 'horizontal', className }: Props) {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn('w-px self-stretch flex-shrink-0', className)}
        style={{ backgroundColor: 'var(--wt-border)' }}
      />
    )
  }
  return (
    <div
      className={cn('w-full h-px flex-shrink-0', className)}
      style={{ backgroundColor: 'var(--wt-border)' }}
    />
  )
}
