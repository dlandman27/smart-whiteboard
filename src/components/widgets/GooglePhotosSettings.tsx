import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { SettingsSection, Toggle, SegmentedControl, FlexCol } from '@whiteboard/ui-kit'
import type { GooglePhotosSettings as Settings } from './GooglePhotosWidget'

const DEFAULT_SETTINGS: Settings = {
  interval:    30,
  fitMode:     'cover',
  showCounter: false,
}

interface Album { id: string; title: string; mediaItemsCount: string }

export function GooglePhotosSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<Settings>(widgetId, DEFAULT_SETTINGS)
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gphotos/albums')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setAlbums(data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Album">
        <select
          className="wt-input w-full rounded-lg px-3 text-xs"
          style={{ height: 32, background: 'var(--wt-bg-surface)', color: 'var(--wt-text)', border: '1px solid var(--wt-border)' }}
          value={settings.albumId ?? ''}
          onChange={(e) => set({ albumId: e.target.value || undefined })}
        >
          <option value="">{loading ? 'Loading albums…' : 'All recent photos'}</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} ({a.mediaItemsCount})
            </option>
          ))}
        </select>
      </SettingsSection>

      <SettingsSection label="Transition interval">
        <div className="flex items-center gap-3 w-full">
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={settings.interval}
            onChange={(e) => set({ interval: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-xs tabular-nums" style={{ color: 'var(--wt-text-muted)', minWidth: 32, textAlign: 'right' }}>
            {settings.interval}s
          </span>
        </div>
      </SettingsSection>

      <SettingsSection label="Photo fit">
        <SegmentedControl
          value={settings.fitMode}
          options={[
            { value: 'cover',   label: 'Fill' },
            { value: 'contain', label: 'Fit' },
          ]}
          onChange={(v) => set({ fitMode: v as Settings['fitMode'] })}
        />
      </SettingsSection>

      <SettingsSection label="Display">
        <Toggle
          label="Show photo counter"
          value={settings.showCounter}
          onChange={(v) => set({ showCounter: v })}
        />
      </SettingsSection>
    </FlexCol>
  )
}
