import { useCallback, useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Icon, SettingsSection, Toggle } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'
import { fontFamily } from '../../ui/theme'
import { DEFAULT_GIPHY_SETTINGS, type GiphyWidgetSettings } from './GiphyWidget'
import type { WidgetProps } from './registry'

// ── Giphy API types ───────────────────────────────────────────────────────────

interface GiphyImage {
  url:    string
  width:  string
  height: string
  mp4?:   string
}

interface GiphyGif {
  id:    string
  title: string
  images: {
    fixed_height:        GiphyImage
    fixed_height_small:  GiphyImage
    original:            GiphyImage
    original_mp4?:       { mp4: string; width: string; height: string }
  }
}

interface GiphyResponse {
  data:       GiphyGif[]
  pagination: { total_count: number; count: number; offset: number }
}

// ── Giphy API helpers ─────────────────────────────────────────────────────────

// Public beta key — rate-limited but works for demos.
// In production, replace with a real key via env var.
const GIPHY_API_KEY = 'dc6zaTOxFJmzC'
const GIPHY_BASE    = 'https://api.giphy.com/v1/gifs'

async function searchGiphy(query: string, offset = 0): Promise<GiphyResponse> {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    q:       query,
    limit:   '20',
    offset:  String(offset),
    rating:  'g',
    lang:    'en',
  })
  const res = await fetch(`${GIPHY_BASE}/search?${params}`)
  if (!res.ok) throw new Error(`Giphy search failed: ${res.status}`)
  return res.json() as Promise<GiphyResponse>
}

async function fetchTrending(offset = 0): Promise<GiphyResponse> {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit:   '20',
    offset:  String(offset),
    rating:  'g',
  })
  const res = await fetch(`${GIPHY_BASE}/trending?${params}`)
  if (!res.ok) throw new Error(`Giphy trending failed: ${res.status}`)
  return res.json() as Promise<GiphyResponse>
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function GifThumbnail({
  gif,
  isSelected,
  onSelect,
}: {
  gif:        GiphyGif
  isSelected: boolean
  onSelect:   (gif: GiphyGif) => void
}) {
  const [loaded, setLoaded] = useState(false)
  const thumb = gif.images.fixed_height_small

  return (
    <button
      onClick={() => onSelect(gif)}
      aria-label={gif.title || 'GIF'}
      aria-pressed={isSelected}
      style={{
        position:     'relative',
        aspectRatio:  '1 / 1',
        overflow:     'hidden',
        borderRadius: 6,
        border:       isSelected
          ? '2px solid var(--wt-accent)'
          : '2px solid transparent',
        cursor:       'pointer',
        background:   'var(--wt-surface-raised)',
        padding:      0,
        flexShrink:   0,
        outline:      'none',
        transition:   'border-color 0.15s',
      }}
    >
      {!loaded && (
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'var(--wt-surface-raised)',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon icon="CircleNotch" size={14} style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }} />
        </div>
      )}
      <img
        src={thumb.url}
        alt={gif.title || 'GIF'}
        style={{
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
          display:    'block',
          opacity:    loaded ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
        onLoad={() => setLoaded(true)}
      />
      {isSelected && (
        <div
          style={{
            position:       'absolute',
            top:            4,
            right:          4,
            width:          16,
            height:         16,
            borderRadius:   '50%',
            background:     'var(--wt-accent)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          <Icon icon="Check" size={10} style={{ color: '#fff' }} weight="bold" />
        </div>
      )}
    </button>
  )
}

// ── GIF grid ──────────────────────────────────────────────────────────────────

function GifGrid({
  gifs,
  selectedId,
  onSelect,
}: {
  gifs:       GiphyGif[]
  selectedId: string
  onSelect:   (gif: GiphyGif) => void
}) {
  if (gifs.length === 0) return null

  return (
    <div
      role="list"
      aria-label="GIF results"
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:                 4,
      }}
    >
      {gifs.map((gif) => (
        <div key={gif.id} role="listitem">
          <GifThumbnail
            gif={gif}
            isSelected={gif.id === selectedId}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  )
}

// ── Settings panel ────────────────────────────────────────────────────────────

export function GiphySettings({ widgetId }: WidgetProps) {
  const [settings, set] = useWidgetSettings<GiphyWidgetSettings>(widgetId, DEFAULT_GIPHY_SETTINGS)

  const [query,      setQuery]      = useState('')
  const [gifs,       setGifs]       = useState<GiphyGif[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [tab,        setTab]        = useState<'trending' | 'search'>('trending')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load trending on mount
  useEffect(() => {
    void loadTrending()
  }, [])

  async function loadTrending() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTrending()
      setGifs(res.data)
    } catch {
      setError('Failed to load trending GIFs')
    } finally {
      setLoading(false)
    }
  }

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setTab('trending')
      await loadTrending()
      return
    }
    setTab('search')
    setLoading(true)
    setError(null)
    try {
      const res = await searchGiphy(q.trim())
      setGifs(res.data)
    } catch {
      setError('Search failed — check your connection')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void runSearch(val) }, 400)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleSelect(gif: GiphyGif) {
    const original    = gif.images.original
    const mp4Url      = gif.images.original_mp4?.mp4 ?? gif.images.fixed_height.mp4 ?? ''
    set({
      gifId:    gif.id,
      gifUrl:   original.url,
      gifMp4Url: mp4Url,
      gifTitle: gif.title,
    })
  }

  function handleClear() {
    set({
      gifId:     '',
      gifUrl:    '',
      gifMp4Url: '',
      gifTitle:  '',
    })
  }

  return (
    <FlexCol className="gap-5" fullWidth>

      {/* Search input */}
      <SettingsSection label="Search GIFs">
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position:  'absolute',
              left:      10,
              top:       '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <Icon icon="MagnifyingGlass" size={14} style={{ color: 'var(--wt-text-muted)' }} />
          </div>
          <input
            className="wt-input w-full rounded-lg"
            style={{
              height:     36,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize:   13,
              fontFamily: fontFamily.base,
            }}
            placeholder="Search Giphy…"
            value={query}
            onChange={handleQueryChange}
          />
        </div>
      </SettingsSection>

      {/* Tab label */}
      <div
        style={{
          fontSize:      10,
          fontFamily:    fontFamily.base,
          fontWeight:    '600',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color:         'var(--wt-text-muted)',
        }}
      >
        {tab === 'trending' ? '🔥 Trending' : `Results for "${query}"`}
      </div>

      {/* GIF grid / states */}
      {loading && (
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '20px 0',
            gap:            8,
          }}
        >
          <Icon icon="CircleNotch" size={16} style={{ color: 'var(--wt-text-muted)', opacity: 0.6 }} />
          <span style={{ fontSize: 12, fontFamily: fontFamily.base, color: 'var(--wt-text-muted)' }}>
            Loading…
          </span>
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            fontSize:   12,
            fontFamily: fontFamily.base,
            color:      'var(--wt-text-muted)',
            textAlign:  'center',
            padding:    '12px 0',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && gifs.length === 0 && (
        <div
          style={{
            fontSize:   12,
            fontFamily: fontFamily.base,
            color:      'var(--wt-text-muted)',
            textAlign:  'center',
            padding:    '12px 0',
          }}
        >
          No GIFs found
        </div>
      )}

      {!loading && !error && gifs.length > 0 && (
        <GifGrid
          gifs={gifs}
          selectedId={settings.gifId}
          onSelect={handleSelect}
        />
      )}

      {/* Giphy attribution (required by Giphy API terms) */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            4,
          paddingTop:     4,
        }}
      >
        <span
          style={{
            fontSize:   10,
            fontFamily: fontFamily.base,
            color:      'var(--wt-text-muted)',
            opacity:    0.6,
          }}
        >
          Powered by
        </span>
        <span
          style={{
            fontSize:   10,
            fontFamily: fontFamily.base,
            fontWeight: '700',
            color:      'var(--wt-text-muted)',
            opacity:    0.8,
            letterSpacing: '0.02em',
          }}
        >
          GIPHY
        </span>
      </div>

      {/* Display options */}
      <SettingsSection label="Display">
        <FlexCol className="gap-3">
          <Toggle
            label="Show title"
            value={settings.showTitle}
            onChange={(v) => set({ showTitle: v })}
          />
        </FlexCol>
      </SettingsSection>

      {/* Fit mode */}
      <SettingsSection label="Fit">
        <div style={{ display: 'flex', gap: 6 }}>
          {(['cover', 'contain'] as const).map((fit) => (
            <button
              key={fit}
              onClick={() => set({ objectFit: fit })}
              style={{
                flex:       1,
                height:     32,
                borderRadius: 8,
                fontSize:   12,
                fontFamily: fontFamily.base,
                fontWeight: '500',
                cursor:     'pointer',
                border:     `1px solid ${settings.objectFit === fit ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                background: settings.objectFit === fit
                  ? 'color-mix(in srgb, var(--wt-accent) 15%, var(--wt-border))'
                  : 'var(--wt-surface)',
                color: settings.objectFit === fit ? 'var(--wt-text)' : 'var(--wt-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {fit.charAt(0).toUpperCase() + fit.slice(1)}
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* Clear selection */}
      {settings.gifId && (
        <SettingsSection label="Current GIF">
          <button
            onClick={handleClear}
            style={{
              width:        '100%',
              height:       32,
              borderRadius: 8,
              fontSize:     12,
              fontFamily:   fontFamily.base,
              fontWeight:   '500',
              cursor:       'pointer',
              border:       '1px solid var(--wt-border)',
              background:   'var(--wt-surface)',
              color:        'var(--wt-text-muted)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          6,
            }}
          >
            <Icon icon="X" size={12} style={{ color: 'var(--wt-text-muted)' }} />
            Clear selection
          </button>
        </SettingsSection>
      )}
    </FlexCol>
  )
}
