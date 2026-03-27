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
  /** Namespaced widget type, e.g. "@yourname/my-widget" */
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
  /** Namespaced plugin id, e.g. "@yourname/my-widget". Must be unique. */
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
