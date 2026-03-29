import React, { useRef } from 'react'
import { useThemeStore } from '../store/theme'
import { BACKGROUNDS, type Background, type BackgroundPattern } from '../constants/backgrounds'
import { Icon } from '../ui/web'

const PATTERN_LABELS: Record<BackgroundPattern, string> = {
  dots:     'Dots',
  lines:    'Lines',
  grid:     'Grid',
  solid:    'Solid',
  gradient: 'Gradient',
  image:    'Image',
}

const PATTERNS: BackgroundPattern[] = ['dots', 'lines', 'grid', 'solid', 'gradient', 'image']

function PatternIcon({ pattern }: { pattern: BackgroundPattern }) {
  const s       = { stroke: 'var(--wt-text)', strokeWidth: 1.2, fill: 'none' } as React.SVGProps<SVGLineElement>
  const dotFill = { fill: 'var(--wt-text)' }
  switch (pattern) {
    case 'dots':
      return (
        <svg width={16} height={16} viewBox="0 0 20 20">
          {[3,10,17].flatMap((x) => [3,10,17].map((y) =>
            <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} {...dotFill} opacity={0.6} />
          ))}
        </svg>
      )
    case 'lines':
      return (
        <svg width={16} height={16} viewBox="0 0 20 20">
          {[5,10,15].map((y) => <line key={y} x1={0} y1={y} x2={20} y2={y} {...s} opacity={0.5} />)}
        </svg>
      )
    case 'grid':
      return (
        <svg width={16} height={16} viewBox="0 0 20 20">
          {[5,10,15].map((y) => <line key={`h${y}`} x1={0} y1={y} x2={20} y2={y} {...s} opacity={0.4} />)}
          {[5,10,15].map((x) => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={20} {...s} opacity={0.4} />)}
        </svg>
      )
    case 'solid':
      return (
        <svg width={16} height={16} viewBox="0 0 20 20">
          <rect x={2} y={2} width={16} height={16} rx={3} fill="var(--wt-text)" opacity={0.15} />
        </svg>
      )
    case 'gradient':
      return (
        <svg width={16} height={16} viewBox="0 0 20 20">
          <defs>
            <linearGradient id="grad-icon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="var(--wt-accent)"    stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--wt-text-muted)" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <rect x={2} y={2} width={16} height={16} rx={3} fill="url(#grad-icon)" />
        </svg>
      )
    case 'image':
      return <Icon icon="Image" size={14} />
  }
}

function getPatternOverlay(pattern: BackgroundPattern, dot: string): React.CSSProperties {
  switch (pattern) {
    case 'dots':
      return { backgroundSize: '8px 8px', backgroundImage: `radial-gradient(circle, ${dot} 0.8px, transparent 0.8px)` }
    case 'lines':
      return { backgroundSize: '100% 8px', backgroundImage: `linear-gradient(transparent 7px, ${dot} 7px)` }
    case 'grid':
      return { backgroundSize: '8px 8px', backgroundImage: `linear-gradient(${dot} 0.5px, transparent 0.5px), linear-gradient(90deg, ${dot} 0.5px, transparent 0.5px)` }
    default:
      return {}
  }
}

function SwatchGroup({ title, backgrounds, active, onSelect }: {
  title:       string
  backgrounds: Background[]
  active:      Background
  onSelect:    (b: Background) => void
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--wt-text-muted)' }}>
        {title}
      </p>
      <div className="grid grid-cols-6 gap-2">
        {backgrounds.map((b) => {
          const isActive = active.label === b.label
          const pattern  = b.pattern ?? 'dots'
          const previewStyle: React.CSSProperties = pattern === 'gradient'
            ? { background: `linear-gradient(135deg, ${b.bg}, ${b.gradientTo ?? b.bg})` }
            : { backgroundColor: b.bg }
          return (
            <button
              key={b.label}
              onClick={() => onSelect(b)}
              title={b.label}
              className="flex flex-col items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <div
                className="w-full rounded-xl overflow-hidden"
                style={{
                  height: 36, position: 'relative',
                  ...previewStyle,
                  boxShadow: isActive
                    ? `0 0 0 2px var(--wt-accent), 0 4px 10px color-mix(in srgb, var(--wt-accent) 30%, transparent)`
                    : `0 1px 3px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.08)`,
                }}
              >
                {pattern !== 'solid' && pattern !== 'gradient' && (
                  <div style={{ position: 'absolute', inset: 0, ...getPatternOverlay(pattern, b.dot), opacity: 0.8 }} />
                )}
              </div>
              <span
                className="text-[9px] leading-none text-center w-full truncate"
                style={{ fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--wt-text)' : 'var(--wt-text-muted)' }}
              >
                {b.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function isDark(hex: string) {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128
}

function ImageSection() {
  const { background, setBackground } = useThemeStore()
  const fileRef  = useRef<HTMLInputElement>(null)
  const urlValue = background.pattern === 'image' ? (background.imageUrl ?? '') : ''
  const dimValue = background.pattern === 'image' ? (background.imageDim ?? 0) : 0

  function applyImage(imageUrl: string) {
    setBackground({ label: 'Custom Image', bg: '#000000', dot: '#000000', pattern: 'image', imageUrl, imageDim: dimValue })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) applyImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function handleUrl(e: React.ChangeEvent<HTMLInputElement>) {
    applyImage(e.target.value)
  }

  function handleDim(e: React.ChangeEvent<HTMLInputElement>) {
    const dim = parseFloat(e.target.value)
    setBackground({ ...background, pattern: 'image', imageDim: dim })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* File upload + URL input */}
      <div className="flex gap-2">
        <button
          className="wt-ibtn flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          <Icon icon="UploadSimple" size={13} />
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <input
          type="text"
          className="wt-input flex-1 rounded-lg px-3 text-xs"
          style={{ height: 34 }}
          placeholder="Or paste image URL…"
          value={urlValue}
          onChange={handleUrl}
        />
      </div>

      {/* Preview + dim control */}
      {urlValue && (
        <div className="flex flex-col gap-2">
          {/* Preview */}
          <div
            className="w-full rounded-xl overflow-hidden relative"
            style={{ height: 80 }}
          >
            <img
              src={urlValue}
              alt="background preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {dimValue > 0 && (
              <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${dimValue})` }} />
            )}
          </div>

          {/* Dim slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest w-8 flex-shrink-0" style={{ color: 'var(--wt-text-muted)' }}>
              Dim
            </span>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.05}
              value={dimValue}
              onChange={handleDim}
              className="flex-1"
              style={{ accentColor: 'var(--wt-accent)', height: 3 }}
            />
            <span className="text-[10px] w-8 text-right flex-shrink-0" style={{ color: 'var(--wt-text-muted)' }}>
              {Math.round(dimValue * 100)}%
            </span>
          </div>
        </div>
      )}

      {!urlValue && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--wt-text-muted)' }}>
          Upload a file or paste a URL to use as background
        </p>
      )}
    </div>
  )
}

export function BackgroundPicker() {
  const { background, setBackground } = useThemeStore()
  const activePattern = background.pattern ?? 'dots'

  const filtered  = BACKGROUNDS.filter((b) => (b.pattern ?? 'dots') === activePattern)
  const lightBgs  = filtered.filter((b) => !isDark(b.bg))
  const darkBgs   = filtered.filter((b) => isDark(b.bg))

  return (
    <div className="flex flex-col gap-4">
      {/* Pattern type pills */}
      <div className="flex gap-1.5 flex-wrap">
        {PATTERNS.map((p) => (
          <button
            key={p}
            onClick={() => {
              if (p === 'image') {
                setBackground({ label: 'Custom Image', bg: '#000', dot: '#000', pattern: 'image', imageUrl: background.imageUrl ?? '', imageDim: background.imageDim ?? 0 })
              } else {
                const first = BACKGROUNDS.find((b) => (b.pattern ?? 'dots') === p)
                if (first) setBackground(first)
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activePattern === p ? 'color-mix(in srgb, var(--wt-accent) 15%, var(--wt-border))' : 'var(--wt-surface)',
              color:      activePattern === p ? 'var(--wt-text)' : 'var(--wt-text-muted)',
              border:     `1px solid ${activePattern === p ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
            }}
          >
            <PatternIcon pattern={p} />
            {PATTERN_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Image controls */}
      {activePattern === 'image' && <ImageSection />}

      {/* Swatches for non-image patterns */}
      {activePattern !== 'image' && lightBgs.length > 0 && (
        <SwatchGroup title="Light" backgrounds={lightBgs} active={background} onSelect={setBackground} />
      )}
      {activePattern !== 'image' && darkBgs.length > 0 && (
        <SwatchGroup title="Dark" backgrounds={darkBgs} active={background} onSelect={setBackground} />
      )}
      {activePattern !== 'image' && lightBgs.length === 0 && darkBgs.length === 0 && filtered.length > 0 && (
        <SwatchGroup title="Presets" backgrounds={filtered} active={background} onSelect={setBackground} />
      )}
    </div>
  )
}
