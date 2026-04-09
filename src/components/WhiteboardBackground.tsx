import React from 'react'
import type { Background } from '../constants/backgrounds'
import { useThemeStore } from '../store/theme'
import { THEME_MAP } from '../themes/presets'

interface Props {
  background: Background
  children:   React.ReactNode
}

function getBgStyle(b: Background, themeBg: Background): React.CSSProperties {
  const pattern = b.pattern ?? 'dots'
  // For pattern backgrounds (not solid/gradient/image), use theme's bg/dot colors
  const isCustomColor = pattern === 'solid' || pattern === 'gradient' || pattern === 'image'
  const bg  = isCustomColor ? b.bg  : (themeBg.bg  ?? b.bg)
  const dot = isCustomColor ? b.dot : (themeBg.dot ?? b.dot)

  switch (pattern) {
    case 'solid':
      return { backgroundColor: bg }

    case 'gradient':
      return {
        background: `linear-gradient(135deg, ${bg} 0%, ${b.gradientTo ?? bg} 100%)`,
      }

    case 'lines':
      return {
        backgroundColor: bg,
        backgroundSize:  '100% 28px',
        backgroundImage: `linear-gradient(transparent 27px, ${dot} 27px)`,
      }

    case 'grid':
      return {
        backgroundColor: bg,
        backgroundSize:  '28px 28px',
        backgroundImage: [
          `linear-gradient(${dot} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${dot} 1px, transparent 1px)`,
        ].join(', '),
      }

    case 'image':
      return {
        backgroundColor:   '#000',
        backgroundImage:   b.imageUrl ? `url(${b.imageUrl})` : undefined,
        backgroundSize:    'cover',
        backgroundPosition:'center',
        backgroundRepeat:  'no-repeat',
      }

    case 'dots':
    default:
      return {
        backgroundColor: bg,
        backgroundSize:  '28px 28px',
        backgroundImage: `radial-gradient(circle, ${dot} 1.5px, transparent 1.5px)`,
      }
  }
}

export function WhiteboardBackground({ background, children }: Props) {
  const activeThemeId = useThemeStore((s) => s.activeThemeId)
  const themeBg = THEME_MAP[activeThemeId]?.background ?? background
  const dim = background.pattern === 'image' ? (background.imageDim ?? 0) : 0

  return (
    <div className="relative w-full h-full" style={{ ...getBgStyle(background, themeBg), transition: 'background-color 0.4s ease, background 0.4s ease' }}>
      {/* Dim overlay for image backgrounds */}
      {dim > 0 && (
        <div
          style={{
            position:        'absolute',
            inset:           0,
            backgroundColor: `rgba(0,0,0,${dim})`,
            pointerEvents:   'none',
            zIndex:          0,
          }}
        />
      )}
      {children}
    </div>
  )
}
