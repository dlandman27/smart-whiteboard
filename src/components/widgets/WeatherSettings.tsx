import { useWidgetSettings } from '@whiteboard/sdk'
import { SegmentedControl, SettingsSection, Toggle } from '@whiteboard/ui-kit'
import { FlexCol } from '@whiteboard/ui-kit'
import { DEFAULT_WEATHER_SETTINGS, type WeatherWidgetSettings } from './WeatherWidget'
import type { WidgetProps } from './registry'

export function WeatherSettings({ widgetId }: WidgetProps) {
  const [settings, set] = useWidgetSettings<WeatherWidgetSettings>(widgetId, DEFAULT_WEATHER_SETTINGS)

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Temperature">
        <SegmentedControl
          value={settings.unit}
          options={[
            { value: 'fahrenheit', label: '°F' },
            { value: 'celsius',    label: '°C' },
          ]}
          onChange={(v) => set({ unit: v as WeatherWidgetSettings['unit'] })}
        />
      </SettingsSection>

      <SettingsSection label="Wind speed">
        <SegmentedControl
          value={settings.windUnit}
          options={[
            { value: 'mph', label: 'mph'  },
            { value: 'kmh', label: 'km/h' },
            { value: 'ms',  label: 'm/s'  },
          ]}
          onChange={(v) => set({ windUnit: v as WeatherWidgetSettings['windUnit'] })}
        />
      </SettingsSection>

      <SettingsSection label="Location">
        <input
          className="wt-input w-full rounded-lg px-3 text-xs"
          style={{ height: 32 }}
          placeholder="City name, e.g. Tokyo (blank = GPS)"
          value={settings.locationQuery}
          onChange={(e) => set({ locationQuery: e.target.value })}
        />
      </SettingsSection>

      <SettingsSection label="Show">
        <FlexCol className="gap-3">
          <Toggle
            label="Feels like"
            value={settings.showFeelsLike}
            onChange={(v) => set({ showFeelsLike: v })}
          />
          <Toggle
            label="Humidity"
            value={settings.showHumidity}
            onChange={(v) => set({ showHumidity: v })}
          />
          <Toggle
            label="Wind speed"
            value={settings.showWind}
            onChange={(v) => set({ showWind: v })}
          />
        </FlexCol>
      </SettingsSection>
    </FlexCol>
  )
}
