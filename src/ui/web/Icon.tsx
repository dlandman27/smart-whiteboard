import { type LucideIcon } from 'lucide-react'

interface Props {
  icon:       LucideIcon
  size?:      number
  className?: string
}

export function Icon({ icon: IconComponent, size = 16, className }: Props) {
  return <IconComponent size={size} className={className} />
}
