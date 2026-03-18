import { useWidgetSettings } from '@whiteboard/sdk'
import { Checkbox, SegmentedControl, SettingsSection } from '../../ui/web'
import { DEFAULT_QUOTE_SETTINGS, type QuoteSettings } from './QuoteWidget'

export function QuoteSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<QuoteSettings>(widgetId, DEFAULT_QUOTE_SETTINGS)

  return (
    <div className="space-y-5">
      <SettingsSection label="Text Size">
        <SegmentedControl
          value={settings.fontSize}
          options={[
            { value: 'sm', label: 'Small'  },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large'  },
          ]}
          onChange={(v) => update({ fontSize: v as QuoteSettings['fontSize'] })}
        />
      </SettingsSection>

      <SettingsSection label="Align">
        <SegmentedControl
          value={settings.align}
          options={[
            { value: 'left',   label: 'Left'   },
            { value: 'center', label: 'Center' },
          ]}
          onChange={(v) => update({ align: v as QuoteSettings['align'] })}
        />
      </SettingsSection>

      <SettingsSection label="Options">
        <Checkbox
          label='Show "new quote" button'
          checked={settings.showRefresh}
          onChange={(v) => update({ showRefresh: v })}
        />
      </SettingsSection>
    </div>
  )
}
