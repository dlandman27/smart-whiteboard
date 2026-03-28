interface Props {
  label:    string
  value:    number
  min:      number
  max:      number
  onChange: (value: number) => void
  unit?:    string
}

export function Slider({ label, value, min, max, onChange, unit = 'px' }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--wt-settings-label)' }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--wt-accent)]"
      />
      <span className="w-10 text-right tabular-nums text-xs" style={{ color: 'var(--wt-text-muted)' }}>
        {value}{unit}
      </span>
    </div>
  )
}
