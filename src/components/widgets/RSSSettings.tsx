import { useWidgetSettings } from '@whiteboard/sdk'
import { SettingsSection, Toggle, FlexCol } from '@whiteboard/ui-kit'
import { DEFAULT_RSS_SETTINGS, type RSSSettings as Settings } from './RSSWidget'

const PRESETS = [
  { name: 'Hacker News',  url: 'https://hnrss.org/frontpage' },
  { name: 'BBC News',     url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'TechCrunch',   url: 'https://techcrunch.com/feed/' },
  { name: 'ESPN',          url: 'https://www.espn.com/espn/rss/news' },
  { name: 'Reuters',       url: 'https://feeds.reuters.com/reuters/topNews' },
]

export function RSSSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<Settings>(widgetId, DEFAULT_RSS_SETTINGS)

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Feed URL">
        <input
          className="wt-input w-full rounded-lg px-3 text-xs"
          style={{ height: 32 }}
          placeholder="https://example.com/feed.xml"
          value={settings.feedUrl}
          onChange={(e) => set({ feedUrl: e.target.value })}
        />
      </SettingsSection>

      <SettingsSection label="Quick add">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              className="px-2.5 py-1 rounded-md text-xs transition-colors"
              style={{
                background: settings.feedUrl === p.url ? 'var(--wt-accent)' : 'var(--wt-bg-surface)',
                color: settings.feedUrl === p.url ? '#fff' : 'var(--wt-text-muted)',
                border: '1px solid var(--wt-border)',
              }}
              onClick={() => set({ feedUrl: p.url, feedName: p.name })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection label="Display name (optional)">
        <input
          className="wt-input w-full rounded-lg px-3 text-xs"
          style={{ height: 32 }}
          placeholder="Custom name"
          value={settings.feedName ?? ''}
          onChange={(e) => set({ feedName: e.target.value })}
        />
      </SettingsSection>

      <SettingsSection label="Items to show">
        <div className="flex items-center gap-3 w-full">
          <input
            type="range"
            min={3}
            max={20}
            value={settings.limit}
            onChange={(e) => set({ limit: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-xs tabular-nums" style={{ color: 'var(--wt-text-muted)', minWidth: 20, textAlign: 'right' }}>
            {settings.limit}
          </span>
        </div>
      </SettingsSection>

      <SettingsSection label="Options">
        <FlexCol className="gap-3">
          <Toggle
            label="Show thumbnails"
            value={settings.showThumbnails}
            onChange={(v) => set({ showThumbnails: v })}
          />
          <Toggle
            label="Auto-scroll headlines"
            value={settings.autoScroll}
            onChange={(v) => set({ autoScroll: v })}
          />
        </FlexCol>
      </SettingsSection>
    </FlexCol>
  )
}
