import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol } from '../../../ui/layouts'
import { SettingsSection, SegmentedControl } from '../../../ui/web'
import type { NotionViewSettings, TemplateType } from './types'

const DEFAULTS: NotionViewSettings = {
  databaseId: '',
  template:   'todo-list',
  fieldMap:   {},
  options:    {},
}

const TEMPLATES: { value: TemplateType; label: string }[] = [
  { value: 'todo-list',    label: 'Todo List'    },
  { value: 'kanban',       label: 'Kanban'       },
  { value: 'timeline',     label: 'Timeline'     },
  { value: 'data-table',   label: 'Table'        },
  { value: 'metric-chart', label: 'Chart'        },
  { value: 'habit-grid',   label: 'Habit Grid'   },
  { value: 'stat-cards',   label: 'Stat Cards'   },
]

// ── Field config per template ─────────────────────────────────────────────────

interface FieldDef {
  key:         string
  label:       string
  required?:   boolean
  description?: string
}

interface OptionDef {
  key:          string
  label:        string
  type:         'text' | 'number' | 'toggle' | 'select'
  placeholder?: string
  choices?:     string[]
}

const TEMPLATE_FIELDS: Record<TemplateType, FieldDef[]> = {
  'todo-list': [
    { key: 'title',    label: 'Title field',    required: true  },
    { key: 'status',   label: 'Status field'                    },
    { key: 'priority', label: 'Priority field'                  },
    { key: 'due',      label: 'Due date field'                  },
  ],
  'kanban': [
    { key: 'title',    label: 'Title field',    required: true  },
    { key: 'group',    label: 'Group by field', required: true  },
    { key: 'subtitle', label: 'Subtitle field'                  },
  ],
  'timeline': [
    { key: 'title',    label: 'Title field',    required: true  },
    { key: 'date',     label: 'Date field',     required: true  },
    { key: 'subtitle', label: 'Subtitle field'                  },
    { key: 'status',   label: 'Status field'                    },
  ],
  'data-table': [],  // handled separately (multi-column)
  'metric-chart': [
    { key: 'value',    label: 'Value field',    required: true  },
    { key: 'date',     label: 'Date field',     required: true  },
  ],
  'habit-grid': [
    { key: 'date',     label: 'Date field',     required: true  },
    { key: 'done',     label: 'Done field',     required: true  },
  ],
  'stat-cards': [
    { key: 'value',    label: 'Value field',    required: true  },
  ],
}

const TEMPLATE_OPTIONS: Record<TemplateType, OptionDef[]> = {
  'todo-list': [
    { key: 'statusDone', label: '"Done" status value', type: 'text', placeholder: 'Done' },
  ],
  'kanban':       [],
  'timeline':     [
    { key: 'sort',  label: 'Sort',  type: 'select', choices: ['asc', 'desc'] },
    { key: 'limit', label: 'Limit', type: 'number', placeholder: '50' },
  ],
  'data-table':   [
    { key: 'sortDir', label: 'Sort direction', type: 'select', choices: ['ascending', 'descending'] },
    { key: 'limit',   label: 'Limit',          type: 'number', placeholder: '100' },
  ],
  'metric-chart': [
    { key: 'unit',      label: 'Unit',       type: 'text',   placeholder: 'lbs, kg, …' },
    { key: 'goal',      label: 'Goal value', type: 'number', placeholder: 'optional' },
    { key: 'chartType', label: 'Chart type', type: 'select', choices: ['line', 'bar'] },
  ],
  'habit-grid':   [
    { key: 'weeks', label: 'Weeks to show', type: 'number', placeholder: '8' },
  ],
  'stat-cards':   [
    { key: 'unit', label: 'Unit', type: 'text', placeholder: 'lbs, km, …' },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', fontSize: 12, borderRadius: 8,
  border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
  color: 'var(--wt-text)', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--wt-text-muted)', fontWeight: 500, marginBottom: 4, display: 'block',
}

function PropSelect({
  value, onChange, props, placeholder, required,
}: {
  value: string; onChange: (v: string) => void; props: string[]; placeholder?: string; required?: boolean
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="">{required ? '— select —' : '— none —'}</option>
      {props.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  )
}

// ── Main settings component ───────────────────────────────────────────────────

export function NotionViewSettingsPanel({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<NotionViewSettings>(widgetId, DEFAULTS)
  const [dbProps, setDbProps] = useState<string[]>([])

  // Fetch property names from the database
  useEffect(() => {
    if (!settings.databaseId) return
    fetch(`/api/databases/${settings.databaseId}`)
      .then((r) => r.json())
      .then((db: any) => {
        if (db?.properties) setDbProps(Object.keys(db.properties))
      })
      .catch(() => {})
  }, [settings.databaseId])

  function setField(key: string, value: string) {
    set({ fieldMap: { ...settings.fieldMap, [key]: value } })
  }

  function setOption(key: string, value: any) {
    set({ options: { ...settings.options, [key]: value } })
  }

  function setColumns(value: string) {
    // comma-separated → array
    set({ fieldMap: { ...settings.fieldMap, columns: value.split(',').map((s) => s.trim()).filter(Boolean) } })
  }

  const fields  = TEMPLATE_FIELDS[settings.template]  ?? []
  const optDefs = TEMPLATE_OPTIONS[settings.template] ?? []
  const columns = Array.isArray(settings.fieldMap?.columns) ? settings.fieldMap.columns.join(', ') : ''

  return (
    <FlexCol className="gap-5" fullWidth>
      {/* Database ID */}
      <SettingsSection label="Database ID">
        <input
          style={inputStyle}
          placeholder="Notion database ID"
          value={settings.databaseId}
          onChange={(e) => set({ databaseId: e.target.value })}
        />
        {settings.databaseId && dbProps.length === 0 && (
          <p style={{ fontSize: 10, color: 'var(--wt-text-muted)', marginTop: 4 }}>
            Could not load properties — check the database ID.
          </p>
        )}
      </SettingsSection>

      {/* Title */}
      <SettingsSection label="Widget title (optional)">
        <input
          style={inputStyle}
          placeholder="e.g. My Tasks"
          value={settings.title ?? ''}
          onChange={(e) => set({ title: e.target.value || undefined })}
        />
      </SettingsSection>

      {/* Template picker */}
      <SettingsSection label="Layout">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => set({ template: t.value })}
              style={{
                padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 500,
                background: settings.template === t.value ? 'var(--wt-accent)' : 'var(--wt-surface)',
                color:      settings.template === t.value ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
                transition: 'background 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* Field mappings */}
      {fields.length > 0 && (
        <SettingsSection label="Fields">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((f) => (
              <div key={f.key}>
                <label style={labelStyle}>
                  {f.label}{f.required && <span style={{ color: 'var(--wt-accent)', marginLeft: 2 }}>*</span>}
                </label>
                <PropSelect
                  value={(settings.fieldMap?.[f.key] as string) ?? ''}
                  onChange={(v) => setField(f.key, v)}
                  props={dbProps}
                  required={f.required}
                />
              </div>
            ))}
          </div>
        </SettingsSection>
      )}

      {/* data-table: column list */}
      {settings.template === 'data-table' && (
        <SettingsSection label="Columns (comma-separated)">
          <input
            style={inputStyle}
            placeholder="Name, Status, Due, Priority"
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
          />
          {dbProps.length > 0 && (
            <p style={{ fontSize: 10, color: 'var(--wt-text-muted)', marginTop: 4 }}>
              Available: {dbProps.join(', ')}
            </p>
          )}
        </SettingsSection>
      )}

      {/* Template options */}
      {optDefs.length > 0 && (
        <SettingsSection label="Options">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {optDefs.map((opt) => (
              <div key={opt.key}>
                <label style={labelStyle}>{opt.label}</label>
                {opt.type === 'select' ? (
                  <select
                    value={(settings.options?.[opt.key] as string) ?? ''}
                    onChange={(e) => setOption(opt.key, e.target.value || undefined)}
                    style={inputStyle}
                  >
                    <option value="">— default —</option>
                    {opt.choices!.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : opt.type === 'number' ? (
                  <input
                    type="number"
                    style={inputStyle}
                    placeholder={opt.placeholder}
                    value={(settings.options?.[opt.key] as number) ?? ''}
                    onChange={(e) => setOption(opt.key, e.target.value ? Number(e.target.value) : undefined)}
                  />
                ) : (
                  <input
                    style={inputStyle}
                    placeholder={opt.placeholder}
                    value={(settings.options?.[opt.key] as string) ?? ''}
                    onChange={(e) => setOption(opt.key, e.target.value || undefined)}
                  />
                )}
              </div>
            ))}
          </div>
        </SettingsSection>
      )}
    </FlexCol>
  )
}
