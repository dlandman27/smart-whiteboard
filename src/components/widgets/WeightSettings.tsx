import { useWidgetSettings } from '@whiteboard/sdk'
import { Input, SegmentedControl, SettingsSection } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'
import type { WeightSettings, WeightView } from './WeightWidget'

const DEFAULTS: WeightSettings = {
  databaseId: '',
  goalWeight:  170,
  view:       'both',
  goalStep:    0,
  weeklyGoal:  0,
}

const VIEW_OPTIONS: { value: WeightView; label: string }[] = [
  { value: 'stats', label: 'Stats' },
  { value: 'both',  label: 'Both' },
  { value: 'chart', label: 'Chart' },
]

export function WeightSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<WeightSettings>(widgetId, DEFAULTS)

  return (
    <FlexCol className="gap-5">
      <SettingsSection label="Display">
        <SegmentedControl
          value={settings.view ?? 'both'}
          options={VIEW_OPTIONS}
          onChange={(view) => update({ view })}
        />
      </SettingsSection>

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

      <SettingsSection label="Milestone Step (lbs)" description="Show a mini-goal every N lbs. Set 0 to disable.">
        <Input
          type="number"
          placeholder="e.g. 5"
          value={settings.goalStep ?? 0}
          onChange={(e) => update({ goalStep: parseFloat(e.target.value) || 0 })}
        />
      </SettingsSection>

      <SettingsSection label="Weekly Goal (lbs/week)" description="Target lbs to lose per week. Set 0 to disable.">
        <Input
          type="number"
          placeholder="e.g. 2"
          value={settings.weeklyGoal ?? 0}
          onChange={(e) => update({ weeklyGoal: parseFloat(e.target.value) || 0 })}
        />
      </SettingsSection>
    </FlexCol>
  )
}
