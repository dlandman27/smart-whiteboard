import type React from 'react'

export interface WidgetProps {
  widgetId: string
}

export interface PluginPreference {
  name:         string
  type:         'text' | 'password'
  title:        string
  description?: string
  required?:    boolean
  placeholder?: string
}

export interface WidgetManifestEntry {
  type:        string
  label:       string
  icon:        string   // Lucide icon name (e.g. "Music")
  iconBg:      string
  iconClass:   string
  keywords:    string[]
  defaultSize: { width: number; height: number }
  scalable?:   boolean
}

export interface PluginManifest {
  id:           string
  name:         string
  version:      string
  author?:      string
  description?: string
  preferences?: PluginPreference[]
  widgets:      WidgetManifestEntry[]
}

export interface PluginModule {
  component:          React.ComponentType<WidgetProps>
  settingsComponent?: React.ComponentType<WidgetProps>
}
