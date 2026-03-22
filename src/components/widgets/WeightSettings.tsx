import { useWidgetSettings } from '@whiteboard/sdk'
import { Input, SettingsSection } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'
import type { WeightSettings } from './WeightWidget'

const DEFAULTS: WeightSettings = { goalWeight: 170 }

export function WeightSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<WeightSettings>(widgetId, DEFAULTS)

  return (
    <FlexCol className="gap-5">
      <SettingsSection label="Notion Database ID">
        <Input
          type="text"
          placeholder="Paste your database ID…"
          value={settings.databaseId}
          onChange={(e) => update({ databaseId: e.target.value.trim() })}
        />
      </SettingsSection>
      <SettingsSection label="Goal Weight (lbs)">
        <Input
          type="number"
          value={settings.goalWeight}
          onChange={(e) => update({ goalWeight: parseFloat(e.target.value) || 0 })}
        />
      </SettingsSection>
    </FlexCol>
  )
}
