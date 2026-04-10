import type { PluginPreference } from '@whiteboard/sdk'
import type { WidgetConstraints, WidgetShape } from '@whiteboard/ui-kit'

export interface WidgetVariantDef {
  variantId:          string
  label:              string
  description:        string
  shape:              WidgetShape
  scalable?:          boolean
  constraints?:       WidgetConstraints
  preferences?:       PluginPreference[]
  component:          React.ComponentType<{ widgetId: string }>
  settingsComponent?: React.ComponentType<{ widgetId: string }>
}

export interface WidgetTypeDef {
  typeId:       string
  label:        string
  Icon:         string
  iconColor:    string        // single hex color — gradient derived at render
  keywords:     string[]
  description:  string
  variants:     WidgetVariantDef[]
}
