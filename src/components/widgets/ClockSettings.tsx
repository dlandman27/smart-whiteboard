import { SegmentedControl, SettingsSection, Toggle } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'
import { useWidgetSettings } from '@whiteboard/sdk'
import { DEFAULT_CLOCK_SETTINGS, type ClockWidgetSettings } from './ClockWidget'
import type { WidgetProps } from './registry'

const COMMON_TIMEZONES = [
  { label: 'Local',    value: '' },
  { label: 'UTC',      value: 'UTC' },
  { label: 'ET',       value: 'America/New_York' },
  { label: 'CT',       value: 'America/Chicago' },
  { label: 'MT',       value: 'America/Denver' },
  { label: 'PT',       value: 'America/Los_Angeles' },
  { label: 'GMT',      value: 'Europe/London' },
  { label: 'CET',      value: 'Europe/Paris' },
  { label: 'IST',      value: 'Asia/Kolkata' },
  { label: 'JST',      value: 'Asia/Tokyo' },
  { label: 'AEST',     value: 'Australia/Sydney' },
]

export function ClockSettings({ widgetId }: WidgetProps) {
  const [settings, set] = useWidgetSettings<ClockWidgetSettings>(widgetId, DEFAULT_CLOCK_SETTINGS)

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Display">
        <SegmentedControl
          value={settings.display}
          options={[
            { value: 'digital', label: 'Digital' },
            { value: 'analog',  label: 'Analog'  },
          ]}
          onChange={(v) => set({ display: v as ClockWidgetSettings['display'] })}
        />
      </SettingsSection>

      {settings.display === 'digital' && (
        <>
          <SettingsSection label="Format">
            <SegmentedControl
              value={settings.use24h ? '24h' : '12h'}
              options={[
                { value: '12h', label: '12h' },
                { value: '24h', label: '24h' },
              ]}
              onChange={(v) => set({ use24h: v === '24h' })}
            />
          </SettingsSection>

          <SettingsSection label="Font">
            <SegmentedControl
              value={settings.font}
              options={[
                { value: 'thin',  label: 'Sans'  },
                { value: 'mono',  label: 'Mono'  },
                { value: 'serif', label: 'Serif' },
              ]}
              onChange={(v) => set({ font: v as ClockWidgetSettings['font'] })}
            />
          </SettingsSection>
        </>
      )}

      {settings.display === 'analog' && (
        <SettingsSection label="Hour numbers">
          <Toggle
            label="Show 12, 3, 6, 9"
            value={settings.showHourNumbers ?? false}
            onChange={(v) => set({ showHourNumbers: v })}
          />
        </SettingsSection>
      )}

      <SettingsSection label="Show">
        <FlexCol className="gap-3">
          {settings.display === 'digital' && (
            <Toggle
              label="Seconds"
              value={settings.showSeconds}
              onChange={(v) => set({ showSeconds: v })}
            />
          )}
          <Toggle
            label="Date"
            value={settings.showDate}
            onChange={(v) => set({ showDate: v })}
          />
        </FlexCol>
      </SettingsSection>

      <SettingsSection label="Timezone">
        <FlexCol className="gap-2.5">
          {/* Preset quick-picks */}
          <div className="flex flex-wrap gap-1.5">
            {COMMON_TIMEZONES.map(({ label, value }) => {
              const active = (settings.timezone ?? '') === value
              return (
                <button
                  key={label}
                  onClick={() => set({ timezone: value })}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: active ? 'color-mix(in srgb, var(--wt-accent) 15%, var(--wt-border))' : 'var(--wt-surface)',
                    color:      active ? 'var(--wt-text)' : 'var(--wt-text-muted)',
                    border:     `1px solid ${active ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {/* Custom IANA input */}
          <input
            className="wt-input w-full rounded-lg px-3 text-xs"
            style={{ height: 32 }}
            placeholder="Custom timezone, e.g. Asia/Dubai"
            value={settings.timezone ?? ''}
            onChange={(e) => set({ timezone: e.target.value })}
          />
          <Toggle
            label="Show timezone label"
            value={settings.showTimezone ?? false}
            onChange={(v) => set({ showTimezone: v })}
          />
        </FlexCol>
      </SettingsSection>
    </FlexCol>
  )
}
