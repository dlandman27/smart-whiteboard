import { useWidgetSettings } from '@whiteboard/sdk'
import { Input, SettingsSection } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'
import { ROUTINES_DEFAULTS, type RoutinesWidgetSettings } from './RoutinesWidget'

export function RoutinesSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<RoutinesWidgetSettings>(widgetId, ROUTINES_DEFAULTS)

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
    </FlexCol>
  )
}
