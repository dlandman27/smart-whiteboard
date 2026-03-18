import { useWidgetSettings } from '@whiteboard/sdk'
import { Input, SettingsSection } from '../../ui/web'
import type { WeightSettings } from './WeightWidget'

const DEFAULTS: WeightSettings = { goalWeight: 170 }

export function WeightSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<WeightSettings>(widgetId, DEFAULTS)

  return (
    <div className="space-y-5">
      <SettingsSection label="Goal Weight (lbs)">
        <Input
          type="number"
          value={settings.goalWeight}
          onChange={(e) => update({ goalWeight: parseFloat(e.target.value) || 0 })}
        />
      </SettingsSection>
    </div>
  )
}
