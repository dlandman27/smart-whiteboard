import { fontFamily } from './theme/primitives'

export interface StatProps {
  /** Descriptive label shown below the value */
  label:     string
  /** The primary value to display */
  value:     string | number
  /** Optional unit string shown next to the value (e.g. '°F', 'km/h') */
  unit?:     string
  /** Overall size preset */
  size?:     'sm' | 'md' | 'lg'
  className?: string
  style?:    React.CSSProperties
}

const VALUE_SIZES: Record<NonNullable<StatProps['size']>, number> = { sm: 24, md: 40, lg: 64 }
const LABEL_SIZES: Record<NonNullable<StatProps['size']>, number> = { sm: 10, md: 12, lg: 13 }
const UNIT_SIZES:  Record<NonNullable<StatProps['size']>, number> = { sm: 12, md: 16, lg: 20 }

/**
 * A label + value pair — the shared presentation pattern used by Weather, Countdown,
 * and other data-display widgets.
 */
export function Stat({ label, value, unit, size = 'md', className, style }: StatProps) {
  const valSize  = VALUE_SIZES[size]
  const labSize  = LABEL_SIZES[size]
  const unitSize = UNIT_SIZES[size]

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, ...style }}
    >
      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span
          style={{
            fontSize:           valSize,
            lineHeight:         1,
            fontFamily:         fontFamily.base,
            fontWeight:         '300',
            fontVariantNumeric: 'tabular-nums',
            color:              'var(--wt-text)',
            letterSpacing:      '-0.02em',
          }}
        >
          {value}
        </span>

        {unit && (
          <span
            style={{
              fontSize:   unitSize,
              fontFamily: fontFamily.base,
              fontWeight: '400',
              color:      'var(--wt-text-muted)',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize:      labSize,
          fontFamily:    fontFamily.base,
          fontWeight:    500,
          color:         'var(--wt-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
    </div>
  )
}
