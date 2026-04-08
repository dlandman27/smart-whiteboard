import { createContext, useContext } from 'react'
import type { WidgetSize } from './useWidgetSize'

const DEFAULT_SIZE: WidgetSize = { containerWidth: 0, containerHeight: 0 }

export const WidgetSizeContext = createContext<WidgetSize>(DEFAULT_SIZE)

/**
 * Returns the current container dimensions measured by the nearest ancestor
 * `<Container>` component.  Must be called inside a Container subtree.
 */
export function useWidgetSizeContext(): WidgetSize {
  return useContext(WidgetSizeContext)
}
