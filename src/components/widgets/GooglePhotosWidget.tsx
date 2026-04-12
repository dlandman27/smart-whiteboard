import { useEffect, useRef, useState, useCallback } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, Center, Text, Icon } from '@whiteboard/ui-kit'

export interface GooglePhotosSettings {
  albumId?:    string
  interval:    number   // seconds between transitions
  fitMode:     'cover' | 'contain'
  showCounter: boolean
}

const DEFAULT_SETTINGS: GooglePhotosSettings = {
  interval:    30,
  fitMode:     'cover',
  showCounter: false,
}

interface PhotoItem {
  id:        string
  baseUrl:   string
  width:     number
  height:    number
  description: string
}

async function api(path: string) {
  const res = await fetch(`/api/gphotos${path}`)
  return res.ok ? res.json() : null
}

// ── Widget ───────────────────────────────────────────────────────────────────

export function GooglePhotosWidget({ widgetId }: { widgetId: string }) {
  return (
    <Container style={{ background: '#000', borderRadius: 'inherit', overflow: 'hidden', position: 'relative' }}>
      <PhotoContent widgetId={widgetId} />
    </Container>
  )
}

function PhotoContent({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<GooglePhotosSettings>(widgetId, DEFAULT_SETTINGS)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [photos, setPhotos]       = useState<PhotoItem[]>([])
  const [index, setIndex]         = useState(0)
  const [fade, setFade]           = useState(true)
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check connection
  useEffect(() => {
    api('/status').then((d) => setConnected(d?.connected ?? false))
  }, [])

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '50' })
    if (settings.albumId) params.set('albumId', settings.albumId)
    const data = await api(`/photos?${params}`)
    if (data?.items?.length) setPhotos(data.items)
  }, [settings.albumId])

  useEffect(() => {
    if (!connected) return
    fetchPhotos()
    // Refresh URLs every 45 minutes (they expire after ~60 min)
    refreshTimer.current = setInterval(fetchPhotos, 45 * 60_000)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [connected, fetchPhotos])

  // Slideshow rotation
  useEffect(() => {
    if (photos.length <= 1) return
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % photos.length)
        setFade(true)
      }, 600)
    }, settings.interval * 1000)
    return () => clearInterval(id)
  }, [photos.length, settings.interval])

  // Not connected
  if (connected === null) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading…</Text>
      </Center>
    )
  }

  if (!connected) {
    return (
      <Center fullHeight className="px-6">
        <div className="text-center">
          <Icon icon="Image" size={32} style={{ marginBottom: 8, color: 'var(--wt-text-muted)' }} />
          <Text variant="body" size="small" color="muted" align="center">
            Connect your Google account to display photos
          </Text>
          <Text variant="caption" size="small" color="muted" align="center" style={{ marginTop: 4, opacity: 0.6 }}>
            Go to Connectors → Google
          </Text>
        </div>
      </Center>
    )
  }

  if (!photos.length) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading photos…</Text>
      </Center>
    )
  }

  const photo = photos[index]
  const imgUrl = `${photo.baseUrl}=w1920-h1080`

  return (
    <div className="absolute inset-0">
      <img
        key={photo.id}
        src={imgUrl}
        alt={photo.description}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: settings.fitMode,
          transition: 'opacity 0.6s ease-in-out',
          opacity: fade ? 1 : 0,
        }}
      />

      {settings.showCounter && photos.length > 1 && (
        <div
          className="absolute bottom-2 right-3 px-2 py-0.5 rounded-full text-xs"
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 11,
            backdropFilter: 'blur(4px)',
          }}
        >
          {index + 1}/{photos.length}
        </div>
      )}
    </div>
  )
}
