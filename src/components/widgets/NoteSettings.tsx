import { useWhiteboardStore } from '../../store/whiteboard'
import { SegmentedControl, SettingsSection, Text } from '../../ui/web'
import { FlexCol, Grid } from '../../ui/layouts'
import { DEFAULT_NOTE_SETTINGS, type NoteWidgetSettings } from './NoteWidget'
import type { WidgetProps } from './registry'

const NOTE_COLORS: { label: string; value: string }[] = [
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Pink',   value: '#fce7f3' },
  { label: 'Blue',   value: '#dbeafe' },
  { label: 'Green',  value: '#dcfce7' },
  { label: 'Purple', value: '#f3e8ff' },
  { label: 'Orange', value: '#ffedd5' },
  { label: 'Stone',  value: '#f5f5f4' },
  { label: 'White',  value: '#ffffff' },
]

export function NoteSettings({ widgetId }: WidgetProps) {
  const { updateSettings, boards, activeBoardId } = useWhiteboardStore()

  const raw      = boards.find((b) => b.id === activeBoardId)?.widgets.find((w) => w.id === widgetId)?.settings
  const settings: NoteWidgetSettings = { ...DEFAULT_NOTE_SETTINGS, ...(raw ?? {}) } as NoteWidgetSettings

  function set(patch: Partial<NoteWidgetSettings>) {
    updateSettings(widgetId, patch as Record<string, unknown>)
  }

  return (
    <FlexCol className="gap-5">
      <SettingsSection label="Color">
        <Grid cols={4} gap="sm">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => set({ color: c.value })}
              title={c.label}
              className="relative w-full aspect-square rounded-lg border-2 transition-all"
              style={{
                backgroundColor: c.value,
                borderColor: settings.color === c.value ? 'var(--wt-border-active)' : 'var(--wt-border)',
              }}
            >
              {settings.color === c.value && (
                <Text
                  as="span"
                  variant="label"
                  size="small"
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ fontWeight: '700' }}
                >
                  ✓
                </Text>
              )}
            </button>
          ))}
        </Grid>
      </SettingsSection>

      <SettingsSection label="Text Size">
        <SegmentedControl
          value={settings.fontSize}
          options={[
            { value: 'sm', label: 'Small'  },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large'  },
          ]}
          onChange={(v) => set({ fontSize: v })}
        />
      </SettingsSection>

      <SettingsSection label="Font">
        <SegmentedControl
          value={settings.fontFamily}
          options={[
            { value: 'sans',  label: 'Sans'  },
            { value: 'mono',  label: 'Mono'  },
            { value: 'serif', label: 'Serif' },
          ]}
          onChange={(v) => set({ fontFamily: v })}
        />
      </SettingsSection>

      <SettingsSection label="Align">
        <SegmentedControl
          value={settings.align}
          options={[
            { value: 'left',   label: 'Left'   },
            { value: 'center', label: 'Center' },
          ]}
          onChange={(v) => set({ align: v })}
        />
      </SettingsSection>
    </FlexCol>
  )
}
