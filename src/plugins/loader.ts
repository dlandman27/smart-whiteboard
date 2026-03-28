import type { StaticWidgetDef } from '../components/widgets/registry'
import type { PluginManifest, PluginModule } from '@whiteboard/sdk'

const manifestGlobs = import.meta.glob('../../plugins/*/manifest.json', { eager: true })
const moduleGlobs   = import.meta.glob('../../plugins/*/index.tsx',     { eager: true })

export function loadPluginDefs(): StaticWidgetDef[] {
  const defs: StaticWidgetDef[] = []

  for (const [manifestPath, manifestMod] of Object.entries(manifestGlobs)) {
    const manifest = (manifestMod as { default: PluginManifest }).default
    const pluginKey = manifestPath
      .replace('../../plugins/', '')
      .replace('/manifest.json', '')
    const modulePath = `../../plugins/${pluginKey}/index.tsx`
    const pluginMod = moduleGlobs[modulePath] as PluginModule | undefined

    if (!pluginMod?.component) continue

    for (const entry of manifest.widgets) {
      defs.push({
        type:              entry.type,
        label:             entry.label,
        Icon:              entry.icon,
        iconBg:            entry.iconBg,
        iconClass:         entry.iconClass,
        keywords:          entry.keywords,
        defaultSize:       entry.defaultSize,
        scalable:          entry.scalable,
        preferences:       manifest.preferences,
        component:         pluginMod.component,
        settingsComponent: pluginMod.settingsComponent,
      })
    }
  }

  return defs
}
