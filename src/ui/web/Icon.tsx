import * as PhosphorIcons from '@phosphor-icons/react'
import type { IconWeight } from '@phosphor-icons/react'

export type CustomIcon = React.ComponentType<{ size?: number; weight?: IconWeight; className?: string; style?: React.CSSProperties }>
export type IconProp   = string | CustomIcon

interface Props {
  icon:       IconProp
  size?:      number
  weight?:    IconWeight
  className?: string
  style?:     React.CSSProperties
}

export function Icon({ icon, size = 16, weight = 'regular', className, style }: Props) {
  const IconComponent = typeof icon === 'string'
    ? (PhosphorIcons as Record<string, unknown>)[icon] as CustomIcon | undefined
    : icon

  if (!IconComponent) {
    if (import.meta.env.DEV) console.warn(`[Icon] Unknown Phosphor icon: "${icon}"`)
    return null
  }

  return <IconComponent size={size} weight={weight} className={className} style={style} />
}
