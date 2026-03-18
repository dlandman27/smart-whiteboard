import { useWidgetSettings } from '@whiteboard/sdk'
import { Checkbox, Input, SettingsSection } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'
import { DEFAULT_COUNTDOWN_SETTINGS, type CountdownSettings } from './CountdownWidget'

export function CountdownSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<CountdownSettings>(widgetId, DEFAULT_COUNTDOWN_SETTINGS)

  return (
    <FlexCol className="gap-5">
      <SettingsSection label="Label">
        <Input
          type="text"
          value={settings.title}
          placeholder="e.g. Vacation, Birthday…"
          onChange={(e) => update({ title: e.target.value })}
        />
      </SettingsSection>

      <SettingsSection label="Target Date">
        <Input
          type="date"
          value={settings.targetDate}
          onChange={(e) => update({ targetDate: e.target.value })}
        />
      </SettingsSection>

      <SettingsSection label="Options">
        <Checkbox
          label="Show live countdown below days"
          checked={settings.showTime}
          onChange={(v) => update({ showTime: v })}
        />
      </SettingsSection>
    </FlexCol>
  )
}
