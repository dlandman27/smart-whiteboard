import React, { useState, useCallback } from 'react'
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
    const [closing, setClosing] = useState(false)

    const handleClose = useCallback(() => {
      if (closing) return
      setClosing(true)
      setTimeout(onClose, 150)
    }, [closing, onClose])

    return (
      <>
        <div
          className="fixed inset-0 z-[10000]"
          style={{
            background:      'rgba(0,0,0,0.4)',
            backdropFilter:  'blur(2px)',
            animation:       closing ? 'panelFadeOut 0.15s ease-out forwards' : 'panelFadeIn 0.15s ease-out',
          }}
          onClick={handleClose}
        />
        <div
          ref={ref}
          className={cn('fixed top-1/2 left-1/2 z-[10001] rounded-2xl overflow-hidden', className)}
          style={{
            transform:       'translate(-50%, -50%)',
            width,
            maxHeight,
            overflowY:       maxHeight ? 'auto' : undefined,
            backgroundColor: 'var(--wt-settings-bg)',
            border:          '1px solid var(--wt-settings-border)',
            boxShadow:       'var(--wt-shadow-lg)',
            backdropFilter:  'var(--wt-backdrop)',
            animation:       closing ? 'panelOut 0.15s ease-out forwards' : 'panelIn 0.15s ease-out',
            ...style,
          }}
        >
          {children}
        </div>
      </>
    )
  }
)
