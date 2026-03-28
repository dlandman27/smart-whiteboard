import React from 'react'
import { cn } from './utils/cn'

interface Props {
  onClose:    () => void
  width?:     number
  maxHeight?: string | number
  className?: string
  style?:     React.CSSProperties
  children:   React.ReactNode
}

export const Panel = React.forwardRef<HTMLDivElement, Props>(
  function Panel({ onClose, width = 480, maxHeight, className, style, children }, ref) {
    return (
      <>
        <div className="fixed inset-0 z-[10000]" onClick={onClose} />
        <div
          ref={ref}
          className={cn('fixed bottom-20 left-1/2 z-[10001] rounded-2xl overflow-hidden', className)}
          style={{
            transform:       'translateX(-50%)',
            width,
            maxHeight,
            overflowY:       maxHeight ? 'auto' : undefined,
            backgroundColor: 'var(--wt-settings-bg)',
            border:          '1px solid var(--wt-settings-border)',
            boxShadow:       'var(--wt-shadow-lg)',
            backdropFilter:  'var(--wt-backdrop)',
            animation:       'slideUp 0.15s ease-out',
            ...style,
          }}
        >
          {children}
        </div>
      </>
    )
  }
)
