import { SegmentedControl, SettingsSection, Toggle } from '../../ui/web'
import { useWhiteboardStore } from '../../store/whiteboard'
import { DEFAULT_CLOCK_SETTINGS, type ClockWidgetSettings } from './ClockWidget'
import type { WidgetProps } from './registry'

export function ClockSettings({ widgetId }: WidgetProps) {
  const { updateSettings, boards, activeBoardId } = useWhiteboardStore()

  const raw      = boards.find((b) => b.id === activeBoardId)?.widgets.find((w) => w.id === widgetId)?.settings
  const settings: ClockWidgetSettings = { ...DEFAULT_CLOCK_SETTINGS, ...(raw ?? {}) } as ClockWidgetSettings

  function set(patch: Partial<ClockWidgetSettings>) {
    updateSettings(widgetId, patch as Record<string, unknown>)
  }

  return (
    <div className="space-y-5">
      <SettingsSection label="Display">
        <SegmentedControl
          value={settings.display}
          options={[
            { value: 'digital', label: 'Digital' },
            { value: 'analog',  label: 'Analog'  },
          ]}
          onChange={(v) => set({ display: v })}
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
                { value: 'thin',  label: 'Thin'  },
                { value: 'mono',  label: 'Mono'  },
                { value: 'serif', label: 'Serif' },
              ]}
              onChange={(v) => set({ font: v })}
            />
          </SettingsSection>
        </>
      )}

      <SettingsSection label="Show">
        <div className="space-y-3">
          <Toggle
            label="Seconds"
            value={settings.showSeconds}
            onChange={(v) => set({ showSeconds: v })}
          />
          <Toggle
            label="Date"
            value={settings.showDate}
            onChange={(v) => set({ showDate: v })}
          />
        </div>
      </SettingsSection>
    </div>
  )
}
