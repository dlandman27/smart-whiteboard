import { Flex, type FlexProps } from './Flex'

// Center: always aligns and justifies to center.
// Defaults to col direction (most common for widget empty/loading states).
export type CenterProps = Omit<FlexProps, 'align' | 'justify'>

export function Center({ dir = 'col', ...props }: CenterProps) {
  return <Flex {...props} dir={dir} align="center" justify="center" />
}
