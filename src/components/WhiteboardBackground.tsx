import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Background } from '../constants/backgrounds'
import { useThemeStore } from '../store/theme'
import { THEME_MAP } from '../themes/presets'
import { apiFetch } from '../lib/apiFetch'

interface Props {
  background: Background
  children:   React.ReactNode
}

interface PhotoItem {
  id:        string
  baseUrl:   string
  width:     number
  height:    number
  description: string
}

function getBgStyle(b: Background, themeBg: Background): React.CSSProperties {
  const pattern = b.pattern ?? 'dots'
  // For pattern backgrounds (not solid/gradient/image/photos), use theme's bg/dot colors
  const isCustomColor = pattern === 'solid' || pattern === 'gradient' || pattern === 'image' || pattern === 'photos'
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

    case 'photos':
      return { backgroundColor: '#0a0a0a' }

    case 'dots':
    default:
      return {
        backgroundColor: bg,
        backgroundSize:  '28px 28px',
        backgroundImage: `radial-gradient(circle, ${dot} 1.5px, transparent 1.5px)`,
      }
  }
}

// ── Photos slideshow background ─────────────────────────────────────────────

function PhotosSlideshow({ albumId, interval, dim }: { albumId?: string; interval: number; dim: number }) {
  const [photos, setPhotos]       = useState<PhotoItem[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [slotA, setSlotA]         = useState<string | null>(null)
  const [slotB, setSlotB]         = useState<string | null>(null)
  const [showA, setShowA]         = useState(true)
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check connection
  useEffect(() => {
    apiFetch<{ connected: boolean }>('/api/gphotos/status')
      .then((d) => setConnected(d?.connected ?? false))
      .catch(() => setConnected(false))
  }, [])

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (albumId) params.set('albumId', albumId)
      const data = await apiFetch<{ items: PhotoItem[] }>(`/api/gphotos/photos?${params}`)
      if (data?.items?.length) setPhotos(data.items)
    } catch { /* ignore */ }
  }, [albumId])

  useEffect(() => {
    if (!connected) return
    fetchPhotos()
    // Refresh URLs every 45 minutes (they expire after ~60 min)
    refreshTimer.current = setInterval(fetchPhotos, 45 * 60_000)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [connected, fetchPhotos])

  // Set initial image once photos are loaded
  useEffect(() => {
    if (photos.length > 0) {
      setSlotA(`${photos[0].baseUrl}=w1920-h1080`)
      setActiveIdx(0)
      setShowA(true)
    }
  }, [photos])

  // Slideshow rotation with cross-fade
  useEffect(() => {
    if (photos.length <= 1) return
    const id = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % photos.length
        const nextUrl = `${photos[next].baseUrl}=w1920-h1080`
        // Load into the hidden slot, then flip
        if (showA) {
          setSlotB(nextUrl)
          setTimeout(() => setShowA(false), 50)
        } else {
          setSlotA(nextUrl)
          setTimeout(() => setShowA(true), 50)
        }
        return next
      })
    }, interval * 1000)
    return () => clearInterval(id)
  }, [photos, interval, showA])

  // Not connected — fall back to dark bg
  if (connected === false) {
    return null
  }

  // Loading state
  if (connected === null || photos.length === 0) {
    return (
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          className="animate-pulse"
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.05em',
          }}
        >
          {connected === null ? 'Connecting...' : 'Loading photos...'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {/* Slot A */}
      {slotA && (
        <img
          src={slotA}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            transition: 'opacity 1s ease-in-out',
            opacity: showA ? 1 : 0,
          }}
        />
      )}
      {/* Slot B */}
      {slotB && (
        <img
          src={slotB}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            transition: 'opacity 1s ease-in-out',
            opacity: showA ? 0 : 1,
          }}
        />
      )}
      {/* Dim overlay */}
      {dim > 0 && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${dim})`, pointerEvents: 'none' }} />
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function WhiteboardBackground({ background, children }: Props) {
  const activeThemeId = useThemeStore((s) => s.activeThemeId)
  const themeBg = THEME_MAP[activeThemeId]?.background ?? background
  const pattern = background.pattern ?? 'dots'
  const dim = (pattern === 'image' || pattern === 'photos') ? (background.imageDim ?? 0) : 0

  return (
    <div className="relative w-full h-full" style={{ ...getBgStyle(background, themeBg), transition: 'background-color 0.4s ease, background 0.4s ease' }}>
      {/* Photos slideshow background */}
      {pattern === 'photos' && (
        <PhotosSlideshow
          albumId={background.albumId}
          interval={background.photoInterval ?? 30}
          dim={dim}
        />
      )}

      {/* Dim overlay for image backgrounds */}
      {pattern === 'image' && dim > 0 && (
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

      {/* Board content — above slideshow */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  )
}
