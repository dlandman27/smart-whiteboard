import { useWidgetSettings } from '@whiteboard/sdk'
import { SettingsSection, Toggle, FlexCol, Text } from '@whiteboard/ui-kit'
import { DEFAULT_ICAL_SETTINGS, type ICalSettings as Settings } from './ICalWidget'

const HELP_PRESETS = [
  {
    name: 'Outlook',
    hint: 'Go to Outlook.com \u2192 Settings \u2192 Calendar \u2192 Shared calendars \u2192 Publish a calendar \u2192 Copy the ICS link',
  },
  {
    name: 'Apple iCloud',
    hint: 'Go to iCloud.com \u2192 Calendar \u2192 Click the share icon on a calendar \u2192 Check "Public Calendar" \u2192 Copy the URL',
  },
  {
    name: 'Fastmail',
    hint: 'Go to Fastmail \u2192 Settings \u2192 Calendars \u2192 Click a calendar \u2192 Copy the ICS feed URL',
  },
  {
    name: 'Google Calendar',
    hint: 'Go to Google Calendar \u2192 Settings \u2192 Select a calendar \u2192 "Secret address in iCal format" \u2192 Copy the URL',
  },
]

export function ICalSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<Settings>(widgetId, DEFAULT_ICAL_SETTINGS)

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Calendar feed URL">
        <input
          className="wt-input w-full rounded-lg px-3 text-xs"
          style={{ height: 32 }}
          placeholder="https://example.com/calendar.ics"
          value={settings.feedUrl}
          onChange={(e) => set({ feedUrl: e.target.value })}
        />
      </SettingsSection>

      <SettingsSection label="How to find your feed URL">
        <FlexCol className="gap-2">
          {HELP_PRESETS.map((p) => (
            <div
              key={p.name}
              className="rounded-lg px-3 py-2"
              style={{ background: 'var(--wt-bg-surface)', border: '1px solid var(--wt-border)' }}
            >
              <Text variant="label" size="small" style={{ marginBottom: 2 }}>{p.name}</Text>
              <Text variant="body" size="small" color="muted" style={{ fontSize: 11, lineHeight: '1.4' }}>
                {p.hint}
              </Text>
            </div>
          ))}
        </FlexCol>
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

      <SettingsSection label="Days ahead">
        <div className="flex items-center gap-3 w-full">
          <input
            type="range"
            min={1}
            max={30}
            value={settings.days}
            onChange={(e) => set({ days: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-xs tabular-nums" style={{ color: 'var(--wt-text-muted)', minWidth: 20, textAlign: 'right' }}>
            {settings.days}
          </span>
        </div>
      </SettingsSection>

      <SettingsSection label="Options">
        <FlexCol className="gap-3">
          <Toggle
            label="Show location"
            value={settings.showLocation}
            onChange={(v) => set({ showLocation: v })}
          />
          <Toggle
            label="Show all-day events"
            value={settings.showAllDay}
            onChange={(v) => set({ showAllDay: v })}
          />
        </FlexCol>
      </SettingsSection>
    </FlexCol>
  )
}
