import { useWidgetSettings } from '@whiteboard/sdk'
import { Input, SettingsSection } from '../../ui/web'
import { FlexCol } from '../../ui/layouts'
import { TASKS_DEFAULTS, type TasksWidgetSettings } from './TasksWidget'

export function TasksSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<TasksWidgetSettings>(widgetId, TASKS_DEFAULTS)

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
