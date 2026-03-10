import React from 'react'
import { cn } from './utils/cn'

export type InputSize = 'sm' | 'md' | 'lg'

const sizeClass: Record<InputSize, string> = {
  sm: 'h-8  text-xs px-2.5 py-1.5',
  md: 'h-9  text-sm px-3   py-2',
  lg: 'h-11 text-base px-4 py-2.5',
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
  ...props
}: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-stone-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {iconLeft && (
          <span className="absolute left-3 text-stone-400 pointer-events-none flex-shrink-0">
            {iconLeft}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full font-sans rounded-lg border bg-white text-stone-900 placeholder-stone-400',
            'outline-none transition-colors',
            'focus:border-stone-400 focus:ring-2 focus:ring-stone-200',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-stone-200',
            sizeClass[size],
            iconLeft  && 'pl-9',
            iconRight && 'pr-9',
            className,
          )}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 text-stone-400 pointer-events-none flex-shrink-0">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  )
}
