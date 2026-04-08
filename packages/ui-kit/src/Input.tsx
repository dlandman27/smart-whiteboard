import React from 'react'
import { cn } from './utils/cn'

export type InputSize = 'sm' | 'md' | 'lg'

const sizeClass: Record<InputSize, string> = {
  sm: 'h-8  text-xs  px-2.5 py-1.5',
  md: 'h-9  text-sm  px-3   py-2',
  lg: 'h-11 text-base px-4  py-2.5',
}

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  hint?:      string
  error?:     string
  size?:      InputSize
  iconLeft?:  React.ReactNode
  iconRight?: React.ReactNode
}

export function Input({
  label,
  hint,
  error,
  size      = 'md',
  iconLeft,
  iconRight,
  className,
  id,
  onPointerDown,
  style,
  ...props
}: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium" style={{ color: 'var(--wt-text-muted)' }}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {iconLeft && (
          <span className="absolute left-3 pointer-events-none flex-shrink-0" style={{ color: 'var(--wt-text-muted)' }}>
            {iconLeft}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full font-sans rounded-lg border outline-none transition-colors',
            sizeClass[size],
            iconLeft  && 'pl-9',
            iconRight && 'pr-9',
            className,
          )}
          style={{
            backgroundColor: 'var(--wt-bg)',
            color:           'var(--wt-text)',
            borderColor:     error ? 'var(--wt-danger)' : 'var(--wt-border)',
            ...style,
          }}
          // Stop propagation by default so inputs inside widget settings
          // panels don't accidentally trigger drag. Consumers can override.
          onPointerDown={onPointerDown ?? ((e) => e.stopPropagation())}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 pointer-events-none flex-shrink-0" style={{ color: 'var(--wt-text-muted)' }}>
            {iconRight}
          </span>
        )}
      </div>
      {error    && <p className="text-xs" style={{ color: 'var(--wt-danger)' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>{hint}</p>}
    </div>
  )
}
