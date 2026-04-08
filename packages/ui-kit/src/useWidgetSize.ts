import { useEffect, useRef, useState } from 'react'

export interface WidgetSize {
  containerWidth:  number
  containerHeight: number
}

/**
 * Attaches a single ResizeObserver to the given ref element and returns
 * the current content rect dimensions. Initial values are 0 × 0 until
 * the first observation fires.
 */
export function useWidgetSize(ref: React.RefObject<Element | null>): WidgetSize {
  const [containerWidth,  setWidth]  = useState(0)
  const [containerHeight, setHeight] = useState(0)
  const initialized = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Read initial size synchronously on first mount to avoid a layout flash
    if (!initialized.current) {
      const rect = el.getBoundingClientRect()
      setWidth(rect.width)
      setHeight(rect.height)
      initialized.current = true
    }

    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
      setHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return { containerWidth, containerHeight }
}
