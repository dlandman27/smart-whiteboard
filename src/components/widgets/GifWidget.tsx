import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Button, Center, FlexCol, FlexRow, Input, SegmentedControl, SettingsSection, Text } from '@whiteboard/ui-kit'

interface GifWidgetSettings {
  url:   string
  query: string
  fit:   'cover' | 'contain'
}

const DEFAULTS: GifWidgetSettings = { url: '', query: '', fit: 'cover' }

export function GifWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<GifWidgetSettings>(widgetId, DEFAULTS)

  if (!settings.url) {
    return (
      <Center fullHeight>
        <FlexCol align="center" gap="sm" className="px-4">
          <Text variant="body" style={{ fontSize: '2rem' }}>🎞️</Text>
          <Text variant="caption" color="muted" align="center">
            Ask Walli: "show me a gif of…"
          </Text>
        </FlexCol>
      </Center>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit' }}>
      <img
        src={settings.url}
        alt={settings.query || 'GIF'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: settings.fit,
          display: 'block',
        }}
      />
    </div>
  )
}

export function GifSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<GifWidgetSettings>(widgetId, DEFAULTS)
  const [searchQuery, setSearchQuery] = useState(settings.query || '')
  const [searching, setSearching]     = useState(false)
  const [error, setError]             = useState('')

  async function search() {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setError('')
    try {
      const res = await fetch(`/api/gifs/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Search failed')
      }
      const data = await res.json()
      update({ url: data.url, query: q })
    } catch (err: any) {
      setError(err.message ?? 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <FlexCol className="gap-5">
      <SettingsSection label="Search GIFs">
        <FlexRow gap="sm">
          <Input
            type="text"
            value={searchQuery}
            placeholder="e.g. excited cat, celebration…"
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search() }}
          />
          <Button size="sm" onClick={search} disabled={searching}>
            {searching ? '…' : 'Search'}
          </Button>
        </FlexRow>
        {error && (
          <Text variant="caption" color="muted" style={{ marginTop: '4px' }}>{error}</Text>
        )}
      </SettingsSection>

      <SettingsSection label="Or paste GIF URL">
        <Input
          type="url"
          value={settings.url}
          placeholder="https://media.tenor.com/..."
          onChange={(e) => update({ url: e.target.value })}
        />
      </SettingsSection>

      <SettingsSection label="Fit">
        <SegmentedControl
          value={settings.fit}
          options={[
            { value: 'cover',   label: 'Crop' },
            { value: 'contain', label: 'Fit'  },
          ]}
          onChange={(v) => update({ fit: v as GifWidgetSettings['fit'] })}
        />
      </SettingsSection>
    </FlexCol>
  )
}
