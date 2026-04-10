import { SegmentedControl, SettingsSection, Icon } from '@whiteboard/ui-kit'
import { FlexCol } from '@whiteboard/ui-kit'
import { useWidgetSettings } from '@whiteboard/sdk'
import { getAllWidgetTypes, getWidgetType } from './registry'
import { DEFAULT_SPLIT_SETTINGS, type SplitWidgetSettings, type PaneConfig } from './SplitWidget'
import type { WidgetProps } from './registry'

// ── Pane widget picker ──────────────────────────────────────────────────────

function PaneSelector({
  label,
  value,
  onChange,
}: {
  label: string
  value: PaneConfig | null
  onChange: (v: PaneConfig | null) => void
}) {
  const allTypes = getAllWidgetTypes().filter((t) => t.typeId !== '@whiteboard/split')

  const selectedType    = value ? getWidgetType(value.type) : null
  const selectedVariant = value?.variantId

  return (
    <SettingsSection label={label}>
      <FlexCol className="gap-2">
        {/* Widget type selector */}
        <select
          className="wt-input w-full rounded-lg px-3 text-xs"
          style={{ height: 32, color: 'var(--wt-text)', background: 'var(--wt-surface)' }}
          value={value?.type ?? ''}
          onChange={(e) => {
            const typeId = e.target.value
            if (!typeId) { onChange(null); return }
            const typeDef = getWidgetType(typeId)
            const firstVariant = typeDef?.variants[0]
            if (firstVariant) {
              onChange({ type: typeId, variantId: firstVariant.variantId })
            }
          }}
        >
          <option value="">None</option>
          {allTypes.map((t) => (
            <option key={t.typeId} value={t.typeId}>{t.label}</option>
          ))}
        </select>

        {/* Variant selector (if multiple variants) */}
        {selectedType && selectedType.variants.length > 1 && (
          <SegmentedControl
            value={selectedVariant ?? selectedType.variants[0].variantId}
            options={selectedType.variants.map((v) => ({ value: v.variantId, label: v.label }))}
            onChange={(variantId) => {
              if (value) onChange({ ...value, variantId })
            }}
          />
        )}

        {/* Preview chip */}
        {selectedType && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}
          >
            <Icon icon={selectedType.Icon} size={14} style={{ color: selectedType.iconColor }} />
            <span className="text-xs" style={{ color: 'var(--wt-text)' }}>
              {selectedType.label}
              {selectedType.variants.length > 1 && selectedVariant
                ? ` — ${selectedType.variants.find((v) => v.variantId === selectedVariant)?.label ?? ''}`
                : ''}
            </span>
          </div>
        )}
      </FlexCol>
    </SettingsSection>
  )
}

// ── Main settings ───────────────────────────────────────────────────────────

export function SplitSettings({ widgetId }: WidgetProps) {
  const [settings, set] = useWidgetSettings<SplitWidgetSettings>(widgetId, DEFAULT_SPLIT_SETTINGS)

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Split direction">
        <SegmentedControl
          value={settings.orientation}
          options={[
            { value: 'horizontal', label: 'Left / Right' },
            { value: 'vertical',   label: 'Top / Bottom' },
          ]}
          onChange={(v) => set({ orientation: v })}
        />
      </SettingsSection>

      <PaneSelector
        label="Pane A (first)"
        value={settings.paneA}
        onChange={(paneA) => set({ paneA })}
      />

      <PaneSelector
        label="Pane B (second)"
        value={settings.paneB}
        onChange={(paneB) => set({ paneB })}
      />
    </FlexCol>
  )
}
