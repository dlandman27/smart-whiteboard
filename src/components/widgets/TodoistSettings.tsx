import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { SettingsSection, Toggle, FlexCol } from '@whiteboard/ui-kit'
import { apiFetch } from '../../lib/apiFetch'
import { DEFAULT_TODOIST_SETTINGS, type TodoistSettings as Settings } from './TodoistWidget'

interface Project {
  id:   string
  name: string
}

const FILTER_PRESETS = [
  { label: 'All',          value: '' },
  { label: 'Today',        value: 'today' },
  { label: 'Overdue',      value: 'overdue' },
  { label: 'Next 7 days',  value: '7 days' },
]

export function TodoistSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<Settings>(widgetId, DEFAULT_TODOIST_SETTINGS)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    apiFetch<Project[]>('/api/todoist/projects')
      .then(setProjects)
      .catch(() => {})
  }, [])

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Project">
        <select
          className="wt-input w-full rounded-lg px-3 text-xs"
          style={{ height: 32 }}
          value={settings.projectId ?? ''}
          onChange={(e) => set({ projectId: e.target.value || undefined })}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </SettingsSection>

      <SettingsSection label="Filter">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.value}
              className="px-2.5 py-1 rounded-md text-xs transition-colors"
              style={{
                background: (settings.filter ?? '') === preset.value ? 'var(--wt-accent)' : 'var(--wt-bg-surface)',
                color: (settings.filter ?? '') === preset.value ? '#fff' : 'var(--wt-text-muted)',
                border: '1px solid var(--wt-border)',
              }}
              onClick={() => set({ filter: preset.value || undefined })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection label="Options">
        <FlexCol className="gap-3">
          <Toggle
            label="Show completed tasks"
            value={settings.showCompleted}
            onChange={(v) => set({ showCompleted: v })}
          />
          <Toggle
            label="Show project name"
            value={settings.showProject}
            onChange={(v) => set({ showProject: v })}
          />
        </FlexCol>
      </SettingsSection>
    </FlexCol>
  )
}
